import express from "express";
import { MondayService } from "../services/monday-service.js";
import { UGiftMeService } from "../services/ugiftme-service.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API and connected services (Monday.com and UGiftMe).
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Services are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 environment:
 *                   type: string
 *                 services:
 *                   type: object
 *                   properties:
 *                     monday:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                     ugiftme:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *       503:
 *         description: One or more services are unhealthy (degraded state)
 */
router.get("/", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: {},
  };

  try {
    // Check Monday.com connectivity
    const mondayService = new MondayService();
    await mondayService.healthCheck();
    health.services.monday = { status: "healthy" };
  } catch (error) {
    health.services.monday = {
      status: "unhealthy",
      error: error.message,
    };
    health.status = "degraded";
  }

  try {
    // Check UGiftMe connectivity
    const ugiftmeService = new UGiftMeService();
    await ugiftmeService.healthCheck();
    health.services.ugiftme = { status: "healthy" };
  } catch (error) {
    health.services.ugiftme = {
      status: "unhealthy",
      error: error.message,
    };
    health.status = "degraded";
  }

  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
});

export { router as healthRoutes };
