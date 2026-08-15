import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import Candidate from "@/lib/models/Candidate";
import { getCandidateAuthFromRequest } from "@/lib/auth";

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
  description: z.string().trim().max(2000).optional().default(""),
});

const educationSchema = z.object({
  level: z.string().trim().max(120).optional().default(""),
  institution: z.string().trim().max(160).optional().default(""),
  degree: z.string().trim().max(160).optional().default(""),
  fieldOfStudy: z.string().trim().max(160).optional().default(""),
  city: z.string().trim().max(120).optional().default(""),
  state: z.string().trim().max(120).optional().default(""),
  country: z.string().trim().max(120).optional().default(""),
  startYear: z.string().trim().max(20).optional().default(""),
  endYear: z.string().trim().max(20).optional().default(""),
  educationType: z.string().trim().max(80).optional().default(""),
  grade: z.string().trim().max(80).optional().default(""),
});

const resumeSchema = z.object({
  fileName: z.string().trim().max(255).default(""),
  fileType: z.string().trim().max(120).default(""),
  fileSize: z.number().nonnegative().max(15 * 1024 * 1024).default(0),
  dataUrl: z.string().max(25 * 1024 * 1024).default(""),
  uploadedAt: z.union([z.string(), z.date()]).nullable().optional(),
}).nullable().optional();

const profileSchema = z.object({
  keySkills: z.array(z.string().trim().min(1).max(80)).max(100).optional().default([]),
  employment: z.array(employmentSchema).max(50).optional().default([]),
  education: z.array(educationSchema).max(50).optional().default([]),
  resume: resumeSchema,
});

function normalizeProfile(rawProfile: unknown) {
  const parsed = profileSchema.safeParse(rawProfile);
  if (!parsed.success) {
    return {
      keySkills: [],
      employment: [],
      education: [],
      resume: null,
    };
  }

  const keySkills = Array.from(
    new Set(
      parsed.data.keySkills
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0),
    ),
  );

  let resume = null;
  if (parsed.data.resume && (parsed.data.resume.dataUrl || parsed.data.resume.fileName)) {
    resume = {
      fileName: parsed.data.resume.fileName || "",
      fileType: parsed.data.resume.fileType || "",
      fileSize: parsed.data.resume.fileSize || 0,
      dataUrl: parsed.data.resume.dataUrl || "",
      uploadedAt: parsed.data.resume.uploadedAt
        ? new Date(parsed.data.resume.uploadedAt).toISOString()
        : new Date().toISOString(),
    };
  }

  return {
    keySkills,
    employment: parsed.data.employment,
    education: parsed.data.education,
    resume,
  };
}

export async function GET(req: NextRequest) {
  const auth = await getCandidateAuthFromRequest(req);
  if (!auth || auth.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();
  const candidate = await Candidate.findById(auth.userId).select("candidateProfile").lean();
  if (!candidate) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    profile: normalizeProfile(candidate.candidateProfile),
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
  const candidate = await Candidate.findById(auth.userId).select("candidateProfile");
  if (!candidate) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Preserve existing resume if not explicitly provided in the request body
  const finalProfile = { ...normalizedProfile };
  if ((body as Record<string, unknown>).resume === undefined && candidate.candidateProfile?.resume) {
    const existingResume = candidate.candidateProfile.resume;
    if (existingResume && (existingResume.dataUrl || existingResume.fileName)) {
      finalProfile.resume = {
        fileName: existingResume.fileName || "",
        fileType: existingResume.fileType || "",
        fileSize: existingResume.fileSize || 0,
        dataUrl: existingResume.dataUrl || "",
        uploadedAt: existingResume.uploadedAt
          ? new Date(existingResume.uploadedAt).toISOString()
          : new Date().toISOString(),
      };
    }
  }

  await Candidate.updateOne(
    { _id: auth.userId },
    {
      $set: {
        candidateProfile: finalProfile,
      },
    },
  );

  return NextResponse.json({
    message: "Profile updated successfully.",
    profile: finalProfile,
  });
}
