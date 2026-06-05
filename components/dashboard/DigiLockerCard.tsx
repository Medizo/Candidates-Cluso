"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  FileText,
} from "lucide-react";

type DigiLockerDocument = {
  name: string;
  doctype: string;
  description: string;
  issuer: string;
  issuerId: string;
  uri: string;
  date: string;
};

type DigiLockerProfile = {
  verified: boolean;
  name: string;
  dob: string;
  gender: string;
  email: string;
  mobile: string;
  maskedAadhaar: string;
  digilockerid: string;
  referenceKey: string;
  eaadhaar: string;
  photo: string;
  panNumber: string;
  drivingLicence: string;
  preferredUsername: string;
  documents: DigiLockerDocument[];
  linkedAt: string;
};

function maskMobile(mobile: string): string {
  if (!mobile) return "";
  const cleaned = mobile.trim();
  const digitMatches = cleaned.match(/\d/g);
  if (digitMatches && digitMatches.length >= 10) {
    const last10StartIndex = digitMatches.length - 10;
    let digitIndex = 0;
    let maskedDigits = 0;
    return cleaned.split("").map((char) => {
      if (/\d/.test(char)) {
        const isPartofLast10 = digitIndex >= last10StartIndex;
        digitIndex++;
        if (isPartofLast10 && maskedDigits < 6) {
          maskedDigits++;
          return "*";
        }
      }
      return char;
    }).join("");
  }
  return cleaned.replace(/^.{6}/, "******");
}

function maskDOB(dob: string): string {
  if (!dob) return "";
  const cleaned = dob.trim();
  const yearMatch = cleaned.match(/\b\d{4}\b/);
  if (yearMatch) {
    const year = yearMatch[0];
    const yearIndex = cleaned.indexOf(year);
    return cleaned.split("").map((char, idx) => {
      if (/\d/.test(char) && (idx < yearIndex || idx >= yearIndex + 4)) {
        return "*";
      }
      return char;
    }).join("");
  }
  let count = 0;
  return cleaned.split("").map((char) => {
    if (/\d/.test(char) && count < 4) {
      count++;
      return "*";
    }
    return char;
  }).join("");
}

export function DigiLockerCard() {
  const [profile, setProfile] = useState<DigiLockerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const res = await fetch("/api/digilocker/user");
      const data = await res.json();
      if (data.linked && data.profile) {
        setProfile(data.profile);
      }
    } catch (err) {
      console.error("Failed to fetch DigiLocker profile:", err);
    } finally {
      setLoading(false);
    }
  }



  if (loading) {
    return null;
  }

  if (!profile) {
    return null;
  }

  /* Build field rows — only show fields that have data */
  const personalFields: { label: string; value: string }[] = [];
  if (profile.name) personalFields.push({ label: "Full Name", value: profile.name });
  if (profile.dob) personalFields.push({ label: "Date of Birth", value: maskDOB(profile.dob) });
  if (profile.gender) {
    const genderMap: Record<string, string> = { M: "Male", F: "Female", O: "Other" };
    personalFields.push({ label: "Gender", value: genderMap[profile.gender] || profile.gender });
  }
  if (profile.email) personalFields.push({ label: "Email", value: profile.email });
  if (profile.mobile) personalFields.push({ label: "Mobile", value: maskMobile(profile.mobile) });
  if (profile.maskedAadhaar) personalFields.push({ label: "Aadhaar", value: profile.maskedAadhaar });
  if (profile.eaadhaar) personalFields.push({ label: "e-Aadhaar", value: profile.eaadhaar === "Y" ? "Available" : profile.eaadhaar });

  return (
    <div style={{ padding: "1rem 1.25rem" }}>


      {/* Profile photo + name header */}
      {(profile.photo || profile.name) && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          {profile.photo && (
            <div className="digilocker-photo-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.photo.startsWith("data:") ? profile.photo : `data:image/jpeg;base64,${profile.photo}`}
                  alt="DigiLocker Photo"
                  className="digilocker-photo"
                />
              </div>
            )}
            {profile.name && (
              <div>
                <div style={{ fontSize: "1.15rem", fontWeight: 600, color: "#1f2937" }}>{profile.name}</div>
              </div>
            )}
          </div>
        )}

        {/* Personal Details Table */}
        <div>
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", fontWeight: 600, color: "#034EA2", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Personal Details
          </h4>
          <table className="digilocker-table">
            <tbody>
              {personalFields.map((field) => (
                <tr key={field.label}>
                  <td className="digilocker-table-label">{field.label}</td>
                  <td className="digilocker-table-value">{field.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Issued Documents Table */}
        {profile.documents && profile.documents.length > 0 && (
          <div>
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", fontWeight: 600, color: "#034EA2", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <FileText size={15} />
              Issued Documents ({profile.documents.length})
            </h4>
            <table className="digilocker-table">
              <thead>
                <tr>
                  <th className="digilocker-table-th">Document</th>
                  <th className="digilocker-table-th">Type</th>
                  <th className="digilocker-table-th">Issuer</th>
                  <th className="digilocker-table-th">Date</th>
                </tr>
              </thead>
              <tbody>
                {profile.documents.map((doc, idx) => (
                  <tr key={`doc-${idx}`}>
                    <td className="digilocker-table-value" style={{ fontWeight: 500 }}>{doc.name || doc.description}</td>
                    <td className="digilocker-table-value">
                      <span className="digilocker-doctype-badge">{doc.doctype}</span>
                    </td>
                    <td className="digilocker-table-value">{doc.issuer}</td>
                    <td className="digilocker-table-value">{doc.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Linked date */}
        <div style={{ marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.5rem" }}>
          <span className="digilocker-linked-time">
            Linked on {new Date(profile.linkedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
    </div>
  );
}

/**
 * Hook to check DigiLocker link status.
 */
export function useDigiLockerStatus() {
  const [linked, setLinked] = useState(false);
  const [profile, setProfile] = useState<DigiLockerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/digilocker/user");
        const data = await res.json();
        if (data.linked && data.profile) {
          setLinked(true);
          setProfile(data.profile);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { linked, profile, loading };
}
