import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import User from "@/lib/models/User";
import OtpToken from "@/lib/models/OtpToken";
import { signCandidateToken, candidateCookieName } from "@/lib/auth";

const MAX_OTP_ATTEMPTS = 5;

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6).regex(/^\d{6}$/),
});

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input. Please enter a valid 6-digit code." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const otp = parsed.data.otp;

  const hasMongoUri = Boolean(process.env.MONGODB_URI?.trim());
  const hasJwtSecret = Boolean(process.env.JWT_SECRET?.trim());
  if (!hasMongoUri || !hasJwtSecret) {
    console.error("[signup-verify] Missing required env vars");
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }

  try {
    await connectMongo();

    // Find the signup OTP token (must have signupData)
    const otpToken = await OtpToken.findOne({
      email,
      signupData: { $exists: true, $ne: null },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!otpToken) {
      return NextResponse.json(
        { error: "OTP has expired or is invalid. Please sign up again." },
        { status: 401 },
      );
    }

    // Check if max attempts exceeded
    if (otpToken.attempts >= MAX_OTP_ATTEMPTS) {
      await OtpToken.deleteMany({ email, signupData: { $exists: true } });
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please sign up again." },
        { status: 401 },
      );
    }

    // Verify OTP
    let isValid = false;
    try {
      isValid = await bcrypt.compare(otp, otpToken.otpHash);
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
          : "Too many incorrect attempts. Please sign up again.";

      if (remainingAttempts <= 0) {
        await OtpToken.deleteMany({ email, signupData: { $exists: true } });
      }

      return NextResponse.json({ error: msg }, { status: 401 });
    }

    // OTP is valid — extract signup data
    const signupData = otpToken.signupData;
    if (!signupData || !signupData.name || !signupData.passwordHash) {
      await OtpToken.deleteMany({ email, signupData: { $exists: true } });
      return NextResponse.json(
        { error: "Registration data is missing. Please sign up again." },
        { status: 400 },
      );
    }

    // Double-check no user was created in the meantime
    const existingUser = await User.findOne({ email }).select("_id").lean();
    if (existingUser) {
      await OtpToken.deleteMany({ email, signupData: { $exists: true } });
      return NextResponse.json(
        { error: "An account with this email already exists. Please login instead." },
        { status: 409 },
      );
    }

    // Create the candidate user
    const newUser = await User.create({
      name: signupData.name,
      email,
      phone: signupData.phone || "",
      passwordHash: signupData.passwordHash,
      role: "candidate",
      mustChangePassword: false,
      selfRegistered: true,
    });

    // Clean up all OTP tokens for this email
    await OtpToken.deleteMany({ email });

    // Issue JWT token
    const token = signCandidateToken({
      userId: String(newUser._id),
      role: "candidate",
    });

    const res = NextResponse.json({
      message: "Account created successfully!",
      mustChangePassword: false,
    });

    res.cookies.set(candidateCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    console.error("[signup-verify] Error:", error);
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
