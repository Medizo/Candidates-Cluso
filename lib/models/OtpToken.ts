import { Schema, models, model, Model, InferSchemaType } from "mongoose";

const OtpTokenSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  otpHash: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  // Holds pending registration data during signup flow
  signupData: {
    type: {
      name: { type: String, required: true },
      phone: { type: String, default: "" },
      passwordHash: { type: String, required: true },
    },
    default: undefined,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // TTL index — auto-delete after 5 minutes
  },
});

export type OtpTokenDocument = InferSchemaType<typeof OtpTokenSchema> & {
  _id: string;
};

const OtpToken =
  (models.OtpToken as Model<OtpTokenDocument>) ||
  model("OtpToken", OtpTokenSchema);

export default OtpToken;
