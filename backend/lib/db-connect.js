import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const mongoDBURL = process.env.MONGODB_URL;

if (!mongoDBURL) {
  console.error("MONGODB_URL is not defined in environment variables.");
  process.exit(1);
}

export async function connectToDatabase() {
  try {
    await mongoose.connect(mongoDBURL, {
      family: 4,
    });
    console.log("Connection Successful");
  } catch (err) {
    console.error("Connection Error:", err);
    throw err;
  }
}
