import mongoose from "mongoose";

const organizerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    zapierWebhookUrl: { type: String, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Organizer", organizerSchema);
