"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  GraduationCap,
  KeyRound,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Timer,
  ArrowLeft,
  UserRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { PortalFrame } from "@/components/dashboard/PortalFrame";
import { ProfileEditDrawer } from "@/components/dashboard/ProfileEditDrawer";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { getAlertTone } from "@/lib/alerts";
import { usePortalSession } from "@/lib/hooks/usePortalSession";
import {
  CandidateEducationRecord,
  CandidateEmploymentRecord,
  CandidateProfile,
} from "@/lib/types";

/* ── helpers ── */

function createEmploymentRecord(): CandidateEmploymentRecord {
  return {
    companyName: "",
    designation: "",
    city: "",
    state: "",
    country: "",
    startDate: "",
    endDate: "",
    currentlyWorking: false,
    employmentType: "",
    description: "",
  };
}

function createEducationRecord(): CandidateEducationRecord {
  return {
    level: "",
    institution: "",
    degree: "",
    fieldOfStudy: "",
    city: "",
    state: "",
    country: "",
    startYear: "",
    endYear: "",
    educationType: "",
    grade: "",
  };
}

const EMPTY_PROFILE: CandidateProfile = {
  keySkills: [],
  employment: [],
  education: [],
};

type DrawerSection =
  | null
  | "password"
  | "skills"
  | { kind: "employment"; index: number | "new" }
  | { kind: "education"; index: number | "new" };

const QUICK_LINKS = [
  { id: "digilocker", label: "DigiLocker", icon: ShieldCheck },
  { id: "password", label: "Password", icon: KeyRound },
  { id: "skills", label: "Key Skills", icon: UserRound },
  { id: "employment", label: "Employment", icon: BriefcaseBusiness },
  { id: "education", label: "Education", icon: GraduationCap },
] as const;

/* ── page ── */

import Image from "next/image";
import { DigiLockerCard, useDigiLockerStatus } from "@/components/dashboard/DigiLockerCard";

export default function CandidateProfilePage() {
  const { me, loading, logout, refreshMe } = usePortalSession();
  const { linked: digiLinked, loading: digiLoading } = useDigiLockerStatus();

  /* password state */
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [highlightPasswordSection, setHighlightPasswordSection] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  /* OTP state for password change */
  const [pwOtpStep, setPwOtpStep] = useState<"idle" | "sending" | "sent">("idle");
  const [pwOtpDigits, setPwOtpDigits] = useState(["" , "", "", "", "", ""]);
  const [pwOtpCountdown, setPwOtpCountdown] = useState(0);
  const [pwOtpSending, setPwOtpSending] = useState(false);
  const [pwOtpMessage, setPwOtpMessage] = useState("");
  const pwOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* profile state */
  const [profile, setProfile] = useState<CandidateProfile>(EMPTY_PROFILE);
  const [skillsInput, setSkillsInput] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  /* drawer state */
  const [drawerSection, setDrawerSection] = useState<DrawerSection>(null);
  const [editingEmployment, setEditingEmployment] = useState<CandidateEmploymentRecord>(createEmploymentRecord());
  const [editingEmploymentIndex, setEditingEmploymentIndex] = useState<number | "new">("new");
  const [editingEducation, setEditingEducation] = useState<CandidateEducationRecord>(createEducationRecord());
  const [editingEducationIndex, setEditingEducationIndex] = useState<number | "new">("new");

  /* load profile */
  useEffect(() => {
    if (!me) {
      return;
    }

    let active = true;
    (async () => {
      setProfileLoading(true);
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load profile.");
        }

        const data = (await response.json()) as { profile?: CandidateProfile };
        if (!active) {
          return;
        }

        const nextProfile = data.profile ?? EMPTY_PROFILE;
        setProfile(nextProfile);
        setSkillsInput(nextProfile.keySkills.join(", "));
      } catch {
        if (!active) {
          return;
        }
        setProfile(EMPTY_PROFILE);
        setSkillsInput("");
        setProfileMessage("Could not load profile details.");
      } finally {
        if (active) {
          setProfileLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [me]);

  /* password section auto-focus */
  useEffect(() => {
    if (loading || profileLoading) {
      return;
    }

    const shouldFocusPasswordSection =
      Boolean(me?.mustChangePassword) ||
      new URLSearchParams(window.location.search).get("focus") === "password-change";

    if (!shouldFocusPasswordSection) {
      return;
    }

    setHighlightPasswordSection(true);

    const timer = window.setTimeout(() => {
      const passwordSection = document.getElementById("password-section");
      if (passwordSection) {
        passwordSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setDrawerSection("password");
    }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loading, profileLoading, me?.mustChangePassword]);

  /* OTP countdown timer */
  useEffect(() => {
    if (pwOtpCountdown <= 0) return;
    const t = setInterval(() => {
      setPwOtpCountdown((p) => {
        if (p <= 1) { clearInterval(t); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pwOtpCountdown]);

  /* OTP digit handlers for password change */
  const handlePwOtpChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, "").slice(-1);
      const next = [...pwOtpDigits];
      next[index] = digit;
      setPwOtpDigits(next);
      setPasswordMessage("");
      if (digit && index < 5) pwOtpRefs.current[index + 1]?.focus();
    },
    [pwOtpDigits],
  );

  const handlePwOtpKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !pwOtpDigits[index] && index > 0) {
        pwOtpRefs.current[index - 1]?.focus();
      }
    },
    [pwOtpDigits],
  );

  const handlePwOtpPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
      if (!pasted) return;
      const next = ["", "", "", "", "", ""];
      for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
      setPwOtpDigits(next);
      pwOtpRefs.current[Math.min(pasted.length, 5)]?.focus();
    },
    [],
  );

  if (loading || !me || profileLoading) {
    return (
      <LoadingScreen
        title="Loading profile..."
        subtitle="Preparing your personal details"
      />
    );
  }

  /* ── drawer open helpers ── */

  function openPasswordDrawer() {
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setPasswordMessage("");
    setPwOtpStep("idle");
    setPwOtpDigits(["", "", "", "", "", ""]);
    setPwOtpCountdown(0);
    setPwOtpSending(false);
    setPwOtpMessage("");
    setDrawerSection("password");
    setShowPasswordFields(false);
  }

  function openSkillsDrawer() {
    setDrawerSection("skills");
  }

  function openEmploymentDrawer(index: number | "new") {
    if (index === "new") {
      setEditingEmployment(createEmploymentRecord());
    } else {
      setEditingEmployment({ ...profile.employment[index] });
    }
    setEditingEmploymentIndex(index);
    setDrawerSection({ kind: "employment", index });
  }

  function openEducationDrawer(index: number | "new") {
    if (index === "new") {
      setEditingEducation(createEducationRecord());
    } else {
      setEditingEducation({ ...profile.education[index] });
    }
    setEditingEducationIndex(index);
    setDrawerSection({ kind: "education", index });
  }

  function closeDrawer() {
    setDrawerSection(null);
  }

  /* ── save handlers ── */

  /* Send OTP for password change */
  async function sendPasswordOtp() {
    if (!me?.email) return;
    setPwOtpSending(true);
    setPwOtpMessage("");
    setPasswordMessage("");

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: me.email }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setPwOtpMessage(data.error || "Failed to send OTP. Please try again.");
        return;
      }

      setPwOtpStep("sent");
      setPwOtpDigits(["", "", "", "", "", ""]);
      setPwOtpCountdown(300);
      setPwOtpMessage("Verification code sent to your email.");
      setTimeout(() => pwOtpRefs.current[0]?.focus(), 100);
    } catch {
      setPwOtpMessage("Could not reach server. Please try again.");
    } finally {
      setPwOtpSending(false);
    }
  }

  function formatPwCountdown(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  /* Submit password change with OTP */
  async function changePasswordWithOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordMessage("");

    const otp = pwOtpDigits.join("");
    if (otp.length !== 6) {
      setPasswordMessage("Please enter the complete 6-digit code.");
      return;
    }

    const isPasswordFilled = (!me?.mustChangePassword || showPasswordFields) && (newPassword.length > 0 || confirmPassword.length > 0);
    if (isPasswordFilled) {
      if (newPassword !== confirmPassword) {
        setPasswordMessage("New password and confirm password must match.");
        return;
      }
      if (newPassword.length < 6) {
        setPasswordMessage("Password must be at least 6 characters long.");
        return;
      }
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp, newPassword: isPasswordFilled ? newPassword : "" }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        setPasswordMessage(data.error ?? "Could not verify.");
        // Clear OTP digits on failure so user can re-enter
        setPwOtpDigits(["", "", "", "", "", ""]);
        setTimeout(() => pwOtpRefs.current[0]?.focus(), 50);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setPwOtpDigits(["", "", "", "", "", ""]);
      setShowPasswordFields(false);
      await refreshMe(true);
      setPasswordMessage(data.message ?? "Verification successful.");
      setTimeout(() => closeDrawer(), 1200);
    } catch {
      setPasswordMessage("Could not reach server. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function saveProfile(updatedProfile: CandidateProfile) {
    setProfileMessage("");
    setProfileSaving(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile),
      });

      const data = (await response.json()) as { message?: string; error?: string; profile?: CandidateProfile };

      if (!response.ok) {
        setProfileMessage(data.error ?? "Could not update profile.");
        return false;
      }

      const savedProfile = data.profile ?? updatedProfile;
      setProfile(savedProfile);
      setSkillsInput(savedProfile.keySkills.join(", "));
      setProfileMessage(data.message ?? "Profile updated successfully.");
      return true;
    } catch {
      setProfileMessage("Could not update profile.");
      return false;
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveSkills() {
    const keySkills = Array.from(
      new Set(
        skillsInput
          .split(",")
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0),
      ),
    );

    const success = await saveProfile({ ...profile, keySkills });
    if (success) {
      setTimeout(() => closeDrawer(), 800);
    }
  }

  async function saveEmploymentEntry() {
    let nextEmployment: CandidateEmploymentRecord[];

    if (editingEmploymentIndex === "new") {
      nextEmployment = [...profile.employment, editingEmployment];
    } else {
      nextEmployment = profile.employment.map((entry, idx) =>
        idx === editingEmploymentIndex ? editingEmployment : entry,
      );
    }

    const success = await saveProfile({ ...profile, employment: nextEmployment });
    if (success) {
      setTimeout(() => closeDrawer(), 800);
    }
  }

  async function removeEmploymentEntry(index: number) {
    const nextEmployment = profile.employment.filter((_, idx) => idx !== index);
    await saveProfile({ ...profile, employment: nextEmployment });
  }

  async function saveEducationEntry() {
    let nextEducation: CandidateEducationRecord[];

    if (editingEducationIndex === "new") {
      nextEducation = [...profile.education, editingEducation];
    } else {
      nextEducation = profile.education.map((entry, idx) =>
        idx === editingEducationIndex ? editingEducation : entry,
      );
    }

    const success = await saveProfile({ ...profile, education: nextEducation });
    if (success) {
      setTimeout(() => closeDrawer(), 800);
    }
  }

  async function removeEducationEntry(index: number) {
    const nextEducation = profile.education.filter((_, idx) => idx !== index);
    await saveProfile({ ...profile, education: nextEducation });
  }

  /* ── quick-link scroll ── */

  function scrollToSection(id: string) {
    const el = document.getElementById(`${id}-section`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /* ── determine drawer open state + title ── */

  const isDrawerOpen = drawerSection !== null;
  let drawerTitle = "";
  let drawerIcon = null as React.ReactNode;

  if (drawerSection === "password") {
    drawerTitle = me.mustChangePassword ? "Verify Account" : "Change Password";
    drawerIcon = <KeyRound size={18} />;
  } else if (drawerSection === "skills") {
    drawerTitle = "Edit Key Skills";
    drawerIcon = <UserRound size={18} />;
  } else if (drawerSection !== null && typeof drawerSection === "object") {
    if (drawerSection.kind === "employment") {
      drawerTitle = drawerSection.index === "new" ? "Add Employment" : "Edit Employment";
      drawerIcon = <BriefcaseBusiness size={18} />;
    } else {
      drawerTitle = drawerSection.index === "new" ? "Add Education" : "Edit Education";
      drawerIcon = <GraduationCap size={18} />;
    }
  }

  /* ── format helpers ── */

  function formatDateRange(start: string, end: string, currentlyWorking?: boolean) {
    const parts: string[] = [];
    if (start) {
      parts.push(new Date(start).toLocaleDateString("en-US", { month: "short", year: "numeric" }));
    }
    if (currentlyWorking) {
      parts.push("Present");
    } else if (end) {
      parts.push(new Date(end).toLocaleDateString("en-US", { month: "short", year: "numeric" }));
    }
    return parts.join(" – ");
  }

  function formatLocation(city: string, state: string, country: string) {
    return [city, state, country].filter(Boolean).join(", ");
  }

  /* ── render ── */

  return (
    <PortalFrame
      me={me}
      onLogout={logout}
      title="Profile"
      subtitle="Manage your profile, work experience, education, and account security."
    >
      {profileMessage ? (
        <p className={`inline-alert ${getAlertTone(profileMessage)}`} style={{ marginBottom: "1rem" }}>
          {profileMessage}
        </p>
      ) : null}

      <div className="profile-layout">
        {/* ── Quick Links Sidebar ── */}
        <aside className="profile-quick-links">
          <div className="profile-quick-links-title">Quick Links</div>
          {QUICK_LINKS.map((link) => {
            const hasAdd = link.id === "employment" || link.id === "education";
            return (
              <div
                key={link.id}
                className="profile-quick-link"
                role="button"
                tabIndex={0}
                onClick={() => scrollToSection(link.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") scrollToSection(link.id); }}
              >
                <span>{link.label}</span>
                {hasAdd ? (
                  <button
                    type="button"
                    className="profile-quick-link-add"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (link.id === "employment") {
                        openEmploymentDrawer("new");
                      } else {
                        openEducationDrawer("new");
                      }
                    }}
                  >
                    Add
                  </button>
                ) : null}
              </div>
            );
          })}
        </aside>

        {/* ── Summary Cards ── */}
        <div className="profile-cards-column">
          {/* DigiLocker Verification Section */}
          <section id="digilocker-section" className="profile-section-card">
            <div className="profile-section-header">
              <h3 className="profile-section-title">
                <ShieldCheck size={18} />
                DigiLocker Verification
                {!digiLoading && (
                  digiLinked ? (
                    <span className="digilocker-verified-badge">✓ Verified</span>
                  ) : (
                    <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#dc2626", background: "#fef2f2", padding: "0.2rem 0.6rem", borderRadius: "999px", border: "1px solid #fecaca" }}>
                      Not Verified
                    </span>
                  )
                )}
              </h3>
            </div>
            {!digiLoading && (
              digiLinked ? (
                <DigiLockerCard />
              ) : (
                <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", textAlign: "center" }}>
                  <p className="profile-empty-state" style={{ margin: 0 }}>
                    Verify your identity using DigiLocker to auto-fill your personal details from government records.
                  </p>
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
                </div>
              )
            )}
          </section>

          {/* Password Card */}
          <section
            id="password-section"
            className={`profile-section-card ${highlightPasswordSection ? "highlight-password" : ""}`}
          >
            <div className="profile-section-header">
              <h3 className="profile-section-title">
                <KeyRound size={18} />
                Change Password
              </h3>
              <div className="profile-section-actions">
                <button
                  type="button"
                  className="profile-action-btn"
                  onClick={openPasswordDrawer}
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </div>
            </div>
            {me.mustChangePassword ? (
              <p style={{
                margin: 0,
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #fde68a",
                background: "#fefce8",
                color: "#92400e",
                fontSize: "0.86rem",
                fontWeight: 500,
              }}>
                This is your first login. Please verify your email with a verification code to continue.
              </p>
            ) : (
              <p className="profile-empty-state">
                Use a strong password and avoid reusing old credentials.
              </p>
            )}
          </section>

          {/* Key Skills Card */}
          <section id="skills-section" className="profile-section-card">
            <div className="profile-section-header">
              <h3 className="profile-section-title">
                <UserRound size={18} />
                Key Skills
              </h3>
              <div className="profile-section-actions">
                <button
                  type="button"
                  className="profile-action-btn"
                  onClick={openSkillsDrawer}
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </div>
            </div>
            {profile.keySkills.length === 0 ? (
              <p className="profile-empty-state">No skills added yet. Click Edit to add your core skills.</p>
            ) : (
              <div className="profile-skills-wrap">
                {profile.keySkills.map((skill) => (
                  <span key={skill} className="profile-skill-chip">{skill}</span>
                ))}
              </div>
            )}
          </section>

          {/* Employment Card */}
          <section id="employment-section" className="profile-section-card">
            <div className="profile-section-header">
              <h3 className="profile-section-title">
                <BriefcaseBusiness size={18} />
                Employment
              </h3>
              <div className="profile-section-actions">
                <button
                  type="button"
                  className="profile-action-btn profile-action-btn-add"
                  onClick={() => openEmploymentDrawer("new")}
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
            {profile.employment.length === 0 ? (
              <p className="profile-empty-state">No employment records added yet.</p>
            ) : (
              <div>
                {profile.employment.map((entry, index) => (
                  <div key={`emp-${index}`} className="profile-entry-summary">
                    <div className="profile-entry-info">
                      <span className="profile-entry-primary">
                        {entry.designation || "Untitled Role"} at {entry.companyName || "Unknown Company"}
                      </span>
                      <span className="profile-entry-secondary">
                        {formatLocation(entry.city, entry.state, entry.country)}
                        {entry.employmentType ? ` · ${entry.employmentType}` : ""}
                      </span>
                      <span className="profile-entry-meta">
                        {formatDateRange(entry.startDate, entry.endDate, entry.currentlyWorking)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        type="button"
                        className="profile-entry-edit-btn"
                        onClick={() => openEmploymentDrawer(index)}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Education Card */}
          <section id="education-section" className="profile-section-card">
            <div className="profile-section-header">
              <h3 className="profile-section-title">
                <GraduationCap size={18} />
                Education
              </h3>
              <div className="profile-section-actions">
                <button
                  type="button"
                  className="profile-action-btn profile-action-btn-add"
                  onClick={() => openEducationDrawer("new")}
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
            {profile.education.length === 0 ? (
              <p className="profile-empty-state">No education records added yet.</p>
            ) : (
              <div>
                {profile.education.map((entry, index) => (
                  <div key={`edu-${index}`} className="profile-entry-summary">
                    <div className="profile-entry-info">
                      <span className="profile-entry-primary">
                        {entry.degree || entry.level || "Untitled"}{entry.fieldOfStudy ? ` in ${entry.fieldOfStudy}` : ""}
                      </span>
                      <span className="profile-entry-secondary">
                        {entry.institution || "Unknown Institution"}
                        {entry.educationType ? ` · ${entry.educationType}` : ""}
                      </span>
                      <span className="profile-entry-meta">
                        {[entry.startYear, entry.endYear].filter(Boolean).join(" – ")}
                        {entry.grade ? ` · Grade: ${entry.grade}` : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        type="button"
                        className="profile-entry-edit-btn"
                        onClick={() => openEducationDrawer(index)}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ── Edit Drawer ── */}
      <ProfileEditDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={drawerTitle}
        icon={drawerIcon}
        footer={
          drawerSection === "password" ? undefined : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeDrawer}
                disabled={profileSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-blue"
                disabled={profileSaving}
                onClick={() => {
                  if (drawerSection === "skills") {
                    saveSkills();
                  } else if (typeof drawerSection === "object" && drawerSection?.kind === "employment") {
                    saveEmploymentEntry();
                  } else if (typeof drawerSection === "object" && drawerSection?.kind === "education") {
                    saveEducationEntry();
                  }
                }}
              >
                {profileSaving ? "Saving..." : "Save"}
              </button>
            </>
          )
        }
      >
        {/* Password Drawer with OTP */}
        {drawerSection === "password" ? (
          <div className="drawer-form-grid">
            {me.mustChangePassword ? (
              <p style={{
                margin: 0,
                padding: "0.6rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #fde68a",
                background: "#fefce8",
                color: "#92400e",
                fontSize: "0.86rem",
              }}>
                This is your first login. Please verify your email with a verification code to continue using the portal. Changing your password is optional.
              </p>
            ) : null}

            {/* Step 1: Send OTP */}
            {pwOtpStep === "idle" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.75rem", borderRadius: "10px",
                  background: "linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)",
                  border: "1px solid #d1fae5",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: "36px", height: "36px", borderRadius: "10px",
                    background: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
                    flexShrink: 0,
                  }}>
                    <ShieldCheck size={18} color="#fff" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>OTP Verification Required</p>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>A verification code will be sent to <strong>{me.email}</strong></p>
                  </div>
                </div>

                {pwOtpMessage && (
                  <p style={{
                    margin: 0, padding: "0.5rem 0.75rem", borderRadius: "8px",
                    borderLeft: "4px solid #ef4444", background: "#fef2f2",
                    color: "#991b1b", fontSize: "0.84rem", fontWeight: 500,
                  }}>{pwOtpMessage}</p>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.25rem" }}>
                  <button type="button" className="btn btn-secondary" onClick={closeDrawer}>Cancel</button>
                  <button
                    type="button"
                    className="btn btn-blue"
                    disabled={pwOtpSending}
                    onClick={sendPasswordOtp}
                    style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <Send size={15} />
                    {pwOtpSending ? "Sending..." : "Send Verification Code"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Enter OTP + New Password */}
            {pwOtpStep === "sent" && (
              <form onSubmit={changePasswordWithOtp} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Back link */}
                <button
                  type="button"
                  onClick={() => { setPwOtpStep("idle"); setPasswordMessage(""); setPwOtpDigits(["", "", "", "", "", ""]); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.35rem",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "0.82rem", color: "#64748b", fontWeight: 600,
                    padding: 0,
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </button>

                {/* OTP sent confirmation */}
                {pwOtpMessage && !passwordMessage && (
                  <p style={{
                    margin: 0, padding: "0.5rem 0.75rem", borderRadius: "8px",
                    borderLeft: "4px solid #10b981", background: "#f0fdf4",
                    color: "#065f46", fontSize: "0.84rem", fontWeight: 500,
                  }}>
                    {pwOtpMessage} — sent to <strong>{me.email}</strong>
                  </p>
                )}

                {/* OTP digit inputs */}
                <div>
                  <label className="drawer-field-label" style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <KeyRound size={15} /> Verification Code
                  </label>
                  <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                    {pwOtpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { pwOtpRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handlePwOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handlePwOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handlePwOtpPaste : undefined}
                        aria-label={`Digit ${index + 1}`}
                        style={{
                          width: "44px", height: "52px", textAlign: "center",
                          fontSize: "1.25rem", fontWeight: 800,
                          borderRadius: "10px",
                          border: digit ? "2px solid #3b82f6" : "2px solid #e2e8f0",
                          background: digit ? "#eff6ff" : "#f8fafc",
                          color: "#1e293b", outline: "none",
                          fontFamily: "'Consolas', 'Courier New', monospace",
                          transition: "border-color 0.2s, background 0.2s",
                        }}
                        onFocus={(e) => { e.target.style.borderColor = "#3b82f6"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"; }}
                        onBlur={(e) => { e.target.style.borderColor = digit ? "#3b82f6" : "#e2e8f0"; e.target.style.boxShadow = "none"; }}
                      />
                    ))}
                  </div>
                </div>

                {/* Countdown */}
                {pwOtpCountdown > 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem", fontSize: "0.82rem", color: "#64748b" }}>
                    <Timer size={14} color="#f59e0b" />
                    <span>Expires in <strong style={{ color: "#d97706", fontVariantNumeric: "tabular-nums" }}>{formatPwCountdown(pwOtpCountdown)}</strong></span>
                  </div>
                )}

                {/* Change Password toggle button */}
                {me.mustChangePassword && !showPasswordFields && (
                  <div style={{ display: "flex", justifyContent: "center", margin: "0.5rem 0" }}>
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        color: "#2563eb",
                        padding: "0.5rem 1.25rem",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "background 0.2s, border-color 0.2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#dbeafe"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#eff6ff"; }}
                    >
                      <KeyRound size={15} />
                      Change Password
                    </button>
                  </div>
                )}

                {/* New password fields */}
                {(!me.mustChangePassword || showPasswordFields) && (
                  <>
                    <div>
                      <label className="drawer-field-label" htmlFor="drawer-new-password">
                        New Password {me.mustChangePassword && <span style={{ fontWeight: "normal", color: "#64748b" }}>(optional)</span>}
                      </label>
                      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <input
                          id="drawer-new-password"
                          className="drawer-field-input"
                          style={{ paddingRight: "2.5rem", width: "100%" }}
                          type={showNewPassword ? "text" : "password"}
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required={!me.mustChangePassword}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          style={{
                            position: "absolute",
                            right: "0.75rem",
                            background: "none",
                            border: "none",
                            color: "var(--ink-soft)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          aria-label={showNewPassword ? "Hide password" : "Show password"}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="drawer-field-label" htmlFor="drawer-confirm-password">
                        Confirm New Password {me.mustChangePassword && <span style={{ fontWeight: "normal", color: "#64748b" }}>(optional)</span>}
                      </label>
                      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <input
                          id="drawer-confirm-password"
                          className="drawer-field-input"
                          style={{ paddingRight: "2.5rem", width: "100%" }}
                          type={showConfirmPassword ? "text" : "password"}
                          minLength={6}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required={!me.mustChangePassword}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          style={{
                            position: "absolute",
                            right: "0.75rem",
                            background: "none",
                            border: "none",
                            color: "var(--ink-soft)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {passwordMessage ? (
                  <p className={`inline-alert ${getAlertTone(passwordMessage)}`}>{passwordMessage}</p>
                ) : null}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", paddingTop: "0.25rem" }}>
                  {/* Resend */}
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    {pwOtpCountdown > 0 ? (
                      <span>Resend in {formatPwCountdown(pwOtpCountdown)}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={sendPasswordOtp}
                        disabled={pwOtpSending}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "#3b82f6", fontWeight: 600, fontSize: "0.82rem",
                          padding: 0, textDecoration: "underline",
                        }}
                      >
                        Resend Code
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button type="button" className="btn btn-secondary" onClick={closeDrawer}>Cancel</button>
                    <button
                      className="btn btn-blue"
                      type="submit"
                      disabled={changingPassword || pwOtpDigits.join("").length !== 6}
                    >
                      {changingPassword ? (
                        me.mustChangePassword && !((newPassword.length > 0 || confirmPassword.length > 0) && showPasswordFields)
                          ? "Verifying..."
                          : "Updating..."
                      ) : (
                        me.mustChangePassword
                          ? (((newPassword.length > 0 || confirmPassword.length > 0) && showPasswordFields) ? "Verify & Change Password" : "Verify Code")
                          : "Change Password"
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        ) : null}

        {/* Skills Drawer */}
        {drawerSection === "skills" ? (
          <div className="drawer-form-grid">
            <div>
              <label className="drawer-field-label" htmlFor="drawer-skills">
                Skills (comma-separated)
              </label>
              <textarea
                id="drawer-skills"
                className="drawer-field-input drawer-field-textarea"
                placeholder="React.js, Node.js, SQL, Python"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
              />
            </div>
            <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
              Enter your skills separated by commas. e.g. React.js, Node.js, Python
            </p>
          </div>
        ) : null}

        {/* Employment Drawer */}
        {typeof drawerSection === "object" && drawerSection?.kind === "employment" ? (
          <div className="drawer-form-grid">
            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Company Name</label>
                <input
                  className="drawer-field-input"
                  placeholder="Company Name"
                  value={editingEmployment.companyName}
                  onChange={(e) => setEditingEmployment((prev) => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">Designation</label>
                <input
                  className="drawer-field-input"
                  placeholder="Designation / Role"
                  value={editingEmployment.designation}
                  onChange={(e) => setEditingEmployment((prev) => ({ ...prev, designation: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">City</label>
                <input
                  className="drawer-field-input"
                  placeholder="City"
                  value={editingEmployment.city}
                  onChange={(e) => setEditingEmployment((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">State</label>
                <input
                  className="drawer-field-input"
                  placeholder="State"
                  value={editingEmployment.state}
                  onChange={(e) => setEditingEmployment((prev) => ({ ...prev, state: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Country</label>
                <input
                  className="drawer-field-input"
                  placeholder="Country"
                  value={editingEmployment.country}
                  onChange={(e) => setEditingEmployment((prev) => ({ ...prev, country: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">Employment Type</label>
                <input
                  className="drawer-field-input"
                  placeholder="Full time, Part time, Contract"
                  value={editingEmployment.employmentType}
                  onChange={(e) => setEditingEmployment((prev) => ({ ...prev, employmentType: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Start Date</label>
                <input
                  className="drawer-field-input"
                  type="date"
                  value={editingEmployment.startDate}
                  onChange={(e) => setEditingEmployment((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">End Date</label>
                <input
                  className="drawer-field-input"
                  type="date"
                  value={editingEmployment.endDate}
                  min={editingEmployment.startDate || undefined}
                  onChange={(e) => setEditingEmployment((prev) => ({ ...prev, endDate: e.target.value }))}
                  disabled={editingEmployment.currentlyWorking}
                />
              </div>
            </div>

            <label className="drawer-field-checkbox-label">
              <input
                type="checkbox"
                checked={editingEmployment.currentlyWorking}
                onChange={(e) => setEditingEmployment((prev) => ({ ...prev, currentlyWorking: e.target.checked }))}
              />
              Currently working here
            </label>

            <div>
              <label className="drawer-field-label">Description</label>
              <textarea
                className="drawer-field-input drawer-field-textarea"
                placeholder="Describe your role and responsibilities"
                value={editingEmployment.description}
                onChange={(e) => setEditingEmployment((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {editingEmploymentIndex !== "new" ? (
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: "#dc2626", fontSize: "0.84rem" }}
                  onClick={async () => {
                    if (typeof editingEmploymentIndex === "number") {
                      await removeEmploymentEntry(editingEmploymentIndex);
                      closeDrawer();
                    }
                  }}
                >
                  Remove this employment
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Education Drawer */}
        {typeof drawerSection === "object" && drawerSection?.kind === "education" ? (
          <div className="drawer-form-grid">
            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Level</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. Bachelor's, Master's"
                  value={editingEducation.level}
                  onChange={(e) => setEditingEducation((prev) => ({ ...prev, level: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">Institution</label>
                <input
                  className="drawer-field-input"
                  placeholder="University / College"
                  value={editingEducation.institution}
                  onChange={(e) => setEditingEducation((prev) => ({ ...prev, institution: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Degree</label>
                <input
                  className="drawer-field-input"
                  placeholder="B.Tech, M.Sc, etc."
                  value={editingEducation.degree}
                  onChange={(e) => setEditingEducation((prev) => ({ ...prev, degree: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">Field of Study</label>
                <input
                  className="drawer-field-input"
                  placeholder="Computer Science, Business, etc."
                  value={editingEducation.fieldOfStudy}
                  onChange={(e) => setEditingEducation((prev) => ({ ...prev, fieldOfStudy: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">City</label>
                <input
                  className="drawer-field-input"
                  placeholder="City"
                  value={editingEducation.city}
                  onChange={(e) => setEditingEducation((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">State</label>
                <input
                  className="drawer-field-input"
                  placeholder="State"
                  value={editingEducation.state}
                  onChange={(e) => setEditingEducation((prev) => ({ ...prev, state: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Country</label>
                <input
                  className="drawer-field-input"
                  placeholder="Country"
                  value={editingEducation.country}
                  onChange={(e) => setEditingEducation((prev) => ({ ...prev, country: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">Education Type</label>
                <input
                  className="drawer-field-input"
                  placeholder="Full time, Part time, Distance"
                  value={editingEducation.educationType}
                  onChange={(e) => setEditingEducation((prev) => ({ ...prev, educationType: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row">
              <div>
                <label className="drawer-field-label">Start Month</label>
                <input
                  className="drawer-field-input"
                  type="month"
                  value={editingEducation.startYear}
                  onChange={(e) => setEditingEducation((prev) => ({ ...prev, startYear: e.target.value }))}
                />
              </div>
              <div>
                <label className="drawer-field-label">End Month</label>
                <input
                  className="drawer-field-input"
                  type="month"
                  value={editingEducation.endYear}
                  min={editingEducation.startYear || undefined}
                  onChange={(e) => setEditingEducation((prev) => ({ ...prev, endYear: e.target.value }))}
                />
              </div>
            </div>

            <div className="drawer-form-row full">
              <div>
                <label className="drawer-field-label">Grade / Score</label>
                <input
                  className="drawer-field-input"
                  placeholder="e.g. 3.8 GPA, First Class"
                  value={editingEducation.grade}
                  onChange={(e) => setEditingEducation((prev) => ({ ...prev, grade: e.target.value }))}
                />
              </div>
            </div>

            {editingEducationIndex !== "new" ? (
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem" }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: "#dc2626", fontSize: "0.84rem" }}
                  onClick={async () => {
                    if (typeof editingEducationIndex === "number") {
                      await removeEducationEntry(editingEducationIndex);
                      closeDrawer();
                    }
                  }}
                >
                  Remove this education
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </ProfileEditDrawer>
    </PortalFrame>
  );
}
