import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectMongo } from "@/lib/mongodb";
import Candidate from "@/lib/models/Candidate";
import { getCandidateAuthFromRequest } from "@/lib/auth";

const uploadResumeSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required").max(255),
  fileType: z.string().trim().max(120).default("application/pdf"),
  fileSize: z.number().positive("File size must be greater than 0").max(10 * 1024 * 1024, "File size must not exceed 10MB"),
  dataUrl: z.string().min(1, "Resume file data is required"),
});

export async function GET(req: NextRequest) {
  const auth = await getCandidateAuthFromRequest(req);
  if (!auth || auth.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();
  const candidate = await Candidate.findById(auth.userId).select("candidateProfile.resume").lean();
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  return NextResponse.json({
    resume: candidate.candidateProfile?.resume || null,
  });
}

export async function POST(req: NextRequest) {
  return handleUpload(req);
}

export async function PUT(req: NextRequest) {
  return handleUpload(req);
}

async function handleUpload(req: NextRequest) {
  const auth = await getCandidateAuthFromRequest(req);
  if (!auth || auth.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request format." }, { status: 400 });
  }

  const parsed = uploadResumeSchema.safeParse(body);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "Invalid resume data.";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { fileName, fileType, fileSize, dataUrl } = parsed.data;

  // Basic check for supported MIME types or extensions
  const isAllowedType =
    fileType.includes("pdf") ||
    fileType.includes("word") ||
    fileType.includes("document") ||
    fileType.includes("msword") ||
    fileType.includes("image") ||
    /\.(pdf|docx?|txt|rtf|png|jpe?g)$/i.test(fileName);

  if (!isAllowedType) {
    return NextResponse.json(
      { error: "Invalid file format. Please upload a PDF, DOC, DOCX, or Image file." },
      { status: 400 },
    );
  }

  const resumeData = {
    fileName,
    fileType,
    fileSize,
    dataUrl,
    uploadedAt: new Date(),
  };

  await connectMongo();
  const candidate = await Candidate.findById(auth.userId);
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  await Candidate.updateOne(
    { _id: auth.userId },
    {
      $set: {
        "candidateProfile.resume": resumeData,
      },
    },
  );

  return NextResponse.json({
    message: "Resume uploaded successfully.",
    resume: {
      ...resumeData,
      uploadedAt: resumeData.uploadedAt.toISOString(),
    },
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await getCandidateAuthFromRequest(req);
  if (!auth || auth.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();
  const candidate = await Candidate.findById(auth.userId);
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  await Candidate.updateOne(
    { _id: auth.userId },
    {
      $set: {
        "candidateProfile.resume": null,
      },
    },
  );

  return NextResponse.json({
    message: "Resume removed successfully.",
    resume: null,
  });
}
