import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * GET /api/digilocker/authorize
 *
 * Builds the DigiLocker OAuth2 authorization URL with PKCE,
 * sets CSRF state + code_verifier + nonce cookies,
 * and redirects the user to DigiLocker consent screen.
 *
 * NOTE: Instead of directly redirecting (which can lose cookies on some
 * edge/CDN platforms when redirecting cross-domain), we return an HTML
 * interstitial that ensures cookies are stored before the browser navigates
 * to DigiLocker.
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

  // Return an HTML interstitial page instead of a direct redirect.
  // This ensures cookies are properly stored before the browser navigates
  // to the external DigiLocker domain. Direct redirects to external domains
  // can lose Set-Cookie headers on some edge/CDN platforms (including Vercel).
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to DigiLocker...</title>
  <meta http-equiv="refresh" content="2;url=${authUrl}">
  <style>
    body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: system-ui, sans-serif; background: #f8fafc; }
    .loader { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #034EA2; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #64748b; font-size: 0.95rem; }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Redirecting to DigiLocker...</p>
  </div>
  <script>
    // Redirect after a short delay to ensure cookies are stored
    setTimeout(function() { window.location.href = ${JSON.stringify(authUrl)}; }, 500);
  </script>
</body>
</html>`;

  const response = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  const cookieOptions = {
    httpOnly: true,
    secure: true, // Always secure — production runs on HTTPS
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
