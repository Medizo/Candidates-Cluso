import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * GET /api/digilocker/authorize
 *
 * Builds the DigiLocker OAuth2 authorization URL with PKCE,
 * sets CSRF state + code_verifier + nonce cookies,
 * and redirects the user to DigiLocker consent screen.
 */
export async function GET() {
  const clientId = process.env.DIGILOCKER_CLIENT_ID ?? "";
  const redirectUri = process.env.DIGILOCKER_REDIRECT_URI ?? "";
  const baseUrl = process.env.DIGILOCKER_BASE_URL ?? "https://digilocker.meripehchaan.gov.in";

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "DigiLocker is not configured. Please set DIGILOCKER_CLIENT_ID and DIGILOCKER_REDIRECT_URI." },
      { status: 500 },
    );
  }

  // Generate CSRF state, nonce, and PKCE code_verifier
  const state = crypto.randomBytes(16).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  // DigiLocker only supports "openid" scope — user details come from the id_token JWT
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state: state,
    scope: "openid",
    nonce: nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `${baseUrl}/public/oauth2/1/authorize?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600, // 10 minutes
    path: "/",
  };

  // Store state, code_verifier, and nonce in cookies for the callback
  response.cookies.set("digilocker_state", state, cookieOptions);
  response.cookies.set("digilocker_code_verifier", codeVerifier, cookieOptions);
  response.cookies.set("digilocker_nonce", nonce, cookieOptions);

  return response;
}
