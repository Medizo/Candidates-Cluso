"use client";

import { useEffect, useState, useMemo, Suspense, useRef } from "react";
import { usePortalSession } from "@/lib/hooks/usePortalSession";
import { PortalFrame } from "@/components/dashboard/PortalFrame";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { LOGO_BASE64 } from "@/lib/logo-base64";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import {
  Award,
  Search,
  Download,
  Calendar,
  Check,
  Star,
  Heart,
  Trophy,
  FileText,
  User,
  ShieldAlert,
  Eye,
  X,
  Share2,
  Copy,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

// Custom social media icons (lucide-react doesn't include brand icons)
const LinkedInIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const FacebookIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
  </svg>
);

// Types from admin portal
interface Certificate {
  id: string;
  companyName?: string;
  type: string;
  category?: string;
  recipientId?: string;
  recipientName: string;
  recipientEmail: string;
  recipientDesignation?: string;
  respondentName: string;
  respondentRole: string;
  respondentDepartment?: string;
  dateFrom?: string;
  dateTo?: string;
  remarks?: string;
  template: string;
  respondentSignature?: string;
  createdAt: string;
  createdBy?: string;
  shared?: boolean;
  sharedAt?: string;
}

const CERT_TYPES = [
  { key: "excellence", label: "Certificate of Excellence", icon: Star, color: "#f59e0b", desc: "Recognize outstanding performance and contributions" },
  { key: "completion", label: "Certificate of Completion", icon: Check, color: "#10b981", desc: "Certify successful completion of a program or tenure" },
  { key: "appreciation", label: "Certificate of Appreciation", icon: Heart, color: "#ec4899", desc: "Express gratitude for dedicated service and efforts" },
  { key: "achievement", label: "Certificate of Achievement", icon: Trophy, color: "#8b5cf6", desc: "Acknowledge a specific milestone or accomplishment" },
  { key: "relieving", label: "Relieving Letter", icon: FileText, color: "#3b82f6", desc: "Issue an official relieving letter for departing employees" },
];

const COMPLETION_CATEGORIES = [
  { key: "internship", label: "Internship Completion", desc: "For interns who completed their internship program" },
  { key: "employment", label: "Employment Completion", desc: "For employees completing their tenure" },
  { key: "course", label: "Course Completion", desc: "For completing a professional development course" },
  { key: "training", label: "Training Completion", desc: "For completing a specialized training program" },
  { key: "project", label: "Project Completion", desc: "For successfully delivering a project" },
];

function aOrAn(word?: string) {
  if (!word) return "a";
  const first = word.replace(/<[^>]*>/g, "").trim().charAt(0).toLowerCase();
  return "aeiou".includes(first) ? "an" : "a";
}

function formatDateDisplay(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function getCertTitle(type: string, category?: string) {
  const titles: Record<string, string> = {
    excellence: "Certificate of Excellence",
    completion: "Certificate of Completion",
    appreciation: "Certificate of Appreciation",
    achievement: "Certificate of Achievement",
    relieving: "Relieving Letter",
  };
  return titles[type] || "Certificate";
}

function getCopyTemplateText(cert: Certificate) {
  const title = getCertTitle(cert.type, cert.category);
  const company = cert.companyName || "Cluso Infolink";
  return `Thrilled to share my ${title} from ${company}! Very happy to be a part of this amazing organization and grateful for the growth opportunities. Looking forward to achieving more milestones ahead! 🚀🏆 #Growth #Career #Professional #${company.replace(/\s+/g, "")}`;
}

function generateCertBody({
  type,
  category,
  recipientName,
  recipientDesignation,
  respondentName,
  dateFrom,
  dateTo,
  remarks,
  companyName,
}: {
  type: string;
  category?: string;
  recipientName: string;
  recipientDesignation?: string;
  respondentName: string;
  dateFrom?: string;
  dateTo?: string;
  remarks?: string;
  companyName?: string;
}) {
  const name = recipientName || "[Recipient Name]";
  const designation = recipientDesignation || "[Designation]";
  const guide = respondentName || "[Respondent Name]";
  const fromDate = dateFrom ? formatDateDisplay(dateFrom) : "[Start Date]";
  const toDate = dateTo ? formatDateDisplay(dateTo) : "[End Date]";
  const qualities = remarks || "hardworking, diligent, and honest in performing their duties";
  const company = companyName || "Cluso Infolink";

  if (type === "excellence") {
    return `This is to certify that <strong>${name}</strong>, serving as ${aOrAn(designation)} <strong>${designation}</strong> at ${company}, has demonstrated exceptional performance, dedication, and outstanding contributions to the organization. ${name} has consistently exceeded expectations, shown remarkable initiative, and inspired excellence among peers.<br/><br/>The management extends its sincere appreciation for the exemplary work and unwavering commitment shown by ${name}. We recognize this achievement under the mentorship of <strong>${guide}</strong>.<br/><br/>We wish ${name} continued success and look forward to many more accomplishments.`;
  }

  if (type === "relieving") {
    return `This is to certify that <strong>${name}</strong> was employed at ${company} as ${aOrAn(designation)} <strong>${designation}</strong> from <strong>${fromDate}</strong> to <strong>${toDate}</strong>. ${name} has resigned from the services of the company and is officially relieved from all duties and responsibilities with effect from the close of business hours on <strong>${toDate}</strong>.<br/><br/>During their tenure with us, ${name} demonstrated professionalism, integrity, and a strong work ethic. They worked under the supervision of <strong>${guide}</strong> and were found to be ${qualities}.<br/><br/>We thank ${name} for their contributions and wish them the very best in all future professional endeavors.`;
  }

  if (type === "completion") {
    if (category === "internship") {
      return `This is to certify that <strong>${name}</strong> has successfully completed their Internship at ${company} as ${aOrAn(designation)} <strong>${designation}</strong> from <strong>${fromDate}</strong> to <strong>${toDate}</strong>.<br/><br/>During their internship, they interned under the guidance of <strong>${guide}</strong> and were found to be ${qualities}.<br/><br/>The management would like to thank ${name} for the contributions made to the organization and wishes them all the best in their future endeavors.`;
    }
    if (category === "employment") {
      return `This is to certify that <strong>${name}</strong> was employed at ${company} as ${aOrAn(designation)} <strong>${designation}</strong> from <strong>${fromDate}</strong> to <strong>${toDate}</strong>.<br/><br/>During their tenure with us, ${name} demonstrated professionalism, integrity, and a strong work ethic. They worked under the supervision of <strong>${guide}</strong> and were found to be ${qualities}.<br/><br/>We wish ${name} continued success in their career and thank them for their valuable contributions.`;
    }
    if (category === "course") {
      return `This is to certify that <strong>${name}</strong> has successfully completed the professional development course at ${company} from <strong>${fromDate}</strong> to <strong>${toDate}</strong>.<br/><br/>The course was conducted under the mentorship of <strong>${guide}</strong>. Throughout the program, ${name} demonstrated ${qualities} and successfully met all the requirements for course completion.<br/><br/>We congratulate ${name} on this accomplishment and wish them success in applying their newly acquired knowledge.`;
    }
    if (category === "training") {
      return `This is to certify that <strong>${name}</strong>, serving as ${aOrAn(designation)} <strong>${designation}</strong>, has successfully completed the specialized training program at ${company} from <strong>${fromDate}</strong> to <strong>${toDate}</strong>.<br/><br/>The training was conducted under the guidance of <strong>${guide}</strong>. During the program, ${name} exhibited ${qualities} and demonstrated strong aptitude in mastering the required skills.<br/><br/>The management congratulates ${name} on the successful completion of this training.`;
    }
    if (category === "project") {
      return `This is to certify that <strong>${name}</strong>, serving as ${aOrAn(designation)} <strong>${designation}</strong>, has successfully delivered and completed the assigned project at ${company} from <strong>${fromDate}</strong> to <strong>${toDate}</strong>.<br/><br/>The project was overseen by <strong>${guide}</strong>. Throughout the project lifecycle, ${name} demonstrated ${qualities} and played a pivotal role in its successful delivery.<br/><br/>The management extends its appreciation for the outstanding effort and dedication shown.`;
    }
    return `This is to certify that <strong>${name}</strong> has successfully completed the assigned program at ${company} from <strong>${fromDate}</strong> to <strong>${toDate}</strong> under the guidance of <strong>${guide}</strong>.<br/><br/>During the program, ${name} was found to be ${qualities}.<br/><br/>We wish ${name} the very best in all future endeavors.`;
  }

  if (type === "appreciation") {
    return `This is to certify that <strong>${name}</strong>, serving as ${aOrAn(designation)} <strong>${designation}</strong> at ${company}, is being recognized for their dedicated service, exceptional commitment, and positive contributions to the organization.<br/><br/>${name} has worked under the guidance of <strong>${guide}</strong> and has consistently demonstrated ${qualities}. Their efforts have made a meaningful impact on the team and the organization as a whole.<br/><br/>The management expresses heartfelt gratitude for the outstanding service and looks forward to continued collaboration.`;
  }

  if (type === "achievement") {
    return `This is to certify that <strong>${name}</strong>, serving as ${aOrAn(designation)} <strong>${designation}</strong> at ${company}, has achieved a significant milestone that reflects their talent, perseverance, and dedication.<br/><br/>This achievement was accomplished under the mentorship of <strong>${guide}</strong>. During this period, ${name} demonstrated ${qualities} and set a commendable example for peers.<br/><br/>The management congratulates ${name} on this accomplishment and wishes them continued success in their professional journey.`;
  }

  return "";
}

function renderCertificateHTML({
  template,
  type,
  category,
  recipientName,
  recipientDesignation,
  recipientId,
  respondentName,
  respondentRole,
  respondentDepartment,
  dateFrom,
  dateTo,
  remarks,
  respondentSignature,
  id,
  qrCode,
  createdAt,
  companyName,
}: Certificate & { qrCode?: string }) {
  const title = getCertTitle(type, category);
  const company = companyName || "Cluso Infolink";
  const bodyHtml = generateCertBody({
    type,
    category,
    recipientName,
    recipientDesignation,
    respondentName,
    dateFrom,
    dateTo,
    remarks,
    companyName: company,
  });
  const fromDate = dateFrom ? formatDateDisplay(dateFrom) : "";
  const toDate = dateTo ? formatDateDisplay(dateTo) : "";
  const issuedDate = createdAt ? formatDateDisplay(createdAt) : formatDateDisplay(new Date().toISOString());

  if (type === "relieving") {
    const formattedDate = toDate || formatDateDisplay(new Date().toISOString());
    const refId = recipientId ? `CI/HR/RL/${recipientId}` : `CI/HR/RL/${Math.floor(1000 + Math.random() * 9000)}`;

    if (template === "classic") {
      return `
        <div style="font-family: 'Georgia', 'Times New Roman', serif; width: 640px; height: 900px; margin: 0 auto; padding: 48px 56px; background: #fffdf7; border: 1px solid #d4b896; box-shadow: 0 4px 20px rgba(0,0,0,0.05); box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
          <div style="position: absolute; top: 12px; left: 12px; width: 16px; height: 16px; border-top: 2px solid #c29b76; border-left: 2px solid #c29b76;"></div>
          <div style="position: absolute; top: 12px; right: 12px; width: 16px; height: 16px; border-top: 2px solid #c29b76; border-right: 2px solid #c29b76;"></div>
          <div style="position: absolute; bottom: 12px; left: 12px; width: 16px; height: 16px; border-bottom: 2px solid #c29b76; border-left: 2px solid #c29b76;"></div>
          <div style="position: absolute; bottom: 12px; right: 12px; width: 16px; height: 16px; border-bottom: 2px solid #c29b76; border-right: 2px solid #c29b76;"></div>
          <div style="position: absolute; top: 20px; right: 56px; font-size: 8px; font-weight: 500; font-family: 'Inter', sans-serif; color: #7c5e3f; letter-spacing: 0.5px; opacity: 0.75;">
            Cert No: <span style="text-transform: uppercase;">${id || ""}</span>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px;">
              <img src="${LOGO_BASE64}" alt="${company} Logo" style="height: 38px; width: auto; object-fit: contain;" />
              <div style="text-align: right; font-size: 10px; color: #7c5e3f; line-height: 1.4; font-family: 'Georgia', serif; font-style: italic;">
                <strong>${company}</strong><br/>
                Web: www.cluso.in | Email: indiaops@cluso.in
              </div>
            </div>
            <div style="width: 100%; height: 2px; background: linear-gradient(90deg, #c29b76, transparent); margin-bottom: 24px;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #4a3c31; margin-bottom: 28px;">
              <div><strong>Ref No:</strong> ${refId}</div>
              <div><strong>Date:</strong> ${formattedDate}</div>
            </div>
            <div style="font-size: 13px; color: #2a1f14; line-height: 1.6; margin-bottom: 28px;">
              <strong>To,</strong><br/>
              <strong>${recipientName}</strong><br/>
              ${recipientDesignation ? `${recipientDesignation}<br/>` : ""}
              ${recipientId ? `Emp ID: ${recipientId}<br/>` : ""}
            </div>
            <div style="text-align: center; margin-bottom: 28px;">
              <span style="font-size: 13px; font-weight: 700; color: #2a1f14; border-bottom: 1.5px solid #2a1f14; padding-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px;">
                Subject: Relieving Letter & Experience Certificate
              </span>
            </div>
            <div style="font-size: 13px; color: #2a1f14; margin-bottom: 16px;">Dear ${recipientName},</div>
            <div style="font-size: 13px; line-height: 1.8; color: #3d2d1e; text-align: justify; margin-bottom: 32px; text-indent: 32px;">
              ${bodyHtml}
            </div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px;">
              <div style="font-size: 13px; color: #2a1f14;">
                <div style="margin-bottom: 8px;">For <strong>${company}</strong>,</div>
                <div style="height: 44px; display: flex; align-items: flex-end; margin-bottom: 8px;">
                  ${respondentSignature ? `<img src="${respondentSignature}" alt="Signature" style="max-height: 44px; width: auto; object-fit: contain;" />` : '<div style="height: 44px;"></div>'}
                </div>
                <div style="border-top: 1px solid #d4b896; display: inline-block; padding-top: 6px; min-width: 180px;">
                  <strong style="color: #2a1f14;">${respondentName}</strong><br/>
                  <span style="font-size: 11px; color: #8b7355;">${respondentRole}</span><br/>
                  <span style="font-size: 10px; color: #b0a08e;">${respondentDepartment || "HR Administration"}</span>
                </div>
              </div>
              ${qrCode ? `
                <div style="text-align: center; font-size: 8px; color: #8b7355; font-family: 'Georgia', serif;">
                  <img src="${qrCode}" alt="Verification QR Code" style="width: 75px; height: 75px; display: block; border: 1px solid #c29b76; padding: 2px; background: #fff; margin-bottom: 4px;" />
                  Verify Authenticity
                </div>
              ` : ""}
            </div>
            <div style="text-align: center; border-top: 1px solid #e2d2be; padding-top: 10px; font-size: 9px; color: #a3907e;">
              ${company} • Private & Confidential
            </div>
          </div>
        </div>
      `;
    }

    if (template === "modern") {
      return `
        <div style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; width: 640px; height: 900px; margin: 0 auto; padding: 48px 56px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
          <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, #3b82f6, #8b5cf6);"></div>
          <div style="position: absolute; top: 20px; right: 56px; font-size: 8px; font-weight: 500; font-family: 'Inter', sans-serif; color: #64748b; letter-spacing: 0.5px; opacity: 0.75;">
            Cert No: <strong style="color: #0f172a; text-transform: uppercase;">${id || ""}</strong>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <img src="${LOGO_BASE64}" alt="${company} Logo" style="height: 34px; width: auto; object-fit: contain;" />
              <div style="text-align: right; font-size: 10px; color: #64748b; line-height: 1.4;">
                <span style="font-weight: 700; color: #0f172a;">${company}</span><br/>
                Web: www.cluso.in | Email: indiaops@cluso.in
              </div>
            </div>
            <div style="width: 100%; height: 1px; background: #e2e8f0; margin-bottom: 24px;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569; margin-bottom: 24px; font-family: monospace;">
              <div><strong>REF:</strong> ${refId}</div>
              <div><strong>DATE:</strong> ${formattedDate}</div>
            </div>
            <div style="font-size: 13px; color: #1e293b; line-height: 1.5; margin-bottom: 24px; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9;">
              <div style="font-size: 9px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">Recipient Details</div>
              <strong>${recipientName}</strong><br/>
              ${recipientDesignation ? `<span style="color: #475569;">${recipientDesignation}</span><br/>` : ""}
              ${recipientId ? `<span style="color: #64748b; font-size: 12px;">Emp ID: ${recipientId}</span><br/>` : ""}
            </div>
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 13px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px;">
                Subject: Relieving Letter & Experience Certificate
              </span>
            </div>
            <div style="font-size: 13px; color: #0f172a; font-weight: 600; margin-bottom: 16px;">Dear ${recipientName},</div>
            <div style="font-size: 13px; line-height: 1.7; color: #334155; text-align: justify; margin-bottom: 28px;">
              ${bodyHtml}
            </div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px;">
              <div style="font-size: 13px; color: #1e293b;">
                <div style="margin-bottom: 8px; color: #475569;">Sincerely,</div>
                <div style="height: 44px; display: flex; align-items: flex-end; margin-bottom: 8px;">
                  ${respondentSignature ? `<img src="${respondentSignature}" alt="Signature" style="max-height: 44px; width: auto; object-fit: contain;" />` : '<div style="height: 44px;"></div>'}
                </div>
                <div style="border-top: 1px solid #e2e8f0; display: inline-block; padding-top: 6px; min-width: 180px;">
                  <strong style="color: #0f172a;">${respondentName}</strong><br/>
                  <span style="font-size: 11px; color: #64748b;">${respondentRole}</span><br/>
                  <span style="font-size: 10px; color: #94a3b8;">${respondentDepartment || "HR Department"}</span>
                </div>
              </div>
              ${qrCode ? `
                <div style="text-align: center; font-size: 8px; color: #94a3b8; font-family: sans-serif;">
                  <img src="${qrCode}" alt="Verification QR Code" style="width: 75px; height: 75px; display: block; border: 1px solid #e2e8f0; padding: 2px; background: #fff; border-radius: 4px; margin-bottom: 4px;" />
                  Verify Authenticity
                </div>
              ` : ""}
            </div>
            <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 10px; font-size: 9px; color: #94a3b8; font-weight: 500;">
              ${company} • Confidential & Official Document
            </div>
          </div>
        </div>
      `;
    }

    if (template === "executive") {
      return `
        <div style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; width: 640px; height: 900px; margin: 0 auto; padding: 48px 56px; background: #ffffff; border: 1px solid #cbd5e1; border-top: 4px solid #1e1b4b; box-shadow: 0 4px 20px rgba(0,0,0,0.05); box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: #c9a84c;"></div>
          <div style="position: absolute; top: 20px; right: 56px; font-size: 8px; font-weight: 500; font-family: sans-serif; color: #c9a84c; letter-spacing: 0.5px; opacity: 0.75;">
            Cert No: <strong style="color: #c9a84c; text-transform: uppercase;">${id || ""}</strong>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
              <div style="display: inline-block; background: #ffffff; border: 1px solid rgba(201, 168, 76, 0.25); padding: 3px 10px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                <img src="${LOGO_BASE64}" alt="${company} Logo" style="height: 28px; width: auto; display: block; object-fit: contain;" />
              </div>
              <div style="text-align: right; font-size: 10px; color: #1e1b4b; line-height: 1.4;">
                <strong style="color: #c9a84c; text-transform: uppercase; letter-spacing: 0.5px;">${company}</strong><br/>
                <span style="color: #64748b;">HQ: Bangalore, India<br/>
                Web: www.cluso.in | Email: indiaops@cluso.in</span>
              </div>
            </div>
            <div style="width: 100%; height: 1px; background: linear-gradient(90deg, #1e1b4b, #c9a84c, transparent); margin-bottom: 24px;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #1e1b4b; margin-bottom: 24px;">
              <div><strong>Ref No:</strong> <span style="color: #c9a84c; font-weight: 600;">${refId}</span></div>
              <div><strong>Date:</strong> <span>${formattedDate}</span></div>
            </div>
            <div style="font-size: 13px; color: #1e1b4b; line-height: 1.5; margin-bottom: 24px; border-left: 2px solid #c9a84c; padding-left: 14px;">
              <strong>To,</strong><br/>
              <strong style="font-size: 14px;">${recipientName}</strong><br/>
              ${recipientDesignation ? `<span style="color: #475569;">${recipientDesignation}</span><br/>` : ""}
              ${recipientId ? `<span style="color: #64748b;">Employee ID: ${recipientId}</span><br/>` : ""}
            </div>
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 13px; font-weight: 700; color: #1e1b4b; border-bottom: 1.5px solid #c9a84c; padding-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px;">
                Subject: Relieving Letter & Experience Certificate
              </span>
            </div>
            <div style="font-size: 13px; color: #1e1b4b; margin-bottom: 16px;">Dear ${recipientName},</div>
            <div style="font-size: 13px; line-height: 1.7; color: #334155; text-align: justify; margin-bottom: 28px;">
              ${bodyHtml}
            </div>
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
              <div style="font-size: 13px; color: #1e1b4b;">
                <div style="margin-bottom: 8px;">For <strong>${company}</strong>,</div>
                <div style="height: 46px; display: flex; align-items: flex-end; margin-bottom: 8px;">
                  ${respondentSignature ? `
                    <div style="display: inline-block; background: #ffffff; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(201, 168, 76, 0.15); box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                      <img src="${respondentSignature}" alt="Signature" style="max-height: 38px; width: auto; display: block; object-fit: contain;" />
                    </div>
                  ` : '<div style="height: 46px;"></div>'}
                </div>
                <div style="border-top: 1px solid #c9a84c; display: inline-block; padding-top: 6px; min-width: 180px;">
                  <strong style="color: #1e1b4b;">${respondentName}</strong><br/>
                  <span style="font-size: 11px; color: #c9a84c; font-weight: 500;">${respondentRole}</span><br/>
                  <span style="font-size: 10px; color: #64748b;">${respondentDepartment || "HR Operations"}</span>
                </div>
              </div>
              ${qrCode ? `
                <div style="text-align: center; font-size: 8px; color: #c9a84c; font-family: sans-serif;">
                  <img src="${qrCode}" alt="Verification QR Code" style="width: 75px; height: 75px; display: block; border: 1px solid rgba(201, 168, 76, 0.3); padding: 2px; background: #fff; margin-bottom: 4px;" />
                  Verify Authenticity
                </div>
              ` : ""}
            </div>
            <div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase;">
              ${company} Private Limited • Strictly Confidential
            </div>
          </div>
        </div>
      `;
    }
  }

  if (template === "classic") {
    return `
      <div style="font-family: 'Georgia', 'Times New Roman', serif; width: 800px; height: 600px; margin: 0 auto; padding: 24px; background: #fffdf7; border: 3px solid #c29b76; border-radius: 4px; position: relative; box-sizing: border-box;">
        <div style="border: 1px solid #d4b896; padding: 20px 24px; position: relative; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="position: absolute; top: -2px; left: -2px; width: 24px; height: 24px; border-top: 3px solid #c29b76; border-left: 3px solid #c29b76;"></div>
          <div style="position: absolute; top: -2px; right: -2px; width: 24px; height: 24px; border-top: 3px solid #c29b76; border-right: 3px solid #c29b76;"></div>
          <div style="position: absolute; bottom: -2px; left: -2px; width: 24px; height: 24px; border-bottom: 3px solid #c29b76; border-left: 3px solid #c29b76;"></div>
          <div style="position: absolute; bottom: -2px; right: -2px; width: 24px; height: 24px; border-bottom: 3px solid #c29b76; border-right: 3px solid #c29b76;"></div>
          <div style="position: absolute; top: 12px; right: 24px; font-size: 8px; font-weight: 500; font-family: 'Inter', sans-serif; color: #7c5e3f; letter-spacing: 0.5px; opacity: 0.75;">
            Cert No: <span style="text-transform: uppercase;">${id || ""}</span>
          </div>
          <div>
            <div style="text-align: left; margin-bottom: 8px; padding-left: 6px;">
              <img src="${LOGO_BASE64}" alt="${company} Logo" style="height: 40px; width: auto; object-fit: contain; display: block;" />
            </div>
            <div style="width: 100%; height: 1px; background: linear-gradient(90deg, #c29b76, transparent); margin: 0 0 10px; padding-left: 6px;"></div>
          </div>
          <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; margin: 6px 0;">
            <div style="text-align: center; margin-bottom: 10px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #2a1f14; margin: 0 0 2px; letter-spacing: 1px;">${title}</h1>
              ${category ? `<div style="font-size: 10px; color: #8b7355; text-transform: uppercase; letter-spacing: 2px;">${COMPLETION_CATEGORIES.find((c) => c.key === category)?.label || category}</div>` : ""}
            </div>
            <div style="width: 80px; height: 2px; background: linear-gradient(90deg, transparent, #c29b76, transparent); margin: 0 auto 12px;"></div>
            <div style="font-size: 13px; line-height: 1.6; color: #3d3225; text-align: justify; margin-bottom: 16px; padding: 0 6px;">
              ${bodyHtml}
            </div>
            <div style="text-align: center; margin-bottom: 6px;">
              <div style="font-size: 18px; font-weight: 700; color: #2a1f14; border-bottom: 2px solid #c29b76; display: inline-block; padding-bottom: 2px;">${recipientName || ""}</div>
              ${recipientDesignation ? `<div style="font-size: 11px; color: #8b7355; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">${recipientDesignation}</div>` : ""}
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 6px; margin-bottom: 4px;">
            <div style="text-align: center;">
              ${qrCode ? `<div style="margin-bottom: 6px; display: flex; justify-content: center;"><img src="${qrCode}" alt="Verification QR Code" style="width: 75px; height: 75px; display: block; border: 1px solid #c29b76; padding: 2px; background: #fff;" /></div>` : ""}
              <div style="font-size: 10px; color: #8b7355; margin-bottom: 2px;">${issuedDate}</div>
              <div style="font-size: 9px; color: #b0a08e; text-transform: uppercase; letter-spacing: 1px;">Date of Issue</div>
            </div>
            <div style="text-align: center; position: relative;">
              ${respondentSignature ? `
                <div style="height: 34px; margin-bottom: 2px;">
                  <img src="${respondentSignature}" alt="Signature" style="height: 34px; width: auto; object-fit: contain; display: inline-block;" />
                </div>
              ` : '<div style="height: 34px;"></div>'}
              <div style="width: 160px; border-top: 1px solid #c29b76; padding-top: 4px; margin: 0 auto;">
                <div style="font-size: 12px; font-weight: 600; color: #2a1f14;">${respondentName || ""}</div>
                <div style="font-size: 9px; color: #8b7355;">${respondentRole || ""}</div>
                <div style="font-size: 8px; color: #b0a08e;">${respondentDepartment || ""}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (template === "modern") {
    return `
      <div style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; width: 800px; height: 600px; margin: 0 auto; padding: 0; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="height: 6px; background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899); flex-shrink: 0;"></div>
        <div style="padding: 30px 40px 24px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-shrink: 0;">
            <div>
              <img src="${LOGO_BASE64}" alt="${company} Logo" style="height: 36px; width: auto; object-fit: contain; display: block;" />
            </div>
            <div style="font-size: 8px; font-weight: 500; font-family: sans-serif; color: #64748b; text-align: right; padding-top: 4px; opacity: 0.75;">
              Cert No: <span style="color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">${id || ""}</span>
            </div>
          </div>
          <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; margin: 8px 0;">
            <div style="margin-bottom: 8px;">
              <h1 style="font-size: 26px; font-weight: 800; color: #0f172a; margin: 0 0 2px; letter-spacing: -0.5px; line-height: 1.1;">${title}</h1>
              ${category ? `<div style="display: inline-block; font-size: 9px; font-weight: 600; color: #3b82f6; background: #eff6ff; padding: 2px 8px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px;">${COMPLETION_CATEGORIES.find((c) => c.key === category)?.label || category}</div>` : ""}
            </div>
            <div style="width: 40px; height: 3px; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 2px; margin-bottom: 10px;"></div>
            <div style="font-size: 13px; line-height: 1.6; color: #334155; margin-bottom: 12px; max-width: 680px;">
              ${bodyHtml}
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px;">
              <div style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;">Presented To</div>
              <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px;">${recipientName || ""}</div>
              ${recipientDesignation ? `<div style="font-size: 11px; color: #64748b;">${recipientDesignation}</div>` : ""}
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-shrink: 0;">
            <div style="text-align: left;">
              ${qrCode ? `<div style="margin-bottom: 6px;"><img src="${qrCode}" alt="Verification QR Code" style="width: 75px; height: 75px; display: block; border: 1px solid #e2e8f0; padding: 2px; background: #fff; border-radius: 4px;" /></div>` : ""}
              <div style="font-size: 10px; color: #64748b; margin-bottom: 2px;">${issuedDate}</div>
              <div style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px;">Date of Issue</div>
            </div>
            <div style="text-align: right; min-width: 160px;">
              <div style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 2px;">Authorized By</div>
              ${respondentSignature ? `
                <div style="height: 34px; margin-bottom: 2px; text-align: right;">
                  <img src="${respondentSignature}" alt="Signature" style="height: 34px; width: auto; object-fit: contain; display: inline-block;" />
                </div>
              ` : '<div style="height: 34px;"></div>'}
              <div style="border-top: 1px solid #e2e8f0; padding-top: 4px;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${respondentName || ""}</div>
                <div style="font-size: 10px; color: #64748b;">${respondentRole || ""}</div>
                ${respondentDepartment ? `<div style="font-size: 9px; color: #94a3b8;">${respondentDepartment}</div>` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (template === "executive") {
    return `
      <div style="font-family: 'Inter', 'Segoe UI', system-ui, sans-serif; width: 800px; height: 600px; margin: 0 auto; padding: 0; background: #0f0f1a; border-radius: 4px; overflow: hidden; position: relative; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="height: 3px; background: linear-gradient(90deg, #1a1a2e, #c9a84c, #e8c86e, #c9a84c, #1a1a2e); flex-shrink: 0;"></div>
        <div style="position: absolute; top: 12px; right: 24px; font-size: 8px; font-weight: 500; font-family: sans-serif; color: #c9a84c; letter-spacing: 0.5px; opacity: 0.75;">
          Cert No: <strong style="color: #e8e4dd; text-transform: uppercase;">${id || ""}</strong>
        </div>
        <div style="padding: 30px 40px 24px; position: relative; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
          <div style="position: absolute; top: 16px; right: 16px; width: 90px; height: 90px; border: 1px solid rgba(201, 168, 76, 0.1); border-radius: 50%; pointer-events: none; z-index: 1;"></div>
          <div style="text-align: left; flex-shrink: 0; z-index: 2;">
            <div style="display: inline-block; background: #ffffff; padding: 4px 14px; border-radius: 6px; border: 1px solid rgba(201, 168, 76, 0.35); box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              <img src="${LOGO_BASE64}" alt="${company} Logo" style="height: 32px; width: auto; display: block; object-fit: contain;" />
            </div>
          </div>
          <div style="width: 100%; height: 1px; background: linear-gradient(90deg, #c9a84c, transparent); margin: 10px 0; z-index: 2;"></div>
          <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; margin: 8px 0; z-index: 2;">
            <div style="text-align: center; margin-bottom: 4px;">
              <h1 style="font-size: 24px; font-weight: 300; color: #e8e4dd; margin: 0; letter-spacing: 2px; text-transform: uppercase;">${title}</h1>
            </div>
            ${category ? `<div style="text-align: center; margin-bottom: 4px;"><div style="display: inline-block; font-size: 9px; font-weight: 600; color: #c9a84c; border: 1px solid rgba(201,168,76,0.3); padding: 2px 10px; border-radius: 2px; text-transform: uppercase; letter-spacing: 2px;">${COMPLETION_CATEGORIES.find((c) => c.key === category)?.label || category}</div></div>` : ""}
            <div style="display: flex; align-items: center; gap: 8px; justify-content: center; margin-bottom: 10px;">
              <div style="flex: 1; max-width: 60px; height: 1px; background: linear-gradient(90deg, transparent, rgba(201,168,76,0.4));"></div>
              <div style="width: 5px; height: 5px; background: #c9a84c; transform: rotate(45deg);"></div>
              <div style="flex: 1; max-width: 60px; height: 1px; background: linear-gradient(270deg, transparent, rgba(201,168,76,0.4));"></div>
            </div>
            <div style="font-size: 13px; line-height: 1.6; color: #b8b3aa; text-align: center; margin-bottom: 14px; max-width: 650px; margin-left: auto; margin-right: auto;">
              ${bodyHtml}
            </div>
            <div style="text-align: center;">
              <div style="font-size: 20px; font-weight: 300; color: #e8e4dd; letter-spacing: 2px; margin-bottom: 2px;">${recipientName || ""}</div>
              <div style="width: 120px; height: 1px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); margin: 4px auto;"></div>
              ${recipientDesignation ? `<div style="font-size: 10px; color: #c9a84c; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">${recipientDesignation}</div>` : ""}
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid rgba(201,168,76,0.15); padding-top: 12px; flex-shrink: 0; z-index: 2;">
            <div>
              ${qrCode ? `<div style="margin-bottom: 6px;"><img src="${qrCode}" alt="Verification QR Code" style="width: 75px; height: 75px; display: block; border: 1px solid rgba(201, 168, 76, 0.3); padding: 2px; background: #fff; border-radius: 2px;" /></div>` : ""}
              <div style="font-size: 10px; color: #6b665f;">${issuedDate}</div>
              <div style="font-size: 8px; color: #4a463f; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Date of Issue</div>
            </div>
            <div style="text-align: right; min-width: 160px;">
              ${respondentSignature ? `
                <div style="height: 34px; margin-bottom: 2px; text-align: right;">
                  <div style="display: inline-block; background: #ffffff; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(201, 168, 76, 0.25); box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                    <img src="${respondentSignature}" alt="Signature" style="height: 26px; width: auto; display: block; object-fit: contain;" />
                  </div>
                </div>
              ` : '<div style="height: 34px;"></div>'}
              <div style="border-top: 1px solid rgba(201,168,76,0.3); padding-top: 4px;">
                <div style="font-size: 13px; font-weight: 500; color: #e8e4dd;">${respondentName || ""}</div>
                <div style="font-size: 10px; color: #c9a84c;">${respondentRole || ""}</div>
                ${respondentDepartment ? `<div style="font-size: 9px; color: #5a564f;">${respondentDepartment}</div>` : ""}
              </div>
            </div>
          </div>
        </div>
        <div style="height: 3px; background: linear-gradient(90deg, #1a1a2e, #c9a84c, #e8c86e, #c9a84c, #1a1a2e); flex-shrink: 0;"></div>
      </div>
    `;
  }

  return "<div>Template not found</div>";
}

function CertificatesContent() {
  const { me, loading, logout } = usePortalSession();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [certsLoading, setCertsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingCert, setDownloadingCert] = useState<(Certificate & { qrCode?: string }) | null>(null);
  const [previewCert, setPreviewCert] = useState<(Certificate & { qrCode?: string }) | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // State for JPG download generator
  const [generatingJpg, setGeneratingJpg] = useState(false);
  const [copiedCertId, setCopiedCertId] = useState<string | null>(null);

  const handleCopyTemplate = (cert: Certificate) => {
    const text = getCopyTemplateText(cert);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCertId(cert.id);
      setTimeout(() => {
        setCopiedCertId(null);
      }, 2000);
    }).catch((err) => {
      console.error("Failed to copy template text", err);
    });
  };

  const handlePreview = async (cert: Certificate) => {
    let qrCode = "";
    try {
      qrCode = await QRCode.toDataURL(`https://www.cluso.in/verify?id=${cert.id}`, {
        margin: 1,
        width: 150,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    } catch (e) {
      console.error("Failed to generate QR code for preview", e);
    }
    setPreviewCert({ ...cert, qrCode });
  };

  useEffect(() => {
    if (!previewCert) return;
    const handleResize = () => {
      if (!previewContainerRef.current) return;
      const parentWidth = previewContainerRef.current.clientWidth;
      const certWidth = previewCert.type === "relieving" ? 640 : 800;
      if (parentWidth < certWidth) {
        setPreviewScale(parentWidth / certWidth);
      } else {
        setPreviewScale(1);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 50);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [previewCert]);

  useEffect(() => {
    if (!me) return;
    let active = true;

    async function fetchCerts() {
      try {
        const res = await fetch("/api/certificates", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && active) {
          setCerts(data.certificates || []);
        } else if (active) {
          setErrorMsg(data.error || "Failed to load certificates.");
        }
      } catch (err) {
        if (active) setErrorMsg("An error occurred while fetching certificates.");
      } finally {
        if (active) setCertsLoading(false);
      }
    }

    fetchCerts();

    return () => {
      active = false;
    };
  }, [me]);

  const filteredCerts = useMemo(() => {
    if (!searchQuery) return certs;
    const q = searchQuery.toLowerCase().trim();
    return certs.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        getCertTitle(c.type, c.category).toLowerCase().includes(q) ||
        (c.recipientDesignation || "").toLowerCase().includes(q) ||
        c.respondentName.toLowerCase().includes(q)
    );
  }, [certs, searchQuery]);

  // Helper: fix gradient backgrounds for html2canvas (it crashes on linear-gradient
  // applied to very thin elements, producing a 0-dimension canvas pattern).
  function fixGradientsForCapture(container: HTMLElement) {
    const saved: { el: HTMLElement; bg: string }[] = [];
    container.querySelectorAll<HTMLElement>('*').forEach(el => {
      const bg = el.style.background || '';
      if (bg.includes('linear-gradient') || bg.includes('radial-gradient')) {
        saved.push({ el, bg });
        const colors = bg.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g);
        el.style.background = colors && colors.length > 0 ? colors[colors.length - 1] : 'transparent';
      }
    });
    return saved;
  }
  function restoreGradients(saved: { el: HTMLElement; bg: string }[]) {
    saved.forEach(({ el, bg }) => { el.style.background = bg; });
  }

  const handleDownload = async (cert: Certificate) => {
    let qrCode = "";
    try {
      qrCode = await QRCode.toDataURL(`https://www.cluso.in/verify?id=${cert.id}`, {
        margin: 1,
        width: 150,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    } catch (e) {
      console.error("Failed to generate QR code for download", e);
    }

    setDownloadingCert({ ...cert, qrCode });

    // Wait briefly for DOM to render the container
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      const element = document.getElementById("certificate-download-target");
      if (element) {
        const bgCol =
          cert.template === "executive"
            ? "#0f0f1a"
            : cert.template === "classic"
            ? "#fffdf7"
            : "#ffffff";

        const saved = fixGradientsForCapture(element);
        try {
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: bgCol,
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.85);
          const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? "landscape" : "portrait",
            unit: "px",
            format: [canvas.width, canvas.height],
          });

          pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
          const filename = `${cert.recipientName.replace(/\s+/g, "_")}_${
            cert.type === "relieving" ? "Relieving_Letter" : "Certificate"
          }.pdf`;
          pdf.save(filename);
        } finally {
          restoreGradients(saved);
        }
      } else {
        alert("Failed to locate certificate container for download.");
      }
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to download PDF certificate. Please try again.");
    } finally {
      setDownloadingCert(null);
    }
  };

  // Social sharing helpers
  const getShareText = (cert: Certificate) => {
    const title = getCertTitle(cert.type, cert.category);
    const company = cert.companyName || "Cluso Infolink";
    return `I'm proud to share that I received a ${title} from ${company}! 🎉 #Achievement #Professional #${company.replace(/\s+/g, '')}`;
  };

  const getShareUrl = () => {
    if (typeof window !== 'undefined') return window.location.href;
    return '';
  };

  const handleShareLinkedIn = (cert: Certificate) => {
    const text = getShareText(cert);
    const url = getShareUrl();
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=600,noopener,noreferrer');
  };

  const handleShareFacebook = (cert: Certificate) => {
    const text = getShareText(cert);
    const url = getShareUrl();
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    window.open(fbUrl, '_blank', 'width=600,height=600,noopener,noreferrer');
  };

  const handleShareInstagram = (cert: Certificate) => {
    const text = getShareText(cert);
    navigator.clipboard.writeText(text).then(() => {
      alert('Caption copied to clipboard! 📋\n\nThe certificate image will now download. You can upload it to Instagram with the copied caption.');
    }).catch(() => {
      alert('Share on Instagram: Download the certificate JPG and post it manually.');
    });
    handleDownloadJpg(cert);
  };

  const handleDownloadJpg = async (cert: Certificate) => {
    setGeneratingJpg(true);
    let qrCode = "";
    try {
      qrCode = await QRCode.toDataURL(`https://www.cluso.in/verify?id=${cert.id}`, {
        margin: 1,
        width: 150,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    } catch (e) {
      console.error("Failed to generate QR code for JPG download", e);
    }

    setDownloadingCert({ ...cert, qrCode });

    // Wait 400ms for DOM render
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      const element = document.getElementById("certificate-download-target");
      if (element) {
        const bgCol =
          cert.template === "executive"
            ? "#0f0f1a"
            : cert.template === "classic"
            ? "#fffdf7"
            : "#ffffff";

        const saved = fixGradientsForCapture(element);
        
        const canvas = await html2canvas(element, {
          scale: 2.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: bgCol,
        });

        restoreGradients(saved);

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const filename = `${cert.recipientName.replace(/\s+/g, "_")}_${
          cert.type === "relieving" ? "Relieving_Letter" : "Certificate"
        }.jpg`;

        const link = document.createElement("a");
        link.href = imgData;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Failed to locate certificate container for download.");
      }
    } catch (err) {
      console.error("Failed to generate JPG", err);
      alert("Failed to download JPG certificate. Please try again.");
    } finally {
      setDownloadingCert(null);
      setGeneratingJpg(false);
    }
  };

  if (loading || !me || certsLoading) {
    return (
      <LoadingScreen
        title="Loading Certificates..."
        subtitle="Retrieving your professional credentials"
      />
    );
  }

  return (
    <PortalFrame
      me={me}
      onLogout={logout}
      title="My Certificates"
      subtitle="View, verify, and download certificates and letters issued to you by the organization."
    >
      {errorMsg && (
        <div className="inline-alert inline-alert-danger mb-6">
          <ShieldAlert className="inline-block mr-2" size={18} />
          {errorMsg}
        </div>
      )}

      <div className="dashboard-glass-wrapper">
        <div className="glass-glow-wrapper">
          <div className="glass-glow-blob glass-glow-1"></div>
          <div className="glass-glow-blob glass-glow-2"></div>
          <div className="glass-glow-blob glass-glow-3"></div>
        </div>

        <div className="dashboard-header flex flex-col md:flex-row gap-4 justify-between items-center relative z-10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="text-amber-500" size={28} />
            Professional Credentials
          </h2>

          <div className="search-bar w-full md:w-80 flex items-center bg-white/10 dark:bg-slate-900/40 border border-slate-200/20 dark:border-slate-800/40 rounded-lg px-3 py-1.5 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500">
            <Search size={18} className="text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search certificates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-[14px] outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 w-full"
            />
          </div>
        </div>

        {filteredCerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center relative z-10">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800/60 mb-4">
              <Award className="text-slate-400 opacity-40" size={48} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">No Certificates Found</h3>
            <p className="text-[14px] text-slate-400 max-w-sm mt-1">
              {searchQuery
                ? "We couldn't find any certificates matching your search terms."
                : "Any official certificates or relieving letters issued to you will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 relative z-10">
            {filteredCerts.map((cert) => {
              const ct = CERT_TYPES.find((t) => t.key === cert.type) || {
                label: "Certificate",
                color: "#6b7280",
                icon: Award,
              };
              const TypeIcon = ct.icon;

              return (
                <div
                  key={cert.id}
                  className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/60 hover:shadow-xl dark:hover:shadow-black/20 hover:border-amber-500/30 transition-all duration-300 overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 w-1.5 h-full"
                    style={{ backgroundColor: ct.color }}
                  />

                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className="p-2.5 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: `${ct.color}25`, color: ct.color }}
                      >
                        <TypeIcon size={22} />
                      </div>
                      <span className="text-[10px] font-mono tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                        ID: {cert.id}
                      </span>
                    </div>

                    <h3 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-amber-500 transition-colors duration-200">
                      {getCertTitle(cert.type, cert.category)}
                    </h3>

                    {cert.recipientDesignation && (
                      <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                        {cert.recipientDesignation}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-4 text-[12px] text-slate-400 dark:text-slate-500 font-medium">
                      <Calendar size={14} />
                      <span>{formatDateDisplay(cert.createdAt)}</span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-[12px] uppercase">
                        {cert.respondentName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                          {cert.respondentName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {cert.respondentRole}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      onClick={() => handlePreview(cert)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 bg-white hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-amber-500 text-[13px] font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all duration-200 cursor-pointer"
                    >
                      <Eye size={15} />
                      View Certificate
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleDownload(cert)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 border border-slate-200 dark:border-slate-700 text-[12px] font-bold shadow-sm transition-all duration-200 cursor-pointer"
                      >
                        <Download size={14} />
                        Download PDF
                      </button>
                      <button
                        onClick={() => handleDownloadJpg(cert)}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-[12px] font-bold text-white shadow-sm transition-all duration-200 cursor-pointer"
                      >
                        <Download size={14} />
                        Download JPG
                      </button>
                    </div>

                    {/* Copy Share Caption Row */}
                    <div className="mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="truncate text-left flex-1 min-w-0">
                        <div className="text-[8px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Share Caption</div>
                        <div className="text-[11px] text-slate-655 dark:text-slate-350 truncate">
                          {getCopyTemplateText(cert)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyTemplate(cert)}
                        className="flex items-center gap-1 py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-750 dark:text-slate-300 hover:border-amber-500 hover:text-amber-500 text-[10px] font-semibold transition-all duration-200 cursor-pointer flex-shrink-0"
                      >
                        {copiedCertId === cert.id ? (
                          <>
                            <Check size={11} className="text-green-500 animate-pulse" />
                            <span className="text-green-600 dark:text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Social Share Row */}
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mr-1">Share:</span>
                      <button
                        onClick={() => handleShareLinkedIn(cert)}
                        title="Share on LinkedIn"
                        className="p-1.5 rounded-lg hover:bg-[#0077b5]/10 text-[#0077b5] transition-all duration-200 cursor-pointer hover:scale-110"
                      >
                        <LinkedInIcon size={16} />
                      </button>
                      <button
                        onClick={() => handleShareFacebook(cert)}
                        title="Share on Facebook"
                        className="p-1.5 rounded-lg hover:bg-[#1877f2]/10 text-[#1877f2] transition-all duration-200 cursor-pointer hover:scale-110"
                      >
                        <FacebookIcon size={16} />
                      </button>
                      <button
                        onClick={() => handleShareInstagram(cert)}
                        title="Share on Instagram"
                        className="p-1.5 rounded-lg hover:bg-[#e4405f]/10 text-[#e4405f] transition-all duration-200 cursor-pointer hover:scale-110"
                      >
                        <InstagramIcon size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden container for rendering & downloading the certificate */}
      {downloadingCert && (
        <div
          style={{
            position: "fixed",
            top: "0px",
            left: "-9999px",
            zIndex: -9999,
            overflow: "visible",
            width: downloadingCert.type === "relieving" ? "640px" : "800px",
            height: downloadingCert.type === "relieving" ? "900px" : "600px",
          }}
        >
          <div
            id="certificate-download-target"
            style={{
              width: downloadingCert.type === "relieving" ? "640px" : "800px",
              height: downloadingCert.type === "relieving" ? "900px" : "600px",
            }}
            dangerouslySetInnerHTML={{
              __html: renderCertificateHTML(downloadingCert),
            }}
          />
        </div>
      )}

      {/* Certificate Preview Modal */}
      {previewCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div 
            onClick={() => setPreviewCert(null)} 
            className="absolute inset-0 cursor-default"
          />
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] z-10 overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {getCertTitle(previewCert.type, previewCert.category)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Certificate ID: <span className="font-mono uppercase">{previewCert.id}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleDownload(previewCert);
                    setPreviewCert(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 border border-slate-200 dark:border-slate-700 text-[12px] font-bold shadow-sm transition-all duration-200 cursor-pointer"
                >
                  <Download size={14} />
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    handleDownloadJpg(previewCert);
                    setPreviewCert(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-bold shadow-sm transition-all duration-200 cursor-pointer"
                >
                  <Download size={14} />
                  Download JPG
                </button>
                <button
                  onClick={() => setPreviewCert(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-start bg-slate-50 dark:bg-slate-900/60 min-h-[300px]">
              <div
                ref={previewContainerRef}
                className="w-full flex flex-col items-center justify-start"
                style={{
                  minHeight: previewCert.type === "relieving" ? `${900 * previewScale}px` : `${600 * previewScale}px`,
                }}
              >
                <div
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top center",
                    width: previewCert.type === "relieving" ? "640px" : "800px",
                    height: previewCert.type === "relieving" ? "900px" : "600px",
                    boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.15)",
                    borderRadius: previewCert.template === "modern" ? "16px" : "4px",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderCertificateHTML(previewCert),
                  }}
                />
              </div>
            </div>

            {/* Modal Footer — Social Share Bar */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Share Caption</div>
                  <div className="text-[12px] text-slate-655 dark:text-slate-350 max-w-xl pr-2">
                    {getCopyTemplateText(previewCert)}
                  </div>
                </div>
                <button
                  onClick={() => handleCopyTemplate(previewCert)}
                  className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-[12px] font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 cursor-pointer flex-shrink-0"
                >
                  {copiedCertId === previewCert.id ? (
                    <>
                      <Check size={14} className="text-green-500 animate-pulse" />
                      <span className="text-green-600 dark:text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Caption</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-900">
                <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <Share2 size={15} />
                  Share this certificate
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleShareLinkedIn(previewCert)}
                    title="Share on LinkedIn"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0077b5]/10 hover:bg-[#0077b5]/20 text-[#0077b5] text-[13px] font-bold transition-all duration-200 cursor-pointer hover:scale-105"
                  >
                    <LinkedInIcon size={16} />
                    LinkedIn
                  </button>
                  <button
                    onClick={() => handleShareFacebook(previewCert)}
                    title="Share on Facebook"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1877f2]/10 hover:bg-[#1877f2]/20 text-[#1877f2] text-[13px] font-bold transition-all duration-200 cursor-pointer hover:scale-105"
                  >
                    <FacebookIcon size={16} />
                    Facebook
                  </button>
                  <button
                    onClick={() => handleShareInstagram(previewCert)}
                    title="Share on Instagram"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e4405f]/10 hover:bg-[#e4405f]/20 text-[#e4405f] text-[13px] font-bold transition-all duration-200 cursor-pointer hover:scale-105"
                  >
                    <InstagramIcon size={16} />
                    Instagram
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Loader Modal Overlay */}
      {generatingJpg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-955/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 flex flex-col items-center gap-4 max-w-xs text-center">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <div className="flex flex-col gap-1">
              <h4 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Generating Certificate JPG</h4>
              <p className="text-[12px] text-slate-500">Please wait a moment...</p>
            </div>
          </div>
        </div>
      )}
    </PortalFrame>
  );
}

export default function CertificatesDashboardPage() {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          title="Loading Certificates..."
          subtitle="Retrieving your professional credentials"
        />
      }
    >
      <CertificatesContent />
    </Suspense>
  );
}
