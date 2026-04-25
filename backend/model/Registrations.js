import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    attendeeName: { type: String, required: true },
    attendeeEmail: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "registered", "approved", "rejected", "revoked"],
      default: "pending",
    },
    phone: { type: String, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Registration", registrationSchema);
