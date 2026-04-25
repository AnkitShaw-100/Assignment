import express from "express";
import {
  getCurrentOrganizer,
  loginOrganizer,
  logoutOrganizer,
  registerOrganizer,
} from "../controllers/auth-controller.js";
import { protect } from "../middleware/auth-middleware.js";

const router = express.Router();

router.post("/register", registerOrganizer);
router.post("/login", loginOrganizer);
router.post("/logout", logoutOrganizer);
router.get("/me", protect, getCurrentOrganizer);

export default router;
