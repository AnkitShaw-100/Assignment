import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { connectToDatabase } from "./lib/db-connect.js";
import authRoutes from "./routes/auth-routes.js";
import eventRoutes from "./routes/event-routes.js";
import organizationRoutes from "./routes/organization-routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/organisations", organizationRoutes);
app.use("/api/events", eventRoutes);

async function startServer() {
  try {
    await connectToDatabase(); // wait for DB

    app.listen(PORT, () => {
      console.log(`Server started at port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

app.get("/", (req, res) => {
  res.send("Connected to MongoDB!");
});

startServer();
