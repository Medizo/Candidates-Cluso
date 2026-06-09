import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { candidateCookieName, verifyCandidateToken } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import User from "@/lib/models/User";
import VerificationRequest from "@/lib/models/VerificationRequest";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(candidateCookieName())?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = verifyCandidateToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();

  const user = await User.findById(payload.userId).lean();
  if (!user || user.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let enterpriseLinked = Boolean(user.enterpriseLinked);
  if (!enterpriseLinked) {
    const emailLower = user.email.trim().toLowerCase();
    const requestExists = await VerificationRequest.findOne({
      candidateEmail: { $regex: new RegExp(`^${emailLower}$`, "i") },
    }).select("_id").lean();

    if (requestExists) {
      enterpriseLinked = true;
      await User.updateOne({ _id: user._id }, { $set: { enterpriseLinked: true } });
    }
  }

  return NextResponse.json({
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: "candidate",
      mustChangePassword: user.mustChangePassword !== false,
      enterpriseLinked,
    },
  });
}

