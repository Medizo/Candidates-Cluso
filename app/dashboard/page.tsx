"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  FileSignature,
  ListChecks,
  SlidersHorizontal,
  FileText,
  Clock3,
  CheckCircle2,
  TriangleAlert,
  ShieldCheck,
  GraduationCap,
  BriefcaseBusiness,
  UserRound,
  Briefcase,
  ChevronDown,
} from "lucide-react";
import { PortalFrame } from "@/components/dashboard/PortalFrame";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { usePortalSession } from "@/lib/hooks/usePortalSession";
import { useRequestsData } from "@/lib/hooks/useRequestsData";
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
        These are the positions you applied for on our website. Your applications are being reviewed.
      </p>
      <div className="applied-jobs-grid">
        {appliedJobs.map((job) => (
          <div key={job._id} className="applied-job-card">
            <div className="applied-job-card-header">
              <h4 className="applied-job-card-title">
                <span
                  className="applied-job-color-dot"
                  style={{ backgroundColor: job.jobColor }}
                />
                {job.jobTitle}
              </h4>
              <span className="applied-job-date">
                Applied {new Date(job.appliedAt).toLocaleDateString()}
              </span>
            </div>
            {job.jobDescription && (
              <>
                <button
                  className={`applied-job-toggle ${expandedJobId === job._id ? "expanded" : ""}`}
                  onClick={() =>
                    setExpandedJobId(expandedJobId === job._id ? null : job._id)
                  }
                >
                  {expandedJobId === job._id ? "Hide" : "View"} Job Description
                  <ChevronDown size={14} />
                </button>
                {expandedJobId === job._id && (
                  <div
                    className="applied-job-jd-preview"
                    dangerouslySetInnerHTML={{ __html: job.jobDescription }}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardContent() {
  const { me, loading, logout } = usePortalSession();
  const { items, loading: requestsLoading, refreshRequests } = useRequestsData();
  const [requestsReady, setRequestsReady] = useState(false);
  const { linked: digiLinked, loading: digiLoading } = useDigiLockerStatus();
  const searchParams = useSearchParams();
  const [digiMessage, setDigiMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [appliedJobsLoading, setAppliedJobsLoading] = useState(true);

  const enterpriseLinked = Boolean(me?.enterpriseLinked);

  useEffect(() => {
    if (!me || !enterpriseLinked) return;
    let active = true;
    (async () => {
      await refreshRequests(false);
      if (active) setRequestsReady(true);
    })();
    return () => { active = false; };
  }, [me, refreshRequests, enterpriseLinked]);

  // Handle DigiLocker callback status from URL params
  useEffect(() => {
    const digiStatus = searchParams.get("digilocker");
    if (digiStatus === "success") {
      setDigiMessage({ type: "success", text: "DigiLocker account linked successfully! Your details have been fetched." });
      window.history.replaceState({}, "", "/dashboard");
    } else if (digiStatus === "error") {
      const msg = searchParams.get("message") || "Failed to link DigiLocker";
      setDigiMessage({ type: "error", text: decodeURIComponent(msg) });
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  // Load profile data for completeness tracker
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (active) setProfile(data.profile);
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        if (active) setProfileLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Load applied jobs from the ClusoWebsite database
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/applied-jobs", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          if (active) setAppliedJobs(data);
        }
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
  const hasSkills = Boolean(profile && profile.keySkills && profile.keySkills.length > 0);
  const hasEmployment = Boolean(profile && profile.employment && profile.employment.length > 0);
  const hasEducation = Boolean(profile && profile.education && profile.education.length > 0);

  const completionPercentage = (hasDigiLocker ? 25 : 0) +
    (hasSkills ? 25 : 0) +
    (hasEmployment ? 25 : 0) +
    (hasEducation ? 25 : 0);

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

  // If enterprise hasn't linked the candidate yet, show the Profile Completeness Hub
  if (!enterpriseLinked) {
    return (
      <PortalFrame me={me} onLogout={logout} title="Profile Setup" subtitle="Complete your profile to prepare for background checks.">
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
                  {completionPercentage === 25 && "Nice Start!"}
                  {completionPercentage === 50 && "Halfway There!"}
                  {completionPercentage === 75 && "Almost Complete!"}
                  {completionPercentage === 100 && "All Set!"}
                </h3>
                <p className="completeness-status-desc">
                  {completionPercentage === 0 && "Link DigiLocker or add your employment/education to begin your profile."}
                  {completionPercentage === 25 && "Add your skills, employment, or education to boost your verification readiness."}
                  {completionPercentage === 50 && "You're making great progress. Add more details to get closer to 100%."}
                  {completionPercentage === 75 && "Just one more section to complete! Make your profile fully detailed."}
                  {completionPercentage === 100 && "Your profile is fully complete. Once an enterprise initiates your verification, your forms will appear here."}
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
              </div>
            </div>
          </div>

          {/* Applied Jobs from ClusoWebsite */}
          {!appliedJobsLoading && appliedJobs.length > 0 && (
            <AppliedJobsSection appliedJobs={appliedJobs} />
          )}

          {/* Quick Actions (Profile + DigiLocker only for unlinked candidates) */}
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

  if (requestsLoading || !requestsReady) {
    return (
      <LoadingScreen
        title="Loading workspace..."
        subtitle="Preparing your dashboard overview"
      />
    );
  }

  const pendingFormsCount = items.filter((item) => item.candidateFormStatus === "pending").length;
  const inReviewCount = items.filter((item) => item.candidateFormStatus === "submitted" && item.status === "pending").length;
  const verifiedCount = items.filter((item) => item.status === "verified").length;
  const rejectedCount = items.filter((item) => item.status === "rejected").length;
  
  const recentItems = [...items]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <PortalFrame me={me} onLogout={logout} title="" subtitle="">
      
      {rejectedCount > 0 && (
        <div className="inline-alert inline-alert-warning">
          {rejectedCount} verification{rejectedCount > 1 ? "s" : ""} need updates. Open History for admin notes.
        </div>
      )}

      {/* DigiLocker success/error messages */}
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

      <div className="dashboard-glass-wrapper">
        {/* Background Mesh Gradient Glow Blobs */}
        <div className="glass-glow-wrapper">
          <div className="glass-glow-blob glass-glow-1"></div>
          <div className="glass-glow-blob glass-glow-2"></div>
          <div className="glass-glow-blob glass-glow-3"></div>
        </div>

        <div className="dashboard-header" style={{ position: "relative", zIndex: 1 }}>
          <h2>Dashboard Overview</h2>
          <div className="top-actions">
            <Link href="/dashboard/orders" className="btn btn-green">Forms to fill</Link>

            {/* DigiLocker Button */}
            {!digiLoading && (
              digiLinked ? (
                <button className="btn btn-digilocker btn-digilocker-linked" disabled>
                  <Image
                    src="/images/digilocker-logo.svg"
                    alt="DigiLocker"
                    width={20}
                    height={20}
                    className="digilocker-btn-logo"
                  />
                  <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
                  DigiLocker Linked
                </button>
              ) : (
                <a href="/api/digilocker/authorize" className="btn btn-digilocker">
                  <Image
                    src="/images/digilocker-logo.svg"
                    alt="DigiLocker"
                    width={20}
                    height={20}
                    className="digilocker-btn-logo"
                  />
                  Verify with DigiLocker
                </a>
              )
            )}

            <Link href="/dashboard/requests" className="btn btn-blue">History</Link>
          </div>
        </div>

        <div className="portal-stats-grid" style={{ position: "relative", zIndex: 1 }}>
          <Link href="/dashboard/orders" className="portal-stat portal-stat-sky">
            <div className="portal-stat-icon-wrap">
              <FileText size={24} />
            </div>
            <div className="portal-stat-info">
              <span className="portal-stat-value">{pendingFormsCount}</span>
              <span className="portal-stat-label">Pending Forms</span>
            </div>
          </Link>

          <Link href="/dashboard/requests" className="portal-stat portal-stat-amber">
            <div className="portal-stat-icon-wrap">
              <Clock3 size={24} />
            </div>
            <div className="portal-stat-info">
              <span className="portal-stat-value">{inReviewCount}</span>
              <span className="portal-stat-label">In Review</span>
            </div>
          </Link>
          
          <Link href="/dashboard/requests" className="portal-stat portal-stat-emerald">
            <div className="portal-stat-icon-wrap">
              <CheckCircle2 size={24} />
            </div>
            <div className="portal-stat-info">
              <span className="portal-stat-value">{verifiedCount}</span>
              <span className="portal-stat-label">Verified</span>
            </div>
          </Link>

          <Link href="/dashboard/requests" className="portal-stat portal-stat-rose">
            <div className="portal-stat-icon-wrap">
              <TriangleAlert size={24} />
            </div>
            <div className="portal-stat-info">
              <span className="portal-stat-value">{rejectedCount}</span>
              <span className="portal-stat-label">Needs Update</span>
            </div>
          </Link>
        </div>

        <div className="quick-actions-section" style={{ position: "relative", zIndex: 1 }}>
          <h3>Quick Actions</h3>
          <div className="quick-actions-grid">
            <Link href="/dashboard/orders" className="quick-action-card">
              <FileSignature size={28} />
              <span>Complete Forms</span>
            </Link>
            <Link href="/dashboard/requests" className="quick-action-card">
              <ListChecks size={28} />
              <span>Track Verification</span>
            </Link>
            <Link href="/dashboard/profile" className="quick-action-card">
              <SlidersHorizontal size={28} />
              <span>Profile</span>
            </Link>
            {digiLinked ? (
              <Link href="/dashboard/profile" className="quick-action-card digilocker-quick-action">
                <ShieldCheck size={28} />
                <span>DigiLocker Verified ✓</span>
              </Link>
            ) : (
              <a href="/api/digilocker/authorize" className="quick-action-card digilocker-quick-action">
                <ShieldCheck size={28} />
                <span>DigiLocker Verify</span>
              </a>
            )}
          </div>
        </div>

        <div className="block-card" style={{ position: "relative", zIndex: 1 }}>
          <h3 className="block-title">Latest Verification Activity</h3>
          <p className="block-subtitle">Recent candidate tasks and current review state.</p>
          
          {recentItems.length === 0 ? (
            <p>No assigned requests yet.</p>
          ) : (
            <div className="recent-request-list">
              {recentItems.map((item) => (
                <div key={item._id} className="recent-request-item">
                  <div>
                    <strong>{item.customerName}</strong>
                    <span className="recent-request-meta">
                      {item.selectedServices.map((service) => service.serviceName).join(", ") || "No services"}
                    </span>
                  </div>
                  <div className="recent-request-right">
                    <span className={`status-pill status-pill-${item.status}`}>
                      {item.candidateFormStatus === "pending"
                        ? "form pending"
                        : item.status === "approved"
                          ? "approved by enterprise"
                          : item.status}
                    </span>
                    <span className="recent-request-meta">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>

        {/* Applied Jobs from ClusoWebsite (for enterprise-linked candidates) */}
        {!appliedJobsLoading && appliedJobs.length > 0 && (
          <AppliedJobsSection appliedJobs={appliedJobs} />
        )}

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
