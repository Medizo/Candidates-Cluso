import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { getCandidateAuthFromRequest, isCandidateUser } from "@/lib/auth";

const employmentSchema = z.object({
  companyName: z.string().trim().max(120).optional().default(""),
  designation: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(120).optional().default(""),
  country: z.string().trim().max(120).optional().default(""),
  startDate: z.string().trim().max(40).optional().default(""),
  endDate: z.string().trim().max(40).optional().default(""),
  currentlyWorking: z.boolean().optional().default(false),
  employmentType: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().max(1000).optional().default(""),
});

const educationSchema = z.object({
  level: z.string().trim().max(80).optional().default(""),
  institution: z.string().trim().max(200).optional().default(""),
  degree: z.string().trim().max(120).optional().default(""),
  fieldOfStudy: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(120).optional().default(""),
  country: z.string().trim().max(120).optional().default(""),
  startYear: z.string().trim().max(10).optional().default(""),
  endYear: z.string().trim().max(10).optional().default(""),
  educationType: z.string().trim().max(80).optional().default(""),
  grade: z.string().trim().max(40).optional().default(""),
});

const profileSchema = z.object({
  keySkills: z.array(z.string().trim().max(60)).optional().default([]),
  employment: z.array(employmentSchema).optional().default([]),
  education: z.array(educationSchema).optional().default([]),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeProfile(parsed: any) {
  const data = parsed || {};
  return {
    keySkills: [...new Set((data.keySkills ?? []).map((s: string) => s.trim()).filter(Boolean))],
    employment: (data.employment ?? []).map((e: z.infer<typeof employmentSchema>) => ({
      companyName: e.companyName || "",
      designation: e.designation || "",
      city: e.city || "",
      state: e.state || "",
      country: e.country || "",
      startDate: e.startDate || "",
      endDate: e.endDate || "",
      currentlyWorking: Boolean(e.currentlyWorking),
      employmentType: e.employmentType || "",
      description: e.description || "",
    })),
    education: (data.education ?? []).map((edu: z.infer<typeof educationSchema>) => ({
      level: edu.level || "",
      institution: edu.institution || "",
      degree: edu.degree || "",
      fieldOfStudy: edu.fieldOfStudy || "",
      city: edu.city || "",
      state: edu.state || "",
      country: edu.country || "",
      startYear: edu.startYear || "",
      endYear: edu.endYear || "",
      educationType: edu.educationType || "",
      grade: edu.grade || "",
    })),
  };
}

export async function GET(req: NextRequest) {
  const auth = await getCandidateAuthFromRequest(req);
  if (!auth || auth.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();
  const user = await User.findById(auth.userId).select("role candidateProfile deactivated onboarded onboardedFromCandidate").lean();
  if (!user || !isCandidateUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    profile: normalizeProfile(user.candidateProfile),
  });
}

export async function PUT(req: NextRequest) {
  const auth = await getCandidateAuthFromRequest(req);
  if (!auth || auth.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const normalizedProfile = normalizeProfile(parsed.data);

  await connectMongo();
  const user = await User.findById(auth.userId).select("_id role deactivated onboarded onboardedFromCandidate");
  if (!user || !isCandidateUser(user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await User.updateOne(
    { _id: auth.userId },
    {
      $set: {
        candidateProfile: normalizedProfile,
      },
    },
  );

  return NextResponse.json({
    message: "Profile updated successfully.",
    profile: normalizedProfile,
  });
}
