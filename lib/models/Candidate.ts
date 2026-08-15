import { InferSchemaType, Model, Schema, models, model } from "mongoose";

const CandidateSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["candidate"],
      default: "candidate",
      required: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: undefined,
    },
    selfRegistered: {
      type: Boolean,
      default: false,
    },
    // Tracks whether this candidate has been onboarded as an employee
    onboarded: {
      type: Boolean,
      default: false,
    },
    onboardedAt: { type: Date, default: null },
    onboardedBy: { type: String, default: null },
    candidateProfile: {
      keySkills: {
        type: [String],
        default: [],
      },
      employment: {
        type: [
          {
            companyName: { type: String, default: "", trim: true },
            designation: { type: String, default: "", trim: true },
            city: { type: String, default: "", trim: true },
            state: { type: String, default: "", trim: true },
            country: { type: String, default: "", trim: true },
            startDate: { type: String, default: "", trim: true },
            endDate: { type: String, default: "", trim: true },
            currentlyWorking: { type: Boolean, default: false },
            employmentType: { type: String, default: "", trim: true },
            description: { type: String, default: "", trim: true },
          },
        ],
        default: [],
      },
      education: {
        type: [
          {
            level: { type: String, default: "", trim: true },
            institution: { type: String, default: "", trim: true },
            degree: { type: String, default: "", trim: true },
            fieldOfStudy: { type: String, default: "", trim: true },
            city: { type: String, default: "", trim: true },
            state: { type: String, default: "", trim: true },
            country: { type: String, default: "", trim: true },
            startYear: { type: String, default: "", trim: true },
            endYear: { type: String, default: "", trim: true },
            educationType: { type: String, default: "", trim: true },
            grade: { type: String, default: "", trim: true },
          },
        ],
        default: [],
      },
      resume: {
        fileName: { type: String, default: "", trim: true },
        fileType: { type: String, default: "", trim: true },
        fileSize: { type: Number, default: 0 },
        dataUrl: { type: String, default: "" },
        uploadedAt: { type: Date, default: null },
      },
    },
    digilockerProfile: {
      verified: { type: Boolean, default: false },
      name: { type: String, default: "" },
      dob: { type: String, default: "" },
      gender: { type: String, default: "" },
      email: { type: String, default: "" },
      mobile: { type: String, default: "" },
      maskedAadhaar: { type: String, default: "" },
      digilockerid: { type: String, default: "" },
      referenceKey: { type: String, default: "" },
      eaadhaar: { type: String, default: "" },
      photo: { type: String, default: "" },
      panNumber: { type: String, default: "" },
      drivingLicence: { type: String, default: "" },
      preferredUsername: { type: String, default: "" },
      documents: {
        type: [
          {
            name: { type: String, default: "" },
            doctype: { type: String, default: "" },
            description: { type: String, default: "" },
            issuer: { type: String, default: "" },
            issuerId: { type: String, default: "" },
            uri: { type: String, default: "" },
            date: { type: String, default: "" },
          },
        ],
        default: [],
      },
      linkedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
    collection: "candidates", // Explicit collection name — separate from 'users'
  },
);

export type CandidateDocument = InferSchemaType<typeof CandidateSchema> & { _id: string };

const Candidate =
  (models.Candidate as Model<CandidateDocument>) ||
  model("Candidate", CandidateSchema);

export default Candidate;
