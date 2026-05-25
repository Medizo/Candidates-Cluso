import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import User from "@/lib/models/User";
import OtpToken from "@/lib/models/OtpToken";
import { getCandidateAuthFromRequest } from "@/lib/auth";

const MAX_OTP_ATTEMPTS = 5;

const schema = z.object({
  otp: z.string().length(6).regex(/^\d{6}$/),
  newPassword: z.string().min(6),
});

export async function POST(req: NextRequest) {
  // User must be authenticated (logged in)
  const auth = await getCandidateAuthFromRequest(req);
  if (!auth || auth.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input. Please enter a valid 6-digit OTP and a password of at least 6 characters." },
      { status: 400 },
    );
  }

  await connectMongo();

  // Get the user's email
  const user = await User.findById(auth.userId);
  if (!user || user.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = user.email.toLowerCase();

  // Find the most recent OTP token for this email
  const otpToken = await OtpToken.findOne({ email })
    .sort({ createdAt: -1 })
    .lean();

  if (!otpToken) {
    return NextResponse.json(
      { error: "OTP has expired or is invalid. Please request a new code." },
      { status: 401 },
    );
  }

  // Check if max attempts exceeded
  if (otpToken.attempts >= MAX_OTP_ATTEMPTS) {
    await OtpToken.deleteMany({ email });
    return NextResponse.json(
      { error: "Too many incorrect attempts. Please request a new code." },
      { status: 401 },
    );
  }

  // Verify the OTP
  let isValid = false;
  try {
    isValid = await bcrypt.compare(parsed.data.otp, otpToken.otpHash);
  } catch {
    isValid = false;
  }

  if (!isValid) {
    await OtpToken.updateOne(
      { _id: otpToken._id },
      { $inc: { attempts: 1 } },
    );

    const remainingAttempts = MAX_OTP_ATTEMPTS - (otpToken.attempts + 1);
    const msg =
      remainingAttempts > 0
        ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
        : "Too many incorrect attempts. Please request a new code.";

    if (remainingAttempts <= 0) {
      await OtpToken.deleteMany({ email });
    }

    return NextResponse.json({ error: msg }, { status: 401 });
  }

  // OTP is valid — delete all OTP tokens for this email
  await OtpToken.deleteMany({ email });

  // Update the password
  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  user.mustChangePassword = false;
  await user.save();

  return NextResponse.json({ message: "Password changed successfully." });
}
