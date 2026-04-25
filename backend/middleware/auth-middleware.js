import jwt from "jsonwebtoken";
import Organizer from "../model/Organizer.js";

export async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;
    const token = req.cookies?.token || bearerToken;

    if (!token) {
      return res
        .status(401)
        .json({ message: "Authorization token is missing." });
    }

    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    const decoded = jwt.verify(token, secret);

    const organizer = await Organizer.findById(decoded.organizerId).select(
      "-password",
    );
    if (!organizer) {
      return res
        .status(401)
        .json({ message: "Invalid token: organizer not found." });
    }

    req.organizer = organizer;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}
