"use client";

import { useEffect, useState, useRef, Suspense } from "react";
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
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  Plus,
} from "lucide-react";
import { PortalFrame } from "@/components/dashboard/PortalFrame";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ProfileEditDrawer } from "@/components/dashboard/ProfileEditDrawer";
import { usePortalSession } from "@/lib/hooks/usePortalSession";
import { useDigiLockerStatus } from "@/components/dashboard/DigiLockerCard";
import { CandidateProfile, CandidateEmploymentRecord, CandidateEducationRecord } from "@/lib/types";

type AppliedJob = {
  _id: string;
  jobTitle: string;
  jobDescription: string | null;
  jobColor: string;
  appliedAt: string;
};

type ActiveDrawer = "skills" | "employment" | "education" | "resume" | null;

const EMPTY_EMPLOYMENT: CandidateEmploymentRecord = {
  companyName: "",
  designation: "",
  city: "",
  state: "",
  country: "India",
  startDate: "",
  endDate: "",
  currentlyWorking: false,
  employmentType: "Full-time",
  description: "",
};

const EMPTY_EDUCATION: CandidateEducationRecord = {
  level: "Bachelor's Degree",
  institution: "",
  degree: "",
  fieldOfStudy: "",
  city: "",
  state: "",
  country: "India",
  startYear: "",
  endYear: "",
  educationType: "Full-time",
  grade: "",
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
  const [dashboardMessage, setDashboardMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // In-place Drawer States
  const [activeDrawer, setActiveDrawer] = useState<ActiveDrawer>(null);
  const [savingDrawer, setSavingDrawer] = useState(false);
  const [drawerError, setDrawerError] = useState("");

  // Drawer Form States
  const [skillsInput, setSkillsInput] = useState("");
  const [employmentForm, setEmploymentForm] = useState<CandidateEmploymentRecord>(EMPTY_EMPLOYMENT);
  const [educationForm, setEducationForm] = useState<CandidateEducationRecord>(EMPTY_EDUCATION);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeDragOver, setResumeDragOver] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    const success = searchParams.get("success");
    if (error) {
      setDashboardMessage({ type: "error", text: decodeURIComponent(error) });
    } else if (success === "digilocker_linked") {
      setDashboardMessage({ type: "success", text: "DigiLocker verified and profile updated successfully!" });
    }
  }, [searchParams]);

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = (await res.json()) as { profile: CandidateProfile };
        if (data?.profile) {
          setProfile(data.profile);
          setSkillsInput(data.profile.keySkills ? data.profile.keySkills.join(", ") : "");
        }
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
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

  // Drawer Open / Close Handlers
  const openDrawer = (section: ActiveDrawer) => {
    setDrawerError("");
    if (section === "skills") {
      setSkillsInput(profile?.keySkills ? profile.keySkills.join(", ") : "");
    } else if (section === "employment") {
      setEmploymentForm(EMPTY_EMPLOYMENT);
    } else if (section === "education") {
      setEducationForm(EMPTY_EDUCATION);
    } else if (section === "resume") {
      setResumeFile(null);
    }
    setActiveDrawer(section);
  };

  const closeDrawer = () => {
    setActiveDrawer(null);
    setDrawerError("");
    setSavingDrawer(false);
  };

  // Save Skills In-Place
  const handleSaveSkills = async () => {
    setDrawerError("");
    const parsedSkills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (parsedSkills.length === 0) {
      setDrawerError("Please enter at least one skill.");
      return;
    }

    setSavingDrawer(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keySkills: parsedSkills,
          employment: profile?.employment || [],
          education: profile?.education || [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save skills.");
      }

      setProfile((prev) => ({
        ...(prev || { employment: [], education: [], keySkills: [], resume: null }),
        keySkills: parsedSkills,
      }));
      setDashboardMessage({ type: "success", text: "Key skills added successfully!" });
      closeDrawer();
    } catch (err: unknown) {
      setDrawerError(err instanceof Error ? err.message : "Failed to save skills.");
    } finally {
      setSavingDrawer(false);
    }
  };

  // Save Employment In-Place
  const handleSaveEmployment = async () => {
    setDrawerError("");
    if (!employmentForm.companyName.trim()) {
      setDrawerError("Company Name is required.");
      return;
    }
    if (!employmentForm.designation.trim()) {
      setDrawerError("Designation / Role is required.");
      return;
    }

    setSavingDrawer(true);
    try {
      const updatedEmployment = [...(profile?.employment || []), employmentForm];
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keySkills: profile?.keySkills || [],
          employment: updatedEmployment,
          education: profile?.education || [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save employment record.");
      }

      setProfile((prev) => ({
        ...(prev || { employment: [], education: [], keySkills: [], resume: null }),
        employment: updatedEmployment,
      }));
      setDashboardMessage({ type: "success", text: "Employment history added successfully!" });
      closeDrawer();
    } catch (err: unknown) {
      setDrawerError(err instanceof Error ? err.message : "Failed to save employment.");
    } finally {
      setSavingDrawer(false);
    }
  };

  // Save Education In-Place
  const handleSaveEducation = async () => {
    setDrawerError("");
    if (!educationForm.institution.trim()) {
      setDrawerError("Institution / University name is required.");
      return;
    }
    if (!educationForm.degree.trim()) {
      setDrawerError("Degree / Program name is required.");
      return;
    }

    setSavingDrawer(true);
    try {
      const updatedEducation = [...(profile?.education || []), educationForm];
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keySkills: profile?.keySkills || [],
          employment: profile?.employment || [],
          education: updatedEducation,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save education record.");
      }

      setProfile((prev) => ({
        ...(prev || { employment: [], education: [], keySkills: [], resume: null }),
        education: updatedEducation,
      }));
      setDashboardMessage({ type: "success", text: "Education record added successfully!" });
      closeDrawer();
    } catch (err: unknown) {
      setDrawerError(err instanceof Error ? err.message : "Failed to save education.");
    } finally {
      setSavingDrawer(false);
    }
  };

  // Save Resume In-Place
  const handleUploadResume = async () => {
    setDrawerError("");
    if (!resumeFile) {
      setDrawerError("Please select a resume file to upload.");
      return;
    }

    if (resumeFile.size > 10 * 1024 * 1024) {
      setDrawerError("File size exceeds 10MB limit. Please upload a smaller file.");
      return;
    }

    setSavingDrawer(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) {
          setDrawerError("Failed to read file.");
          setSavingDrawer(false);
          return;
        }

        const res = await fetch("/api/profile/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: resumeFile.name,
            fileType: resumeFile.type || "application/pdf",
            fileSize: resumeFile.size,
            dataUrl,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setDrawerError(data.error || "Failed to upload resume.");
        } else {
          setProfile((prev) => ({
            ...(prev || { employment: [], education: [], keySkills: [], resume: null }),
            resume: data.resume,
          }));
          setDashboardMessage({ type: "success", text: "Resume uploaded successfully!" });
          closeDrawer();
        }
        setSavingDrawer(false);
      };
      reader.onerror = () => {
        setDrawerError("Error reading file.");
        setSavingDrawer(false);
      };
      reader.readAsDataURL(resumeFile);
    } catch (err: unknown) {
      setDrawerError(err instanceof Error ? err.message : "Upload failed. Please check network.");
      setSavingDrawer(false);
    }
  };

  if (loading || !me || profileLoading || digiLoading) {
    return (
      <LoadingScreen
        title="Loading workspace..."
        subtitle="Preparing your dashboard overview"
      />
    );
  }

  let drawerTitle = "";
  let drawerIcon = null as React.ReactNode;
  if (activeDrawer === "skills") {
    drawerTitle = "Add Key Skills";
    drawerIcon = <UserRound size={18} />;
  } else if (activeDrawer === "employment") {
    drawerTitle = "Add Employment History";
    drawerIcon = <BriefcaseBusiness size={18} />;
  } else if (activeDrawer === "education") {
    drawerTitle = "Add Education Record";
    drawerIcon = <GraduationCap size={18} />;
  } else if (activeDrawer === "resume") {
    drawerTitle = "Upload Resume / CV";
    drawerIcon = <FileText size={18} />;
  }

  return (
    <PortalFrame me={me} onLogout={logout} title="Profile Setup" subtitle="Complete your profile to prepare for onboarding.">
      {dashboardMessage && (
        <div className={`inline-alert ${dashboardMessage.type === "success" ? "inline-alert-success" : "inline-alert-danger"}`} style={{ marginBottom: "1.25rem" }}>
          {dashboardMessage.text}
          <button
            onClick={() => setDashboardMessage(null)}
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

              {completionPercentage > 0 && (
                <div style={{ marginTop: "1.25rem", width: "100%" }}>
                  <Link
                    href="/dashboard/profile"
                    className="btn btn-secondary"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      padding: "0.6rem 1rem",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      borderRadius: "10px",
                    }}
                  >
                    View Full Profile <ArrowRight size={15} />
                  </Link>
                </div>
              )}
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
                  <Link href="/dashboard/profile#digilocker-section" className="btn-checklist-action completed" style={{ textDecoration: "none" }}>
                    Verified ✓
                  </Link>
                ) : (
                  <a href="/api/digilocker/authorize" className="btn-checklist-action">
                    Verify
                  </a>
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
                  <Link href="/dashboard/profile#employment-section" className="btn-checklist-action completed" style={{ textDecoration: "none" }}>
                    View in Profile →
                  </Link>
                ) : (
                  <button type="button" onClick={() => openDrawer("employment")} className="btn-checklist-action">
                    Add Details
                  </button>
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
                  <Link href="/dashboard/profile#education-section" className="btn-checklist-action completed" style={{ textDecoration: "none" }}>
                    View in Profile →
                  </Link>
                ) : (
                  <button type="button" onClick={() => openDrawer("education")} className="btn-checklist-action">
                    Add Details
                  </button>
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
                  <Link href="/dashboard/profile#skills-section" className="btn-checklist-action completed" style={{ textDecoration: "none" }}>
                    View in Profile →
                  </Link>
                ) : (
                  <button type="button" onClick={() => openDrawer("skills")} className="btn-checklist-action">
                    Add Details
                  </button>
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
                  <Link href="/dashboard/profile#resume-section" className="btn-checklist-action completed" style={{ textDecoration: "none" }}>
                    View in Profile →
                  </Link>
                ) : (
                  <button type="button" onClick={() => openDrawer("resume")} className="btn-checklist-action">
                    Upload CV
                  </button>
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
              <span>Full Profile Settings</span>
            </Link>
            {hasDigiLocker ? (
              <Link href="/dashboard/profile#digilocker-section" className="quick-action-card digilocker-quick-action">
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

      {/* ── In-Place Edit Drawer ── */}
      <ProfileEditDrawer
        isOpen={activeDrawer !== null}
        onClose={closeDrawer}
        title={drawerTitle}
        icon={drawerIcon}
        footer={
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", width: "100%" }}>
            <button type="button" className="btn btn-secondary" onClick={closeDrawer} disabled={savingDrawer}>
              Cancel
            </button>
            {activeDrawer === "skills" && (
              <button type="button" className="btn btn-primary" onClick={handleSaveSkills} disabled={savingDrawer}>
                {savingDrawer ? "Saving..." : "Save Skills"}
              </button>
            )}
            {activeDrawer === "employment" && (
              <button type="button" className="btn btn-primary" onClick={handleSaveEmployment} disabled={savingDrawer}>
                {savingDrawer ? "Saving..." : "Save Employment"}
              </button>
            )}
            {activeDrawer === "education" && (
              <button type="button" className="btn btn-primary" onClick={handleSaveEducation} disabled={savingDrawer}>
                {savingDrawer ? "Saving..." : "Save Education"}
              </button>
            )}
            {activeDrawer === "resume" && (
              <button type="button" className="btn btn-primary" onClick={handleUploadResume} disabled={savingDrawer || !resumeFile}>
                {savingDrawer ? "Uploading..." : "Upload Resume"}
              </button>
            )}
          </div>
        }
      >
        {drawerError && (
          <div className="inline-alert inline-alert-danger" style={{ marginBottom: "1rem" }}>
            {drawerError}
          </div>
        )}

        {/* ── Skills Drawer Content ── */}
        {activeDrawer === "skills" && (
          <div className="drawer-form-grid">
            <div>
              <label className="drawer-field-label" htmlFor="dashboard-skills-input">
                Skills (separated by commas)
              </label>
              <textarea
                id="dashboard-skills-input"
                className="drawer-field-input drawer-field-textarea"
                placeholder="e.g. React.js, Node.js, TypeScript, SQL, Project Management, Communication"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                rows={4}
              />
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", margin: 0 }}>
              Enter your professional competencies, technical tools, frameworks, and core skills separated by commas.
            </p>
          </div>
        )}

        {/* ── Employment Drawer Content ── */}
        {activeDrawer === "employment" && (
          <div className="drawer-form-grid">
            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Company Name *</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. Acme Corp"
                  value={employmentForm.companyName}
                  onChange={(e) => setEmploymentForm((prev) => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">Designation / Role *</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. Software Engineer"
                  value={employmentForm.designation}
                  onChange={(e) => setEmploymentForm((prev) => ({ ...prev, designation: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">City</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. Mumbai"
                  value={employmentForm.city}
                  onChange={(e) => setEmploymentForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">State</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. Maharashtra"
                  value={employmentForm.state}
                  onChange={(e) => setEmploymentForm((prev) => ({ ...prev, state: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Country</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. India"
                  value={employmentForm.country}
                  onChange={(e) => setEmploymentForm((prev) => ({ ...prev, country: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">Employment Type</label>
                <select
                  className="drawer-field-input"
                  value={employmentForm.employmentType}
                  onChange={(e) => setEmploymentForm((prev) => ({ ...prev, employmentType: e.target.value }))}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Start Date</label>
                <input
                  className="drawer-field-input"
                  type="date"
                  value={employmentForm.startDate}
                  onChange={(e) => setEmploymentForm((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">End Date</label>
                <input
                  className="drawer-field-input"
                  type="date"
                  value={employmentForm.endDate}
                  min={employmentForm.startDate || undefined}
                  disabled={employmentForm.currentlyWorking}
                  onChange={(e) => setEmploymentForm((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            <label className="drawer-field-checkbox-label">
              <input
                type="checkbox"
                checked={employmentForm.currentlyWorking}
                onChange={(e) => setEmploymentForm((prev) => ({ ...prev, currentlyWorking: e.target.checked }))}
              />
              Currently working in this role
            </label>

            <div>
              <label className="drawer-field-label">Role Description (Optional)</label>
              <textarea
                className="drawer-field-input drawer-field-textarea"
                placeholder="Briefly describe your responsibilities and achievements..."
                value={employmentForm.description}
                onChange={(e) => setEmploymentForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* ── Education Drawer Content ── */}
        {activeDrawer === "education" && (
          <div className="drawer-form-grid">
            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Education Level</label>
                <select
                  className="drawer-field-input"
                  value={educationForm.level}
                  onChange={(e) => setEducationForm((prev) => ({ ...prev, level: e.target.value }))}
                >
                  <option value="High School">High School / Secondary</option>
                  <option value="Diploma">Diploma / Polytechnic</option>
                  <option value="Bachelor's Degree">Bachelor&apos;s Degree</option>
                  <option value="Master's Degree">Master&apos;s Degree</option>
                  <option value="Doctorate / PhD">Doctorate / PhD</option>
                  <option value="Certification">Professional Certification</option>
                </select>
              </div>
              <div>
                <label className="drawer-field-label">Institution / University *</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. University of Delhi"
                  value={educationForm.institution}
                  onChange={(e) => setEducationForm((prev) => ({ ...prev, institution: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Degree / Course *</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. B.Tech, B.Sc, B.Com, MBA"
                  value={educationForm.degree}
                  onChange={(e) => setEducationForm((prev) => ({ ...prev, degree: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">Field of Study</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. Computer Science, Marketing"
                  value={educationForm.fieldOfStudy}
                  onChange={(e) => setEducationForm((prev) => ({ ...prev, fieldOfStudy: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Start Year</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. 2020"
                  value={educationForm.startYear}
                  onChange={(e) => setEducationForm((prev) => ({ ...prev, startYear: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">End Year / Expected</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. 2024"
                  value={educationForm.endYear}
                  onChange={(e) => setEducationForm((prev) => ({ ...prev, endYear: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">City</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. New Delhi"
                  value={educationForm.city}
                  onChange={(e) => setEducationForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">Grade / GPA / Percentage</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. 8.5 CGPA, 85%, First Class"
                  value={educationForm.grade}
                  onChange={(e) => setEducationForm((prev) => ({ ...prev, grade: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Resume / CV Drawer Content ── */}
        {activeDrawer === "resume" && (
          <div className="drawer-form-grid">
            <input
              type="file"
              ref={resumeInputRef}
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setResumeFile(file);
              }}
            />

            <div
              className={`resume-dropzone ${resumeDragOver ? "dragover" : ""}`}
              style={{
                border: "2px dashed var(--brand)",
                borderRadius: "16px",
                padding: "2rem 1.5rem",
                textAlign: "center",
                background: "var(--bg-glass-soft)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => resumeInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setResumeDragOver(true);
              }}
              onDragLeave={() => setResumeDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setResumeDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) setResumeFile(file);
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem", color: "var(--brand)" }}>
                <UploadCloud size={38} />
              </div>

              {resumeFile ? (
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--brand)", margin: "0 0 0.25rem 0" }}>
                    ✓ Selected: {resumeFile.name}
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", margin: 0 }}>
                    {(resumeFile.size / 1024).toFixed(1)} KB • Click or drag to choose a different file
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontWeight: 600, fontSize: "0.92rem", margin: "0 0 0.25rem 0", color: "var(--ink-main)" }}>
                    Click to browse or drag and drop your resume
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", margin: 0 }}>
                    Supports PDF, DOC, DOCX, PNG, JPG (Max 10MB)
                  </p>
                </div>
              )}
            </div>

            <div style={{ background: "var(--bg-glass-card)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-soft)" }}>
              <h5 style={{ margin: "0 0 0.4rem 0", fontSize: "0.85rem", fontWeight: 700, color: "var(--ink-main)" }}>
                Why upload your resume?
              </h5>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--ink-soft)", lineHeight: 1.5 }}>
                Your resume is shared with the Cluso HR and Onboarding teams for role verification, skill matching, and background check preparation.
              </p>
            </div>
          </div>
        )}
      </ProfileEditDrawer>
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
