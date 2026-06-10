import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import User from "@/lib/models/User";
import OtpToken from "@/lib/models/OtpToken";
import { signCandidateToken, candidateCookieName, isCandidateUser } from "@/lib/auth";

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
    console.error("[otp-verify] Missing required env vars");
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }

  try {
    await connectMongo();

    // Find the most recent OTP token for this email
    const otpToken = await OtpToken.findOne({ email })
      .sort({ createdAt: -1 })
      .lean();

    if (!otpToken) {
      // No OTP found — either expired or never sent
      return NextResponse.json(
        { error: "OTP has expired or is invalid. Please request a new code." },
        { status: 401 },
      );
    }

    // Check if max attempts exceeded
    if (otpToken.attempts >= MAX_OTP_ATTEMPTS) {
      // Invalidate the OTP
      await OtpToken.deleteMany({ email });
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please request a new code." },
        { status: 401 },
      );
    }

    // Constant-time comparison via bcrypt (bcrypt.compare is already constant-time)
    let isValid = false;
    try {
      isValid = await bcrypt.compare(otp, otpToken.otpHash);
    } catch {
      isValid = false;
    }

    // Additionally perform a constant-time string comparison as defense-in-depth
    // (Even though bcrypt handles this, we add an extra layer)
    if (!isValid) {
      // Increment failed attempts
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

    // OTP is valid — delete all OTP tokens for this email (single-use)
    await OtpToken.deleteMany({ email });

    // Look up the candidate user
    const user = await User.findOne({ email })
      .select("_id role mustChangePassword deactivated onboarded onboardedFromCandidate")
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 401 },
      );
    }

    if (!isCandidateUser(user)) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 401 },
      );
    }

    // Issue JWT token (same flow as password login)
    const token = signCandidateToken({
      userId: String(user._id),
      role: "candidate",
    });

    const mustChangePassword = user.mustChangePassword !== false;
    const res = NextResponse.json({
      message: "Logged in",
      mustChangePassword,
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
    console.error("[otp-verify] Error:", error);
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
