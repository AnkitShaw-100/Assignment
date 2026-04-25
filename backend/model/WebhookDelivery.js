import mongoose from "mongoose";

const webhookDeliverySchema = new mongoose.Schema(
  {
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizer",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    eventType: { type: String, required: true },
    deliveryStatus: {
      type: String,
      enum: ["success", "failed", "skipped"],
      required: true,
    },
    endpointUrl: { type: String, default: null },
    responseStatusCode: { type: Number, default: null },
    responseBody: { type: String, default: null },
    errorMessage: { type: String, default: null },
    payload: { type: Object, required: true },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export default mongoose.model("WebhookDelivery", webhookDeliverySchema);
