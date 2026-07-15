import { InferSchemaType, Model, Schema, models, model } from "mongoose";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    password: { type: String },
    role: {
      type: String,
      required: true,
    },
    parentCustomer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdByDelegate: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    mustChangePassword: {
      type: Boolean,
      default: undefined,
    },
    selfRegistered: {
      type: Boolean,
      default: false,
    },
    deactivated: {
      type: Boolean,
      default: false,
    },
    onboarded: {
      type: Boolean,
      default: false,
    },
    onboardedFromCandidate: {
      type: Boolean,
      default: false,
    },
    onboardedEmployeeId: {
      type: String,
      default: "",
    },
    enterpriseLinked: {
      type: Boolean,
      default: false,
    },
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
      rawTokenResponse: { type: Schema.Types.Mixed, default: null },
      rawUserResponse: { type: Schema.Types.Mixed, default: null },
      rawDocumentsResponse: { type: Schema.Types.Mixed, default: null },
      linkedAt: { type: Date, default: null },
    },
    selectedServices: [
      {
        serviceId: {
          type: Schema.Types.ObjectId,
          ref: "Service",
          required: true,
        },
        serviceName: { type: String, required: true },
        price: { type: Number, required: true },
        currency: { type: String, enum: SUPPORTED_CURRENCIES, default: "INR" },
        countryRates: [
          {
            country: { type: String, required: true, trim: true },
            price: { type: Number, required: true, min: 0 },
            currency: { type: String, enum: SUPPORTED_CURRENCIES, required: true },
          },
        ],
      },
    ],
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof UserSchema> & { _id: string };

const hasCreatedByDelegatePath = Boolean(models.User?.schema.path("createdByDelegate"));
const hasMustChangePasswordPath = Boolean(models.User?.schema.path("mustChangePassword"));
const hasCandidateProfilePath = Boolean(models.User?.schema.path("candidateProfile"));
const hasDigilockerProfilePath = Boolean(models.User?.schema.path("digilockerProfile"));
const hasCountryRatesPath = Boolean(models.User?.schema.path("selectedServices.countryRates"));
const hasEnterpriseLinkedPath = Boolean(models.User?.schema.path("enterpriseLinked"));
const hasDeactivatedPath = Boolean(models.User?.schema.path("deactivated"));
const hasOnboardedPath = Boolean(models.User?.schema.path("onboarded"));

if (
  models.User &&
  (!models.User.schema.path("selectedServices") ||
    !hasCreatedByDelegatePath ||
    !hasMustChangePasswordPath ||
    !hasCandidateProfilePath ||
    !hasDigilockerProfilePath ||
    !hasCountryRatesPath ||
    !hasEnterpriseLinkedPath ||
    !hasDeactivatedPath ||
    !hasOnboardedPath)
) {
  delete models.User;
}

const User = (models.User as Model<UserDocument>) || model("User", UserSchema);

export default User;
