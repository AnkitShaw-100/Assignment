import Event from "../model/Events.js";
import Organizer from "../model/Organizer.js";
import Registration from "../model/Registrations.js";
import { sendOrganizerWebhook } from "../lib/webhook-service.js";

function createSlugBase(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function createUniqueSlug(title) {
  const baseSlug = createSlugBase(title) || "event";
  let slug = baseSlug;
  let suffix = 1;

  while (await Event.findOne({ slug })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

export async function createEvent(req, res) {
  try {
    const {
      title,
      description,
      date,
      venue,
      mode,
      capacity,
      registrationMode,
      status,
    } = req.body;

    if (!title || !date || capacity === undefined || capacity === null) {
      return res
        .status(400)
        .json({ message: "Title, date, and capacity are required." });
    }

    const eventDate = new Date(date);
    if (Number.isNaN(eventDate.getTime())) {
      return res
        .status(400)
        .json({ message: "A valid event date is required." });
    }

    const event = await Event.create({
      title: title.trim(),
      description: description?.trim(),
      date: eventDate,
      venue: venue?.trim(),
      mode,
      capacity,
      registrationMode,
      status,
      organizerId: req.organizer._id,
      slug: await createUniqueSlug(title),
    });

    try {
      const organizer = await Organizer.findById(req.organizer._id);
      if (organizer) {
        await sendOrganizerWebhook({
          organizer,
          event,
          eventType: "event.created",
        });
      }
    } catch (webhookErr) {
      console.error("Webhook delivery error (event.created):", webhookErr);
    }

    return res.status(201).json({
      message: "Event created successfully.",
      event,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while creating event." });
  }
}

export async function getOrganizerEvents(req, res) {
  try {
    const events = await Event.find({ organizerId: req.organizer._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({ events });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while fetching organizer events." });
  }
}

export async function getPublicEventBySlug(req, res) {
  try {
    const { slug } = req.params;

    const event = await Event.findOne({ slug }).select(
      "title description date venue slug capacity status registrationMode",
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const registeredCount = await Registration.countDocuments({
      eventId: event._id,
      status: { $in: ["pending", "registered", "approved"] },
    });

    return res.status(200).json({
      event,
      registeredCount,
      availableSpots: Math.max(event.capacity - registeredCount, 0),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while fetching public event details." });
  }
}

export async function updateEvent(req, res) {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({
      _id: eventId,
      organizerId: req.organizer._id,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }

    const allowedFields = [
      "title",
      "description",
      "date",
      "venue",
      "mode",
      "capacity",
      "registrationMode",
      "status",
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) event[field] = req.body[field];
    });

    await event.save();

    return res
      .status(200)
      .json({ message: "Event updated successfully.", event });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while updating event." });
  }
}
