import Event from "../model/Events.js";
import Organizer from "../model/Organizer.js";
import Registration from "../model/Registrations.js";
import { sendRegistrationStatusUpdateEmail } from "../lib/email-service.js";
import { sendOrganizerWebhook } from "../lib/webhook-service.js";

function countCapacityConsumingStatuses(eventRegistrationMode) {
  if (eventRegistrationMode === "shortlisted") {
    return ["pending", "approved", "registered"];
  }

  return ["registered", "approved"];
}

async function registerForResolvedEvent(
  event,
  attendeeName,
  attendeeEmail,
  phone,
  res,
) {
  if (event.status === "cancelled") {
    return res
      .status(400)
      .json({ message: "Registrations are closed for this event." });
  }

  if (event.status !== "published") {
    return res
      .status(400)
      .json({ message: "Registrations are only open for published events." });
  }

  const normalizedEmail = attendeeEmail.trim().toLowerCase();

  const existingRegistration = await Registration.findOne({
    eventId: event._id,
    attendeeEmail: normalizedEmail,
  });

  if (existingRegistration) {
    return res
      .status(409)
      .json({ message: "This attendee is already registered for the event." });
  }

  const activeRegistrationCount = await Registration.countDocuments({
    eventId: event._id,
    status: { $in: countCapacityConsumingStatuses(event.registrationMode) },
  });

  if (activeRegistrationCount >= event.capacity) {
    return res.status(400).json({ message: "Event capacity is full." });
  }

  const registration = await Registration.create({
    eventId: event._id,
    attendeeName: attendeeName.trim(),
    attendeeEmail: normalizedEmail,
    phone: phone?.trim() || null,
    status: event.registrationMode === "open" ? "registered" : "pending",
  });

  await sendRegistrationStatusUpdateEmail({
    attendeeEmail: normalizedEmail,
    attendeeName: registration.attendeeName,
    eventTitle: event.title,
    eventDate: event.date,
    venue: event.venue,
    nextStatus: registration.status,
  });

  try {
    const organizer = await Organizer.findById(event.organizerId).select(
      "zapierWebhookUrl",
    );
    if (organizer) {
      await sendOrganizerWebhook({
        organizer,
        event,
        eventType: "registration.submitted",
        registration,
      });
    }
  } catch (webhookError) {
    console.error(
      "Webhook delivery error (registration.submitted):",
      webhookError,
    );
  }

  return res.status(201).json({
    message:
      event.registrationMode === "open"
        ? "You're confirmed!"
        : "We received your registration, pending review.",
    registration,
  });
}

async function fetchOwnedEvent(eventId, organizerId) {
  const event = await Event.findById(eventId).select(
    "organizerId registrationMode capacity title date venue",
  );
  if (!event) {
    return { error: { code: 404, message: "Event not found." } };
  }

  if (event.organizerId?.toString() !== organizerId.toString()) {
    return {
      error: {
        code: 403,
        message: "You are not allowed to manage this event.",
      },
    };
  }

  return { event };
}

async function updateRegistrationStatus(
  req,
  res,
  allowedCurrentStatus,
  nextStatus,
  successMessage,
) {
  const { eventId, registrationId } = req.params;

  const ownedEventResult = await fetchOwnedEvent(eventId, req.organizer._id);
  if (ownedEventResult.error) {
    return res
      .status(ownedEventResult.error.code)
      .json({ message: ownedEventResult.error.message });
  }

  const registration = await Registration.findOne({
    _id: registrationId,
    eventId,
  });
  if (!registration) {
    return res
      .status(404)
      .json({ message: "Registration not found for this event." });
  }

  if (registration.status !== allowedCurrentStatus) {
    return res.status(400).json({
      message: `Only ${allowedCurrentStatus} registrations can be marked as ${nextStatus}.`,
    });
  }

  if (nextStatus === "approved") {
    const consumingStatuses = countCapacityConsumingStatuses(
      ownedEventResult.event.registrationMode,
    );
    const occupiedCount = await Registration.countDocuments({
      eventId,
      status: { $in: consumingStatuses },
    });

    if (occupiedCount > ownedEventResult.event.capacity) {
      return res.status(400).json({ message: "Event capacity is full." });
    }
  }

  registration.status = nextStatus;
  await registration.save();

  await sendRegistrationStatusUpdateEmail({
    attendeeEmail: registration.attendeeEmail,
    attendeeName: registration.attendeeName,
    eventTitle: ownedEventResult.event.title,
    eventDate: ownedEventResult.event.date,
    venue: ownedEventResult.event.venue,
    nextStatus,
  });

  const webhookEventType =
    nextStatus === "approved"
      ? "attendee.approved"
      : nextStatus === "revoked"
        ? "attendee.revoked"
        : null;
  if (webhookEventType) {
    try {
      const organizer = await Organizer.findById(req.organizer._id).select(
        "zapierWebhookUrl",
      );
      if (organizer) {
        await sendOrganizerWebhook({
          organizer,
          event: ownedEventResult.event,
          eventType: webhookEventType,
          registration,
          rsvpStatus: nextStatus,
        });
      }
    } catch (webhookError) {
      console.error(
        `Webhook delivery error (${webhookEventType}):`,
        webhookError,
      );
    }
  }

  return res.status(200).json({
    message: successMessage,
    registration,
  });
}

export async function registerForEvent(req, res) {
  try {
    const { eventId } = req.params;
    const { attendeeName, attendeeEmail, phone } = req.body;

    if (!attendeeName || !attendeeEmail) {
      return res
        .status(400)
        .json({ message: "Attendee name and email are required." });
    }

    const event = await Event.findById(eventId).select(
      "capacity registrationMode status title date venue organizerId",
    );
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    return registerForResolvedEvent(
      event,
      attendeeName,
      attendeeEmail,
      phone,
      res,
    );
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while registering for event." });
  }
}

export async function registerForEventBySlug(req, res) {
  try {
    const { slug } = req.params;
    const { attendeeName, attendeeEmail, phone } = req.body;

    if (!attendeeName || !attendeeEmail) {
      return res
        .status(400)
        .json({ message: "Attendee name and email are required." });
    }

    const event = await Event.findOne({ slug }).select(
      "capacity registrationMode status title date venue organizerId",
    );
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    return registerForResolvedEvent(
      event,
      attendeeName,
      attendeeEmail,
      phone,
      res,
    );
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while registering for event." });
  }
}

export async function getEventRegistrations(req, res) {
  try {
    const { eventId } = req.params;
    const { status } = req.query;

    const ownedEventResult = await fetchOwnedEvent(eventId, req.organizer._id);
    if (ownedEventResult.error) {
      return res
        .status(ownedEventResult.error.code)
        .json({ message: ownedEventResult.error.message });
    }

    const query = { eventId };
    if (status) {
      query.status = status;
    }

    const registrations = await Registration.find(query).sort({
      createdAt: -1,
    });

    return res.status(200).json({ registrations });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while fetching registrations." });
  }
}

export async function approveRegistration(req, res) {
  try {
    return updateRegistrationStatus(
      req,
      res,
      "pending",
      "approved",
      "Registration approved successfully.",
    );
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while approving registration." });
  }
}

export async function rejectRegistration(req, res) {
  try {
    return updateRegistrationStatus(
      req,
      res,
      "pending",
      "rejected",
      "Registration rejected successfully.",
    );
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while rejecting registration." });
  }
}

export async function revokeRegistration(req, res) {
  try {
    return updateRegistrationStatus(
      req,
      res,
      "approved",
      "revoked",
      "Registration revoked successfully.",
    );
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while revoking registration." });
  }
}
