import express from "express";
import {
  createEvent,
  getOrganizerEvents,
  getPublicEventBySlug,
  updateEvent,
} from "../controllers/event-controller.js";
import {
  approveRegistration,
  getEventRegistrations,
  rejectRegistration,
  registerForEventBySlug,
  revokeRegistration,
} from "../controllers/registration-controller.js";
import { protect } from "../middleware/auth-middleware.js";

const router = express.Router();

router.post("/", protect, createEvent);
router.get("/mine", protect, getOrganizerEvents);
router.get("/public/:slug", getPublicEventBySlug);
router.post("/public/:slug/register", registerForEventBySlug);
router.get("/:eventId/registrations", protect, getEventRegistrations);
router.patch(
  "/:eventId/registrations/:registrationId/approve",
  protect,
  approveRegistration,
);
router.patch(
  "/:eventId/registrations/:registrationId/reject",
  protect,
  rejectRegistration,
);
router.patch(
  "/:eventId/registrations/:registrationId/revoke",
  protect,
  revokeRegistration,
);
router.patch("/:eventId", protect, updateEvent);
export default router;
