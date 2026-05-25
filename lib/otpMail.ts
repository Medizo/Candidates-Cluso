import nodemailer from "nodemailer";
import { sendMsGraphEmail } from "./graphMail";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type OtpMailResult = {
  sent: boolean;
  reason?: string;
};

export async function sendOtpEmail(
  recipientEmail: string,
  otp: string,
): Promise<OtpMailResult> {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

  const hasSmtp = smtpHost && smtpUser && smtpPass && !Number.isNaN(smtpPort);
  const hasMsGraph = Boolean(process.env.MS_GRAPH_TENANT_ID?.trim());

  if (!hasSmtp && !hasMsGraph) {
    return {
      sent: false,
      reason: "No email provider is configured (SMTP or MS Graph).",
    };
  }

  const safeEmail = escapeHtml(recipientEmail);
  const safeOtp = escapeHtml(otp);

  const subject = "Your Cluso Login Verification Code";

  const text = [
    "Cluso Infolink — Login Verification Code",
    "",
    `Your one-time verification code is: ${otp}`,
    "",
    "This code will expire in 5 minutes.",
    "Do not share this code with anyone.",
    "",
    "If you did not request this code, please ignore this email.",
    "Your account is safe — no action is needed.",
    "",
    "— Cluso Infolink Team",
  ].join("\n");

  const html = `
    <div style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a; line-height: 1.6;">
      <div style="background: linear-gradient(135deg, #3B82F6 0%, #10B981 100%); padding: 32px 24px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; letter-spacing: -0.3px;">
          🔐 Login Verification Code
        </h1>
      </div>

      <div style="background: #ffffff; padding: 32px 24px; border: 1px solid #e2e8f0; border-top: none;">
        <p style="margin: 0 0 8px 0; font-size: 15px; color: #64748b;">
          Hello,
        </p>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155;">
          You requested a one-time verification code to log in to your <strong>Cluso Candidate Portal</strong>.
        </p>

        <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; font-weight: 700; color: #94a3b8; letter-spacing: 1.5px;">
            Your Code
          </p>
          <p style="margin: 0; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e293b; font-family: 'Consolas', 'Courier New', monospace;">
            ${safeOtp}
          </p>
        </div>

        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 0 0 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">
            ⏱ This code expires in <strong>5 minutes</strong>.
          </p>
        </div>

        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 0 0 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #991b1b; font-weight: 500;">
            🚫 Never share this code with anyone. Cluso team will never ask for your OTP.
          </p>
        </div>

        <p style="margin: 0; font-size: 13px; color: #94a3b8;">
          If you did not request this code, please ignore this email. Your account is safe.
        </p>
      </div>

      <div style="background: #f8fafc; padding: 16px 24px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          Sent by <strong>Cluso Infolink</strong> — Secure Verification Network
        </p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #cbd5e1;">
          Email: ${safeEmail}
        </p>
      </div>
    </div>
  `;

  try {
    // Prefer MS Graph if configured
    if (hasMsGraph) {
      return await sendMsGraphEmail(recipientEmail, subject, html, text);
    }

    // Otherwise use SMTP
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const fromAddress =
      process.env.OTP_MAIL_FROM?.trim() ||
      process.env.VERIFICATION_MAIL_FROM?.trim() ||
      `Cluso Infolink <indiaops@cluso.in>`;

    await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject,
      text,
      html,
    });

    return { sent: true };
  } catch (error) {
    console.error("[otp-mail] Failed to send OTP email", error);
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}
