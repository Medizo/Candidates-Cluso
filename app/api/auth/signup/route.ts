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
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Phone must be at least 10 digits."),
  password: z.string().min(6, "Password must be at least 6 characters."),
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
    const firstError = parsed.error.issues[0]?.message || "Invalid input.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { name, email: rawEmail, phone, password } = parsed.data;
  const email = rawEmail.toLowerCase().trim();
  const clientIp = getClientIp(req);

  // --- Rate limiting (reuse OTP limits) ---
  const emailLimit = checkRateLimit(
    `signup:email:${email}`,
    OTP_RATE_LIMITS.PER_EMAIL_MAX,
    OTP_RATE_LIMITS.WINDOW_MS,
  );
  if (!emailLimit.allowed) {
    const retryMinutes = Math.ceil(emailLimit.retryAfterMs / 60_000);
    return NextResponse.json(
      { error: `Too many signup attempts. Please try again in ${retryMinutes} minute(s).` },
      { status: 429 },
    );
  }

  const ipLimit = checkRateLimit(
    `signup:ip:${clientIp}`,
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
    console.error("[signup] Missing MONGODB_URI");
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }

  try {
    await connectMongo();

    // Check if a user with this email already exists
    const existingUser = await User.findOne({ email })
      .select("_id")
      .lean();

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please login instead." },
        { status: 409 },
      );
    }

    // Delete any existing signup OTP tokens for this email
    await OtpToken.deleteMany({ email, signupData: { $exists: true } });

    // Hash the password before storing in the OTP token
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate cryptographically secure 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));

    // Hash the OTP before storing
    const otpHash = await bcrypt.hash(otp, 10);

    // Store OTP with pending signup data
    await OtpToken.create({
      email,
      otpHash,
      attempts: 0,
      signupData: {
        name: name.trim(),
        phone: phone.trim(),
        passwordHash,
      },
    });

    // Send the OTP email
    const result = await sendOtpEmail(email, otp);

    if (!result.sent) {
      console.error("[signup] Email delivery failed:", result.reason);
      // Clean up on email failure so user can retry
      await OtpToken.deleteMany({ email, signupData: { $exists: true } });
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Verification code sent to your email.",
    });
  } catch (error) {
    console.error("[signup] Error:", error);
    return NextResponse.json(
      { error: "Service temporarily unavailable. Please try again." },
      { status: 500 },
    );
  }
}
