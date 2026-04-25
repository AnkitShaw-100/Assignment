import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Organizer from "../model/Organizer.js";

function createToken(organizerId) {
  const secret = process.env.JWT_SECRET || "dev_secret_change_me";
  return jwt.sign({ organizerId }, secret, { expiresIn: "7d" });
}

function buildCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export async function registerOrganizer(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingOrganizer = await Organizer.findOne({
      email: normalizedEmail,
    });

    if (existingOrganizer) {
      return res
        .status(409)
        .json({ message: "Organizer already exists with this email." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const organizer = await Organizer.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = createToken(organizer._id.toString());

    res.cookie("token", token, buildCookieOptions());

    return res.status(201).json({
      message: "Organizer registered successfully.",
      organizer: {
        id: organizer._id,
        name: organizer.name,
        email: organizer.email,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while registering organizer." });
  }
}

export async function loginOrganizer(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const organizer = await Organizer.findOne({ email: normalizedEmail });

    if (!organizer) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordMatch = await bcrypt.compare(password, organizer.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = createToken(organizer._id.toString());

    res.cookie("token", token, buildCookieOptions());

    return res.status(200).json({
      message: "Login successful.",
      organizer: {
        id: organizer._id,
        name: organizer.name,
        email: organizer.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error while logging in." });
  }
}

export async function getCurrentOrganizer(req, res) {
  try {
    return res.status(200).json({
      organizer: {
        id: req.organizer._id,
        name: req.organizer.name,
        email: req.organizer.email,
        zapierWebhookUrl: req.organizer.zapierWebhookUrl || null,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while fetching organizer profile." });
  }
}

export async function logoutOrganizer(req, res) {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });

    return res.status(200).json({ message: "Logout successful." });
  } catch (error) {
    return res.status(500).json({ message: "Server error while logging out." });
  }
}

export async function getWebhookSettings(req, res) {
  try {
    return res.status(200).json({
      zapierWebhookUrl: req.organizer.zapierWebhookUrl || null,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while fetching webhook settings." });
  }
}

export async function updateWebhookSettings(req, res) {
  try {
    const rawUrl =
      typeof req.body?.zapierWebhookUrl === "string"
        ? req.body.zapierWebhookUrl.trim()
        : "";
    if (!rawUrl) {
      req.organizer.zapierWebhookUrl = null;
      await req.organizer.save();
      return res
        .status(200)
        .json({ message: "Webhook URL cleared.", zapierWebhookUrl: null });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
    } catch (_error) {
      return res
        .status(400)
        .json({ message: "Please enter a valid webhook URL." });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return res
        .status(400)
        .json({ message: "Webhook URL must use HTTP or HTTPS." });
    }

    req.organizer.zapierWebhookUrl = parsedUrl.toString();
    await req.organizer.save();
    return res.status(200).json({
      message: "Webhook URL saved.",
      zapierWebhookUrl: req.organizer.zapierWebhookUrl,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error while updating webhook settings." });
  }
}
