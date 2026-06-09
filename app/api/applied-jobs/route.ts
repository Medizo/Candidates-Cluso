import { NextRequest, NextResponse } from "next/server";
import { getCandidateAuthFromRequest } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { getWebsiteCandidateRequestModel } from "@/lib/models/website/CandidateRequest";

/**
 * GET /api/applied-jobs
 *
 * Fetches job applications the logged-in candidate submitted on the
 * ClusoWebsite (cluso.in). Uses a secondary MongoDB connection to the
 * website database and matches by email.
 *
 * Returns an array of applied job objects:
 *   { jobTitle, jobDescription, jobColor, appliedAt }
 */
export async function GET(req: NextRequest) {
  const auth = await getCandidateAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the candidate's email from the primary ClusoCRM database
    await connectMongo();
    const user = await User.findById(auth.userId).select("email").lean();

    if (!user?.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const email = user.email.toLowerCase().trim();

    // Query the ClusoWebsite database for applications with matching email
    const CandidateRequest = await getWebsiteCandidateRequestModel();

    const applications = await CandidateRequest.find({ email })
      .select("jobTitle jobDescription jobColor jobId createdAt")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Filter to only include applications that have job data
    const appliedJobs = applications
      .filter((app) => app.jobTitle || app.jobDescription)
      .map((app) => ({
        _id: String(app._id),
        jobTitle: app.jobTitle || "General Application",
        jobDescription: app.jobDescription || null,
        jobColor: app.jobColor || "#0052cc",
        appliedAt: app.createdAt,
      }));

    return NextResponse.json(appliedJobs);
  } catch (error) {
    console.error("[applied-jobs] Error fetching applied jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch applied jobs" },
      { status: 500 }
    );
  }
}
