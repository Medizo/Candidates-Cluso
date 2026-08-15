"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  SlidersHorizontal,
  ShieldCheck,
  GraduationCap,
  BriefcaseBusiness,
  UserRound,
  Briefcase,
  ChevronDown,
  FileText,
} from "lucide-react";
import { PortalFrame } from "@/components/dashboard/PortalFrame";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { usePortalSession } from "@/lib/hooks/usePortalSession";
import { useDigiLockerStatus } from "@/components/dashboard/DigiLockerCard";
import { CandidateProfile } from "@/lib/types";

type AppliedJob = {
  _id: string;
  jobTitle: string;
  jobDescription: string | null;
  jobColor: string;
  appliedAt: string;
};

function AppliedJobsSection({ appliedJobs }: { appliedJobs: AppliedJob[] }) {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  if (appliedJobs.length === 0) return null;

  return (
    <div className="applied-jobs-section">
      <h3>
        <Briefcase size={20} />
        Jobs You Applied For
      </h3>
      <p className="applied-jobs-subtitle">
        Review the roles you have applied for via the careers portal
      </p>
      <div className="applied-jobs-grid">
        {appliedJobs.map((job) => {
          const isExpanded = expandedJobId === job._id;
          const formattedDate = new Date(job.appliedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });

          return (
            <div
              key={job._id}
              className={`applied-job-card ${isExpanded ? "expanded" : ""}`}
              style={{ "--job-accent": job.jobColor } as React.CSSProperties}
            >
              <div
                className="applied-job-header"
                onClick={() => setExpandedJobId(isExpanded ? null : job._id)}
              >
                <div className="applied-job-indicator" />
                <div className="applied-job-title-row">
                  <h4 className="applied-job-title">{job.jobTitle}</h4>
                  <span className="applied-job-date">{formattedDate}</span>
                </div>
                {job.jobDescription && (
                  <button
                    type="button"
                    className={`applied-job-toggle ${isExpanded ? "open" : ""}`}
                    aria-label={isExpanded ? "Collapse details" : "Expand details"}
                  >
                    <ChevronDown size={18} />
                  </button>
                )}
              </div>

              {job.jobDescription && isExpanded && (
                <div className="applied-job-body">
                  <p className="applied-job-desc">{job.jobDescription}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardContent() {
  const { me, loading, logout } = usePortalSession();
  const { linked: digiLinked, loading: digiLoading } = useDigiLockerStatus();

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [appliedJobsLoading, setAppliedJobsLoading] = useState(true);

  const searchParams = useSearchParams();
  const [digiMessage, setDigiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    const success = searchParams.get("success");
    if (error) {
      setDigiMessage({ type: "error", text: decodeURIComponent(error) });
    } else if (success === "digilocker_linked") {
      setDigiMessage({ type: "success", text: "DigiLocker verified and profile updated successfully!" });
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const data = (await res.json()) as { profile: CandidateProfile };
        if (active) setProfile(data.profile);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        if (active) setProfileLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/candidate-applied-jobs");
        if (!res.ok) throw new Error("Failed to load applied jobs");
        const data = await res.json();
        if (active && data.jobs) setAppliedJobs(data.jobs);
      } catch (err) {
        console.error("Failed to fetch applied jobs:", err);
      } finally {
        if (active) setAppliedJobsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const hasDigiLocker = Boolean(digiLinked);
  const hasEmployment = Boolean(profile && profile.employment && profile.employment.length > 0);
  const hasEducation = Boolean(profile && profile.education && profile.education.length > 0);
  const hasSkills = Boolean(profile && profile.keySkills && profile.keySkills.length > 0);
  const hasResume = Boolean(profile && profile.resume && (profile.resume.dataUrl || profile.resume.fileName));

  const completionPercentage =
    (hasDigiLocker ? 20 : 0) +
    (hasEmployment ? 20 : 0) +
    (hasEducation ? 20 : 0) +
    (hasSkills ? 20 : 0) +
    (hasResume ? 20 : 0);

  useEffect(() => {
    if (profileLoading || digiLoading) return;
    const timer = setTimeout(() => {
      setAnimatedPercentage(completionPercentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [completionPercentage, profileLoading, digiLoading]);

  // 2 * PI * r = 2 * 3.14159 * 70 = 439.82 -> 440
  const strokeDashoffset = 440 - (animatedPercentage / 100) * 440;

  if (loading || !me || profileLoading || digiLoading) {
    return (
      <LoadingScreen
        title="Loading workspace..."
        subtitle="Preparing your dashboard overview"
      />
    );
  }

  return (
    <PortalFrame me={me} onLogout={logout} title="Profile Setup" subtitle="Complete your profile to prepare for onboarding.">
      {digiMessage && (
        <div className={`inline-alert ${digiMessage.type === "success" ? "inline-alert-success" : "inline-alert-danger"}`}>
          {digiMessage.text}
          <button
            onClick={() => setDigiMessage(null)}
            style={{ float: "right", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "1rem" }}
          >
            ×
          </button>
        </div>
      )}

      <div className="dashboard-glass-wrapper" style={{ paddingBottom: "2.5rem" }}>
        <div className="glass-glow-wrapper">
          <div className="glass-glow-blob glass-glow-1"></div>
          <div className="glass-glow-blob glass-glow-2"></div>
          <div className="glass-glow-blob glass-glow-3"></div>
        </div>

        <div className="dashboard-header" style={{ position: "relative", zIndex: 2 }}>
          <h2>Welcome, {me.name.split(" ")[0]}!</h2>
          <p style={{ color: "var(--ink-soft)", marginTop: "0.25rem" }}>
            Complete your profile below. Once the admin reviews and approves your details, you will be onboarded as an employee.
          </p>
        </div>

        <div className="completeness-layout">
          {/* Left Column: Progress Ring Card */}
          <div className="completeness-left">
            <div className="completeness-card">
              <div className="progress-ring-container">
                <svg width="160" height="160" className="progress-ring-svg">
                  <circle
                    className="progress-ring-bg"
                    strokeWidth="10"
                    fill="transparent"
                    r="70"
                    cx="80"
                    cy="80"
                  />
                  <circle
                    className="progress-ring-bar"
                    strokeWidth="10"
                    fill="transparent"
                    r="70"
                    cx="80"
                    cy="80"
                    strokeLinecap="round"
                    style={{ strokeDashoffset }}
                  />
                  <defs>
                    <linearGradient id="completeness-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--brand)" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="progress-text-overlay">
                  <span className="progress-percentage">{animatedPercentage}%</span>
                  <span className="progress-label">Complete</span>
                </div>
              </div>

              <h3 className="completeness-status-title">
                {completionPercentage === 0 && "Let's Get Started"}
                {completionPercentage === 20 && "Off to a Good Start!"}
                {completionPercentage === 40 && "Making Steady Progress!"}
                {completionPercentage === 60 && "More than Halfway!"}
                {completionPercentage === 80 && "Almost Complete!"}
                {completionPercentage === 100 && "All Set & Ready!"}
              </h3>
              <p className="completeness-status-desc">
                {completionPercentage === 0 && "Link DigiLocker, upload your resume, or add your employment/education to begin your profile."}
                {completionPercentage === 20 && "Great first step! Complete the remaining sections to reach 100%."}
                {completionPercentage === 40 && "Almost halfway there. Keep adding your profile details and documents."}
                {completionPercentage === 60 && "You're doing great! Just a couple more sections to complete."}
                {completionPercentage === 80 && "Just one more section left to reach 100% profile completeness."}
                {completionPercentage === 100 && "Your profile is fully complete. The admin team will review your details for onboarding."}
              </p>
            </div>
          </div>

          {/* Right Column: Checklist Items */}
          <div className="completeness-right">
            <div className="completeness-checklist">
              {/* 1. DigiLocker */}
              <div className={`checklist-item ${hasDigiLocker ? "completed" : ""}`}>
                <div className="checklist-item-left">
                  <div className="checklist-item-status-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="checklist-item-details">
                    <h4 className="checklist-item-title">DigiLocker Verification</h4>
                    <p className="checklist-item-desc">
                      {hasDigiLocker ? "Identity successfully verified via government records" : "Verify your identity using DigiLocker to auto-fill details"}
                    </p>
                  </div>
                </div>
                {hasDigiLocker ? (
                  <button className="btn-checklist-action completed" disabled>Verified ✓</button>
                ) : (
                  <a href="/api/digilocker/authorize" className="btn-checklist-action">Verify</a>
                )}
              </div>

              {/* 2. Employment */}
              <div className={`checklist-item ${hasEmployment ? "completed" : ""}`}>
                <div className="checklist-item-left">
                  <div className="checklist-item-status-icon">
                    <BriefcaseBusiness size={20} />
                  </div>
                  <div className="checklist-item-details">
                    <h4 className="checklist-item-title">Employment History</h4>
                    <p className="checklist-item-desc">
                      {hasEmployment 
                        ? `${profile?.employment.length} work experience record(s) added`
                        : "Add your previous work experiences and job roles"}
                    </p>
                  </div>
                </div>
                {hasEmployment ? (
                  <button className="btn-checklist-action completed" disabled>Added ✓</button>
                ) : (
                  <Link href="/dashboard/profile" className="btn-checklist-action">Add Details</Link>
                )}
              </div>

              {/* 3. Education */}
              <div className={`checklist-item ${hasEducation ? "completed" : ""}`}>
                <div className="checklist-item-left">
                  <div className="checklist-item-status-icon">
                    <GraduationCap size={20} />
                  </div>
                  <div className="checklist-item-details">
                    <h4 className="checklist-item-title">Education Records</h4>
                    <p className="checklist-item-desc">
                      {hasEducation 
                        ? `${profile?.education.length} academic qualification(s) added`
                        : "Add school, college, or university degree information"}
                    </p>
                  </div>
                </div>
                {hasEducation ? (
                  <button className="btn-checklist-action completed" disabled>Added ✓</button>
                ) : (
                  <Link href="/dashboard/profile" className="btn-checklist-action">Add Details</Link>
                )}
              </div>

              {/* 4. Key Skills */}
              <div className={`checklist-item ${hasSkills ? "completed" : ""}`}>
                <div className="checklist-item-left">
                  <div className="checklist-item-status-icon">
                    <UserRound size={20} />
                  </div>
                  <div className="checklist-item-details">
                    <h4 className="checklist-item-title">Key Skills</h4>
                    <p className="checklist-item-desc">
                      {hasSkills 
                        ? `${profile?.keySkills.length} skill(s) listed`
                        : "Add your primary professional skills and tools"}
                    </p>
                  </div>
                </div>
                {hasSkills ? (
                  <button className="btn-checklist-action completed" disabled>Added ✓</button>
                ) : (
                  <Link href="/dashboard/profile" className="btn-checklist-action">Add Details</Link>
                )}
              </div>

              {/* 5. Resume / CV */}
              <div className={`checklist-item ${hasResume ? "completed" : ""}`}>
                <div className="checklist-item-left">
                  <div className="checklist-item-status-icon">
                    <FileText size={20} />
                  </div>
                  <div className="checklist-item-details">
                    <h4 className="checklist-item-title">Resume / CV</h4>
                    <p className="checklist-item-desc">
                      {hasResume
                        ? `Uploaded: ${profile?.resume?.fileName || "Resume attached"}`
                        : "Upload your latest resume or CV (PDF, DOC, DOCX)"}
                    </p>
                  </div>
                </div>
                {hasResume ? (
                  <Link href="/dashboard/profile#resume-section" className="btn-checklist-action completed">
                    Uploaded ✓
                  </Link>
                ) : (
                  <Link href="/dashboard/profile#resume-section" className="btn-checklist-action">
                    Upload CV
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Applied Jobs from ClusoWebsite */}
        {!appliedJobsLoading && appliedJobs.length > 0 && (
          <AppliedJobsSection appliedJobs={appliedJobs} />
        )}

        {/* Quick Actions */}
        <div className="quick-actions-section" style={{ position: "relative", zIndex: 2 }}>
          <h3>Quick Actions</h3>
          <div className="quick-actions-grid">
            <Link href="/dashboard/profile" className="quick-action-card">
              <SlidersHorizontal size={28} />
              <span>Profile Settings</span>
            </Link>
            {hasDigiLocker ? (
              <Link href="/dashboard/profile" className="quick-action-card digilocker-quick-action">
                <ShieldCheck size={28} />
                <span>DigiLocker Verified ✓</span>
              </Link>
            ) : (
              <a href="/api/digilocker/authorize" className="quick-action-card digilocker-quick-action">
                <ShieldCheck size={28} />
                <span>Link DigiLocker</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </PortalFrame>
  );
}

export default function DashboardOverviewPage() {
  return (
    <Suspense fallback={<LoadingScreen title="Loading workspace..." subtitle="Preparing your dashboard overview" />}>
      <DashboardContent />
    </Suspense>
  );
}
