import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { candidateCookieName, verifyCandidateToken, isCandidateUser } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function GET() {
  try {
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
    if (!user || !isCandidateUser(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    // Find certificates where recipientEmail matches the candidate's email (case-insensitive)
    const emailLower = user.email.trim().toLowerCase();
    const certificates = await db.collection("certificates")
      .find({ recipientEmail: emailLower })
      .sort({ createdAt: -1 })
      .toArray();

    const safe = certificates.map(({ _id, ...c }) => ({
      ...c,
      id: c.id || _id.toString(),
    }));

    return NextResponse.json({ certificates: safe });
  } catch (error: any) {
    console.error("Error fetching certificates for candidate:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
