import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { getCandidateAuthFromRequest, isCandidateUser } from "@/lib/auth";

/**
 * GET /api/digilocker/user
 *
 * Returns the stored DigiLocker profile data from MongoDB.
 */
export async function GET(request: NextRequest) {
  const auth = await getCandidateAuthFromRequest(request);
  if (!auth || auth.role !== "candidate") {
    return NextResponse.json({ linked: false, profile: null });
  }

  await connectMongo();
  const user = await User.findById(auth.userId).select("role digilockerProfile deactivated onboarded onboardedFromCandidate").lean();

  if (!user || !isCandidateUser(user)) {
    return NextResponse.json({ linked: false, profile: null });
  }

  if (!user.digilockerProfile?.verified) {
    return NextResponse.json({ linked: false, profile: null });
  }

  return NextResponse.json({ linked: true, profile: user.digilockerProfile });
}

/**
 * DELETE /api/digilocker/user
 *
 * Unlinks the DigiLocker account by clearing the stored data in MongoDB.
 */
export async function DELETE(request: NextRequest) {
  const auth = await getCandidateAuthFromRequest(request);
  if (!auth || auth.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();
  const user = await User.findById(auth.userId).select("role deactivated onboarded onboardedFromCandidate");
  if (!user || !isCandidateUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await User.updateOne(
    { _id: auth.userId },
    { $unset: { digilockerProfile: 1 } },
  );

  const response = NextResponse.json({ success: true, message: "DigiLocker unlinked" });
  // Clear any leftover cookies
  response.cookies.delete("digilocker_profile");
  response.cookies.delete("digilocker_token");
  return response;
}
