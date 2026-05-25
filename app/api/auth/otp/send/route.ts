import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import User from "@/lib/models/User";
import OtpToken from "@/lib/models/OtpToken";
import { sendOtpEmail } from "@/lib/otpMail";
import { checkRateLimit, OTP_RATE_LIMITS } from "@/lib/rateLimit";

const schema = z.object({
  email: z.string().email(),
});

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const clientIp = getClientIp(req);

  // --- Rate limiting ---
  const emailLimit = checkRateLimit(
    `otp:email:${email}`,
    OTP_RATE_LIMITS.PER_EMAIL_MAX,
    OTP_RATE_LIMITS.WINDOW_MS,
  );
  if (!emailLimit.allowed) {
    const retryMinutes = Math.ceil(emailLimit.retryAfterMs / 60_000);
    return NextResponse.json(
      { error: `Too many OTP requests. Please try again in ${retryMinutes} minute(s).` },
      { status: 429 },
    );
  }

  const ipLimit = checkRateLimit(
    `otp:ip:${clientIp}`,
    OTP_RATE_LIMITS.PER_IP_MAX,
    OTP_RATE_LIMITS.WINDOW_MS,
  );
  if (!ipLimit.allowed) {
    const retryMinutes = Math.ceil(ipLimit.retryAfterMs / 60_000);
    return NextResponse.json(
      { error: `Too many requests from this network. Please try again in ${retryMinutes} minute(s).` },
      { status: 429 },
    );
  }

  // --- Check required env vars ---
  const hasMongoUri = Boolean(process.env.MONGODB_URI?.trim());
  if (!hasMongoUri) {
    console.error("[otp-send] Missing MONGODB_URI");
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }

  try {
    await connectMongo();

    // Check if the candidate account exists
    const user = await User.findOne({ email })
      .select("_id role")
      .lean();

    // IMPORTANT: Always return success to prevent email enumeration.
    // If the user doesn't exist or isn't a candidate, we still return
    // the same response but simply don't send the email.
    if (!user || user.role !== "candidate") {
      // Simulate a small delay to prevent timing-based enumeration
      await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));
      return NextResponse.json({
        message: "If an account exists with this email, an OTP has been sent.",
      });
    }

    // Delete any existing OTP tokens for this email (invalidate old OTPs)
    await OtpToken.deleteMany({ email });

    // Generate cryptographically secure 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));

    // Hash the OTP before storing (never store plain text)
    const otpHash = await bcrypt.hash(otp, 10);

    // Store the hashed OTP
    await OtpToken.create({
      email,
      otpHash,
      attempts: 0,
    });

    // Send the OTP email
    const result = await sendOtpEmail(email, otp);

    if (!result.sent) {
      console.error("[otp-send] Email delivery failed:", result.reason);
      // Still return success to prevent information leakage
    }

    return NextResponse.json({
      message: "If an account exists with this email, an OTP has been sent.",
    });
  } catch (error) {
    console.error("[otp-send] Error:", error);
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
