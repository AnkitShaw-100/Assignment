import express from "express";
import {
  loginOrganizer,
  logoutOrganizer,
  registerOrganizer,
  getCurrentOrganizer,
  getWebhookSettings,
  updateWebhookSettings,
} from "../controllers/auth-controller.js";
import { protect } from "../middleware/auth-middleware.js";

const router = express.Router();

router.post("/register", registerOrganizer);
router.post("/login", loginOrganizer);
router.post("/logout", logoutOrganizer);
router.get("/me", protect, getCurrentOrganizer);
router.get("/webhooks", protect, getWebhookSettings);
router.put("/webhooks", protect, updateWebhookSettings);

export default router;
