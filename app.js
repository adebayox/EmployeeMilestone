import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { webhookRoutes } from "./src/routes/webhooks.js";
import { mondayRoutes } from "./src/routes/monday.js";
import { ugiftmeRoutes } from "./src/routes/ugiftme.js";
import { milestoneRoutes } from "./src/routes/milestone.js"; // New milestone routes
import { CronJobScheduler } from "./src/jobs/cron-job-scheduler.js"; // Cron scheduler
import { logger } from "./src/utils/logger.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { performanceRewardsRoutes } from "./src/routes/performance-rewards.js";

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import swaggerOptions from "./swaggerOptions.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const cronScheduler = new CronJobScheduler();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const specs = swaggerJsdoc(swaggerOptions);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

app.set("cronScheduler", cronScheduler);

app.use((req, res, next) => {
  logger.info("Incoming request:", {
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
  next();
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Employee Milestone Rewards API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    services: {
      monday: !!process.env.MONDAY_ACCESS_TOKEN,
      ugiftme: !!process.env.UGIFTME_API_KEY,
      cronJobs: cronScheduler.getJobStatus(),
    },
  });
});

app.use("/api/webhooks", webhookRoutes);
app.use("/api/monday", mondayRoutes);
app.use("/api/ugiftme", ugiftmeRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/performance-rewards", performanceRewardsRoutes);

app.get("/health", async (req, res) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        monday: {
          configured: !!process.env.MONDAY_ACCESS_TOKEN,
          status: "unknown",
        },
        ugiftme: {
          configured: !!process.env.UGIFTME_API_KEY,
          status: "unknown",
        },
        cronJobs: {
          scheduler: "running",
          jobs: cronScheduler.getJobStatus(),
        },
      },
    };

    res.json(health);
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.use((error, req, res, next) => {
  logger.error("Unhandled error:", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: error.message,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully...");

  cronScheduler.stopJobs();

  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully...");

  cronScheduler.stopJobs();

  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });

  cronScheduler.startJobs();

  logger.info("Employee Milestone Rewards System initialized", {});
});

export default app;
