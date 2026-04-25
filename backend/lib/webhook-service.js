import WebhookDelivery from "../model/WebhookDelivery.js";

function truncateForLog(value, maxLength = 1500) {
  if (typeof value !== "string") {
    return value;
  }
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}...`;
}

export function buildWebhookPayload({
  eventType,
  event,
  registration = null,
  rsvpStatus = null,
}) {
  return {
    version: "1.0",
    eventType,
    timestamp: new Date().toISOString(),
    event: {
      id: event._id.toString(),
      title: event.title,
    },
    attendee: registration
      ? {
          name: registration.attendeeName,
          email: registration.attendeeEmail,
        }
      : null,
    rsvpStatus: rsvpStatus || registration?.status || null,
    data: {
      event,
      registration,
    },
  };
}

async function logDelivery({
  organizerId,
  eventId,
  eventType,
  deliveryStatus,
  endpointUrl,
  responseStatusCode = null,
  responseBody = null,
  errorMessage = null,
  payload,
}) {
  await WebhookDelivery.create({
    organizerId,
    eventId,
    eventType,
    deliveryStatus,
    endpointUrl,
    responseStatusCode,
    responseBody: truncateForLog(responseBody),
    errorMessage: truncateForLog(errorMessage),
    payload,
    attemptedAt: new Date(),
  });
}

export async function sendOrganizerWebhook({
  organizer,
  event,
  eventType,
  registration = null,
  rsvpStatus = null,
}) {
  const payload = buildWebhookPayload({
    eventType,
    event,
    registration,
    rsvpStatus,
  });
  const endpointUrl = organizer?.zapierWebhookUrl?.trim() || "";

  if (!endpointUrl) {
    event.webhookDeliveryStatus = "not_configured";
    event.webhookLastError = "Webhook URL not configured.";
    event.webhookLastEventType = eventType;
    event.webhookLastDeliveryAt = new Date();
    await event.save();
    await logDelivery({
      organizerId: organizer._id,
      eventId: event._id,
      eventType,
      deliveryStatus: "skipped",
      endpointUrl: null,
      errorMessage: "Webhook URL not configured.",
      payload,
    });
    return {
      success: false,
      skipped: true,
      error: "Webhook URL not configured.",
    };
  }

  event.webhookDeliveryStatus = "pending";
  event.webhookLastError = null;
  event.webhookLastEventType = eventType;
  event.webhookLastDeliveryAt = new Date();
  await event.save();

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text().catch(() => "");

    if (!response.ok) {
      const errorMessage = `Webhook delivery failed with status ${response.status}.`;
      event.webhookDeliveryStatus = "failed";
      event.webhookLastError = errorMessage;
      event.webhookLastDeliveryAt = new Date();
      await event.save();
      await logDelivery({
        organizerId: organizer._id,
        eventId: event._id,
        eventType,
        deliveryStatus: "failed",
        endpointUrl,
        responseStatusCode: response.status,
        responseBody: responseText,
        errorMessage,
        payload,
      });
      return { success: false, error: errorMessage };
    }

    event.webhookDeliveryStatus = "success";
    event.webhookLastError = null;
    event.webhookLastDeliveryAt = new Date();
    await event.save();
    await logDelivery({
      organizerId: organizer._id,
      eventId: event._id,
      eventType,
      deliveryStatus: "success",
      endpointUrl,
      responseStatusCode: response.status,
      responseBody: responseText,
      payload,
    });
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook delivery failed.";
    event.webhookDeliveryStatus = "failed";
    event.webhookLastError = message;
    event.webhookLastDeliveryAt = new Date();
    await event.save();
    await logDelivery({
      organizerId: organizer._id,
      eventId: event._id,
      eventType,
      deliveryStatus: "failed",
      endpointUrl,
      errorMessage: message,
      payload,
    });
    return { success: false, error: message };
  }
}
