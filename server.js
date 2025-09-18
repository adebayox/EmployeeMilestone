import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import cron from "node-cron";

import { configureRoutes } from "./src/routes/index.js";
import { logger } from "./src/utils/logger.js";
import { validateEnvironment } from "./src/utils/validation.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

import bodyParser from "body-parser";

// Capture raw body for Monday webhook only
app.use("/api/webhooks/monday", bodyParser.raw({ type: "*/*" }));

// Normal JSON parsing for everything else
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });
  next();
});

// Validate environment on startup
try {
  validateEnvironment();
  logger.info("Environment validation successful");
} catch (error) {
  logger.error("Environment validation failed:", error.message);
  process.exit(1);
}

console.log("Environment variables loaded:");
console.log("MONDAY_ACCESS_TOKEN exists:", !!process.env.MONDAY_ACCESS_TOKEN);
console.log("MONDAY_CLIENT_ID exists:", !!process.env.MONDAY_CLIENT_ID);
console.log("UGIFTME_API_KEY exists:", !!process.env.UGIFTME_API_KEY);

// Configure routes
configureRoutes(app);

// Global error handler
app.use((error, req, res, next) => {
  logger.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Setup periodic tasks
cron.schedule("*/5 * * * *", async () => {
  logger.info("Running periodic order status check...");
  // Add periodic tasks here if needed
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);

  if (process.env.NODE_ENV === "development") {
    logger.info("API Endpoints:");
    logger.info("  POST /api/webhooks/monday - Monday.com webhook");
    logger.info("  GET  /api/orders - List UGiftMe orders");
    logger.info("  POST /api/orders - Create UGiftMe order");
    logger.info("  GET  /api/boards - List Monday.com boards");
    logger.info("  GET  /api/health - Health check");
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});
