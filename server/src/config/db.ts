import mongoose from "mongoose";
import dns from "dns";
import { seedDefaultPackages } from "../models/Package";

// Set public DNS resolvers ONLY in local development (Node on Windows/Mac) to resolve Atlas SRV records.
// On Vercel / AWS Lambda, skip custom DNS so Vercel VPC internal DNS resolves natively.
if (!process.env.VERCEL && !process.env.NOW_REGION) {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  } catch {
    // Ignore if custom DNS setting is restricted
  }
}

let dbPromise: Promise<typeof mongoose | null> | null = null;

export const connectDB = async (): Promise<typeof mongoose | null> => {
  // 1. If already connected, return immediately (0ms delay)
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // 2. If a connection is already in progress, reuse the existing promise (prevents concurrent race delays)
  if (dbPromise) {
    return dbPromise;
  }

  const primaryUri = process.env.MONGO_URI;
  const isProduction =
    process.env.NODE_ENV === "production" || !!process.env.VERCEL;

  if (!primaryUri && isProduction) {
    const errorMsg =
      "[MongoDB] FATAL: MONGO_URI environment variable is missing in production!";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Register disconnect listener (only once)
  if (mongoose.connection.listeners("disconnected").length === 0) {
    mongoose.connection.on("disconnected", () => {
      console.log("MongoDB disconnected.");
      dbPromise = null;
    });
  }

  dbPromise = (async () => {
    try {
      const uriToConnect = primaryUri || "mongodb://127.0.0.1:27017/ai-crm";
      const conn = await mongoose.connect(uriToConnect, {
        serverSelectionTimeoutMS: 10000, // 10s timeout for serverless cold starts
        connectTimeoutMS: 10000, // 10s timeout for serverless cold starts
      });
      console.log("✅ MongoDB connected successfully.");

      // Lazily seed default packages once upon initial connection
      try {
        await seedDefaultPackages();
      } catch (seedErr: any) {
        console.warn("[MongoDB Seeder Warning]", seedErr.message);
      }

      return conn;
    } catch (primaryErr: any) {
      console.error(
        "[MongoDB Error] Connection failed:",
        primaryErr?.message || primaryErr,
      );
      dbPromise = null;

      // On Vercel/Production, fail clearly and throw error so Vercel logs show exact cause
      if (isProduction) {
        throw primaryErr;
      }

      // Local fallback only if MONGO_URI was set but local dev DB is available
      if (primaryUri) {
        try {
          console.log("[MongoDB] Attempting local MongoDB fallback...");
          const localFallbackUri = "mongodb://127.0.0.1:27017/ai-crm";
          const conn = await mongoose.connect(localFallbackUri, {
            serverSelectionTimeoutMS: 2000,
          });
          console.log("Connected to local MongoDB fallback.");
          return conn;
        } catch (fallbackErr: any) {
          console.error(
            "[MongoDB Error] Local fallback failed:",
            fallbackErr?.message,
          );
          return null;
        }
      }

      return null;
    }
  })();

  return dbPromise;
};
