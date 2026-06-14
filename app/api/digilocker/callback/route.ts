import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { getCandidateAuthFromRequest } from "@/lib/auth";

/**
 * Get a reliable origin URL for redirects.
 * On Vercel, request.url can sometimes use internal hostnames.
 * We prefer x-forwarded-host > host header > redirect URI origin > request.url
 */
function getOrigin(request: NextRequest): string {
  // Try x-forwarded-host first (set by Vercel/reverse proxies)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (forwardedHost) {
    return `${proto}://${forwardedHost}`;
  }

  // Try host header
  const host = request.headers.get("host");
  if (host && !host.includes("localhost")) {
    return `https://${host}`;
  }

  // Fallback: extract origin from DIGILOCKER_REDIRECT_URI
  const redirectUri = process.env.DIGILOCKER_REDIRECT_URI;
  if (redirectUri) {
    try {
      const url = new URL(redirectUri);
      return url.origin;
    } catch { /* ignore */ }
  }

  // Last resort: use request.url
  try {
    const url = new URL(request.url);
    return url.origin;
  } catch {
    return "https://candidate.cluso.in";
  }
}

/**
 * GET /api/digilocker/callback
 *
 * Handles the OAuth2 callback from DigiLocker:
 * 1. Validates the `state` parameter (CSRF check)
 * 2. Exchanges the authorization `code` for an access token (with PKCE code_verifier)
 * 3. Extracts user details from the id_token JWT + token response
 * 4. Saves the full profile to MongoDB on the User document
 * 5. Redirects back to the dashboard
 */
function formatDOBToDDMMYYYY(dobStr: string): string {
  if (!dobStr) return "";
  const cleaned = dobStr.trim();
  
  // 1. Matches DD-MM-YYYY, DD/MM/YYYY, MM-DD-YYYY, or MM/DD/YYYY
  const dmYMatch = cleaned.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmYMatch) {
    const val1 = parseInt(dmYMatch[1], 10);
    const val2 = parseInt(dmYMatch[2], 10);
    const year = dmYMatch[3];
    
    let day = val1;
    let month = val2;
    
    // If the second value is greater than 12, it must be the day (MM-DD-YYYY)
    if (val2 > 12) {
      day = val2;
      month = val1;
    }
    // If the first value is greater than 12, it must be the day (DD-MM-YYYY)
    else if (val1 > 12) {
      day = val1;
      month = val2;
    }
    
    return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
  }

  // 2. Matches YYYY-MM-DD or YYYY/MM/DD
  const YmdMatch = cleaned.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (YmdMatch) {
    const year = YmdMatch[1];
    const val1 = parseInt(YmdMatch[2], 10);
    const val2 = parseInt(YmdMatch[3], 10);
    
    let month = val1;
    let day = val2;
    
    // If the first value is greater than 12, it must be the day (YYYY-DD-MM)
    if (val1 > 12) {
      day = val1;
      month = val2;
    }
    
    return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
  }

  // 3. Matches 8 consecutive digits
  if (/^\d{8}$/.test(cleaned)) {
    const part1 = cleaned.substring(0, 4);
    const yearNum = parseInt(part1, 10);
    if (yearNum >= 1900 && yearNum <= 2100) {
      const year = part1;
      const val1 = parseInt(cleaned.substring(4, 6), 10);
      const val2 = parseInt(cleaned.substring(6, 8), 10);
      let month = val1;
      let day = val2;
      if (val1 > 12) {
        day = val1;
        month = val2;
      }
      return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
    } else {
      const val1 = parseInt(cleaned.substring(0, 2), 10);
      const val2 = parseInt(cleaned.substring(2, 4), 10);
      const year = cleaned.substring(4, 8);
      let day = val1;
      let month = val2;
      if (val2 > 12) {
        day = val2;
        month = val1;
      }
      return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`;
    }
  }

  return cleaned;
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.DIGILOCKER_BASE_URL ?? "https://digilocker.meripehchaan.gov.in";
  const clientId = process.env.DIGILOCKER_CLIENT_ID ?? "";
  const clientSecret = process.env.DIGILOCKER_CLIENT_SECRET ?? "";
  const redirectUri = process.env.DIGILOCKER_REDIRECT_URI ?? "";
  const origin = getOrigin(request);

  console.log("[DigiLocker] Callback hit. Origin:", origin, "request.url:", request.url);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  // If user denied access or DigiLocker returned an error
  if (error) {
    const msg = errorDesc || error || "Authorization denied";
    console.error("[DigiLocker] Auth error from DigiLocker:", msg);
    return NextResponse.redirect(
      new URL(`/dashboard?digilocker=error&message=${encodeURIComponent(msg)}`, origin),
    );
  }

  if (!code || !state) {
    console.error("[DigiLocker] Missing code or state. code:", !!code, "state:", !!state);
    return NextResponse.redirect(
      new URL("/dashboard?digilocker=error&message=Missing+authorization+code", origin),
    );
  }

  // Validate state against cookie
  const storedState = request.cookies.get("digilocker_state")?.value;
  console.log("[DigiLocker] State check — stored:", storedState ? "present" : "MISSING", "received:", state ? "present" : "MISSING", "match:", storedState === state);
  if (!storedState || storedState !== state) {
    console.error("[DigiLocker] State mismatch! Cookie state:", storedState, "URL state:", state);
    // List all cookies for debugging
    const allCookies = request.cookies.getAll().map(c => c.name);
    console.error("[DigiLocker] Available cookies:", allCookies);
    return NextResponse.redirect(
      new URL("/dashboard?digilocker=error&message=Invalid+state+parameter+(cookies+may+have+been+lost)", origin),
    );
  }

  // Get the logged-in candidate
  const auth = await getCandidateAuthFromRequest(request);
  if (!auth || auth.role !== "candidate") {
    console.error("[DigiLocker] Auth check failed. auth:", auth);
    return NextResponse.redirect(
      new URL("/dashboard?digilocker=error&message=Not+logged+in", origin),
    );
  }

  // Retrieve PKCE code_verifier from cookie
  const codeVerifier = request.cookies.get("digilocker_code_verifier")?.value ?? "";

  try {
    // ── Step 1: Exchange code for token (v2 endpoint + PKCE) ──
    const tokenParams = new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const tokenResponse = await fetch(`${baseUrl}/public/oauth2/2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error("[DigiLocker] Token exchange failed:", tokenResponse.status, tokenError);
      return NextResponse.redirect(
        new URL("/dashboard?digilocker=error&message=Token+exchange+failed", origin),
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error("[DigiLocker] No access_token in response:", tokenData);
      return NextResponse.redirect(
        new URL("/dashboard?digilocker=error&message=No+access+token+received", origin),
      );
    }

    // ── Step 2: Extract user info from all sources ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user: Record<string, any> = {};

    // Source 1: Decode the id_token JWT (contains the richest claims)
    if (tokenData.id_token) {
      try {
        const parts = tokenData.id_token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(
            Buffer.from(parts[1], "base64url").toString(),
          );
          console.log("[DigiLocker] id_token claims:", JSON.stringify(payload, null, 2));
          user = {
            name: payload.given_name || payload.name || payload.preferred_username || "",
            dob: payload.birthdate || payload.dob || "",
            gender: payload.gender || "",
            email: payload.email || "",
            mobile: payload.phone_number || payload.mobile || "",
            maskedAadhaar: payload.masked_aadhaar || "",
            digilockerid: payload.digilockerid || payload.sub || "",
            referenceKey: payload.reference_key || "",
            panNumber: payload.pan_number || "",
            drivingLicence: payload.driving_licence || "",
            preferredUsername: payload.preferred_username || "",
          };
        }
      } catch (jwtErr) {
        console.error("[DigiLocker] Could not decode id_token:", jwtErr);
      }
    }

    // Source 2: Token response top-level fields
    if (tokenData.name) user.name = tokenData.name;
    if (tokenData.dob) user.dob = tokenData.dob;
    if (tokenData.gender) user.gender = tokenData.gender;
    if (tokenData.email) user.email = tokenData.email;
    if (tokenData.mobile) user.mobile = tokenData.mobile;
    if (tokenData.digilockerid) user.digilockerid = tokenData.digilockerid;
    if (tokenData.eaadhaar) user.eaadhaar = tokenData.eaadhaar;
    if (tokenData.reference_key) user.referenceKey = tokenData.reference_key;

    // Source 3: Fetch profile picture
    let photo = "";
    if (tokenData.picture) {
      photo = tokenData.picture;
    }

    // Source 4: Try the /user API (may fail with openid-only scope)
    try {
      const userResponse = await fetch(`${baseUrl}/public/oauth2/1/user`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userResponse.ok) {
        const apiUser = await userResponse.json();
        console.log("[DigiLocker] User API response:", JSON.stringify(apiUser, null, 2));
        if (apiUser.name) user.name = apiUser.name;
        if (apiUser.dob || apiUser.birthdate) user.dob = apiUser.dob || apiUser.birthdate;
        if (apiUser.gender) user.gender = apiUser.gender;
        if (apiUser.email) user.email = apiUser.email;
        if (apiUser.mobile || apiUser.phone_number) user.mobile = apiUser.mobile || apiUser.phone_number;
        if (apiUser.digilockerid) user.digilockerid = apiUser.digilockerid;
        if (apiUser.photo || apiUser.picture) photo = apiUser.photo || apiUser.picture;
      } else {
        console.log("[DigiLocker] User API failed (expected with openid scope):", userResponse.status);
      }
    } catch (userErr) {
      console.log("[DigiLocker] User API error:", userErr);
    }

    // Source 5: Fetch issued documents
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let documents: any[] = [];
    try {
      const docsResponse = await fetch(`${baseUrl}/public/oauth2/2/files/issued`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        if (docsData.items && Array.isArray(docsData.items)) {
          documents = docsData.items.map((doc: Record<string, unknown>) => ({
            name: doc.name || "",
            doctype: doc.doctype || "",
            description: doc.description || "",
            issuer: doc.issuer || "",
            issuerId: doc.issuerid || "",
            uri: doc.uri || "",
            date: doc.date || "",
          }));
          console.log(`[DigiLocker] Fetched ${documents.length} issued documents`);
        }
      }
    } catch (docErr) {
      console.log("[DigiLocker] Documents API error:", docErr);
    }

    // ── Step 3: Save to MongoDB ──
    const digilockerProfile = {
      verified: true,
      name: user.name || "",
      dob: formatDOBToDDMMYYYY(user.dob || ""),
      gender: user.gender || "",
      email: user.email || "",
      mobile: user.mobile || "",
      maskedAadhaar: user.maskedAadhaar || "",
      digilockerid: user.digilockerid || "",
      referenceKey: user.referenceKey || "",
      eaadhaar: user.eaadhaar || "",
      photo: photo || "",
      panNumber: user.panNumber || "",
      drivingLicence: user.drivingLicence || "",
      preferredUsername: user.preferredUsername || "",
      documents,
      linkedAt: new Date(),
    };

    console.log("[DigiLocker] Saving profile for user:", auth.userId);
    console.log("[DigiLocker] Profile fields:", {
      ...digilockerProfile,
      photo: photo ? `(${photo.length} chars)` : "(empty)",
    });

    await connectMongo();
    await User.updateOne(
      { _id: auth.userId },
      { $set: { digilockerProfile } },
    );

    // ── Step 4: Redirect back to dashboard ──
    const response = NextResponse.redirect(
      new URL("/dashboard?digilocker=success", origin),
    );

    // Clear the OAuth flow cookies
    response.cookies.delete("digilocker_state");
    response.cookies.delete("digilocker_code_verifier");
    response.cookies.delete("digilocker_nonce");
    // Also clear old cookie-based profile if it exists
    response.cookies.delete("digilocker_profile");
    response.cookies.delete("digilocker_token");

    return response;
  } catch (err) {
    console.error("[DigiLocker] Callback error:", err);
    return NextResponse.redirect(
      new URL("/dashboard?digilocker=error&message=Internal+server+error", origin),
    );
  }
}
