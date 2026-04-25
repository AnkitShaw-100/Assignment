import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    venue: String,
    slug: { type: String, unique: true },
    mode: { type: String, enum: ["online", "offline"] },
    capacity: { type: Number, required: true },
    registrationMode: { type: String, enum: ["open", "shortlisted"] },
    status: {
      type: String,
      enum: ["draft", "published", "cancelled"],
      default: "draft",
    },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "Organizer" },
    webhookDeliveryStatus: {
      type: String,
      enum: ["success", "failed", "pending", "not_configured"],
      default: "not_configured",
    },
    webhookLastDeliveryAt: { type: Date, default: null },
    webhookLastError: { type: String, default: null },
    webhookLastEventType: { type: String, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Event", eventSchema);
