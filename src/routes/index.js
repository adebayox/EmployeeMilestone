import { mondayRoutes } from "./monday.js";
import { ugiftmeRoutes } from "./ugiftme.js";
import { webhookRoutes } from "./webhooks.js";
import { healthRoutes } from "./health.js";

/**
 * @param {Express} app
 */
export function configureRoutes(app) {
  app.use("/api/health", healthRoutes);

  app.use("/api/webhooks", webhookRoutes);

  app.use("/api/monday", mondayRoutes);

  app.use("/api/ugiftme", ugiftmeRoutes);

  app.get("/", (req, res) => {
    res.json({
      name: "Monday.com & UGiftMe Integration",
      version: "1.0.0",
      status: "running",
      endpoints: {
        health: "/api/health",
        webhooks: "/api/webhooks",
        monday: "/api/monday",
        ugiftme: "/api/ugiftme",
      },
    });
  });
}
