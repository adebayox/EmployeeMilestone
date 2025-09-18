import express from "express";
import { MondayWebhookHandler } from "../services/monday-webhook-handler.js";
import { logger } from "../utils/logger.js";
import { PerformanceRewardsWebhookHandler } from "../webhooks/performance-rewards-webhook.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Webhooks
 *   description: Endpoints handling Monday.com webhooks
 */

/**
 * @swagger
 * /webhooks/monday:
 *   post:
 *     summary: Handle Monday.com webhook events
 *     description: Receives Monday.com webhook events and processes them with the correct handler.
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               event:
 *                 type: change_column_value
 *                 boardId: "2150077747"
 *                 itemId: "2150077760"
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       401:
 *         description: Invalid signature
 *       500:
 *         description: Webhook processing failed
 */
router.post("/monday", async (req, res) => {
  try {
    const signature = req.headers["x-monday-signature"];
    const rawBody =
      req.body instanceof Buffer
        ? req.body.toString("utf8")
        : JSON.stringify(req.body);

    const payload =
      typeof req.body === "string" || req.body instanceof Buffer
        ? JSON.parse(rawBody)
        : req.body;

    logger.info("Received Monday webhook:", {
      event: payload.event,
      boardId: payload.event?.boardId,
      headers: req.headers,
    });

    const boardId = payload.event?.boardId;
    const milestonesBoardId = process.env.MILESTONES_BOARD_ID;
    const performanceRewardsBoardId = process.env.PERFORMANCE_REWARDS_BOARD_ID;

    let webhookHandler;
    let handlerType;

    if (boardId === performanceRewardsBoardId) {
      webhookHandler = new PerformanceRewardsWebhookHandler();
      handlerType = "Performance Rewards";
    } else {
      webhookHandler = new MondayWebhookHandler();
      handlerType = "Milestones";
    }

    logger.info(`Using ${handlerType} webhook handler for board ${boardId}`);

    if (
      signature &&
      webhookHandler.verifySignature &&
      !webhookHandler.verifySignature(rawBody, signature)
    ) {
      logger.warn("Invalid webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const result = await webhookHandler.processWebhook(payload);

    res.json({ success: true, result, handlerType });
  } catch (error) {
    logger.error("Webhook processing failed:", error);
    res.status(500).json({
      error: "Webhook processing failed",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /webhooks/test:
 *   post:
 *     summary: Test Monday webhook handler
 *     description: Sends a simulated Monday webhook event for development and debugging.
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Test webhook processed successfully
 *       500:
 *         description: Test webhook failed
 */
router.post("/test", async (req, res) => {
  try {
    const webhookHandler = new MondayWebhookHandler();
    const testPayload = {
      event: {
        type: "create_item",
        boardId: "2150077747",
        itemId: "2150077760",
      },
    };

    const finalPayload = req.body.event ? req.body : testPayload;

    const result = await webhookHandler.processWebhook(finalPayload);

    res.json({ success: true, result });
  } catch (error) {
    logger.error("Test webhook failed:", error);
    res.status(500).json({
      error: error.message,
      details: error.stack,
    });
  }
});

// router.get("/debug/products", async (req, res) => {
//   try {
//     const webhookHandler = new MondayWebhookHandler();
//     const { merchant = "Amazon UK" } = req.query;

//     const searchResult = await webhookHandler.ugiftmeService.searchProducts(
//       merchant
//     );

//     const allProductsResult =
//       await webhookHandler.ugiftmeService.getAllProducts(1, 50);
//     const availableMerchants = [
//       ...new Set((allProductsResult?.products || []).map((p) => p.merchant)),
//     ];

//     res.json({
//       searchedMerchant: merchant,
//       searchResults: searchResult,
//       availableMerchants,
//       totalAvailableProducts: allProductsResult?.pagination?.total || 0,
//     });
//   } catch (error) {
//     logger.error("Debug products failed:", error);
//     res.status(500).json({
//       error: error.message,
//       searchedMerchant: req.query.merchant || "Amazon UK",
//     });
//   }
// });

// router.get("/debug/monday", async (req, res) => {
//   try {
//     const webhookHandler = new MondayWebhookHandler();
//     const { boardId = "2150077747" } = req.query;

//     const response = await webhookHandler.mondayService.getBoardItems(boardId);
//     const items = webhookHandler.extractItems(response, boardId);

//     res.json({
//       boardId,
//       itemsCount: items.length,
//       items: items.map((item) => ({
//         id: item.id,
//         name: item.name,
//         columns:
//           item.column_values?.map((col) => ({ id: col.id, text: col.text })) ||
//           [],
//       })),
//       rawResponse: response,
//     });
//   } catch (error) {
//     logger.error("Debug Monday failed:", error);
//     res.status(500).json({
//       error: error.message,
//       boardId: req.query.boardId || "2150077747",
//       stack: error.stack,
//     });
//   }
// });

// router.post("/debug/create-test-item", async (req, res) => {
//   try {
//     const webhookHandler = new MondayWebhookHandler();
//     const { boardId = "2150077747", itemName = "Test Giftcard Item" } =
//       req.body;

//     const result = await webhookHandler.mondayService.createItem(
//       boardId,
//       itemName,
//       {
//         merchant: "Amazon UK",
//         amount: "25",
//         currency: "GBP",
//       }
//     );

//     res.json({
//       success: true,
//       boardId,
//       createdItem: result,
//       message:
//         "Test item created successfully. You can now test the webhook with this item ID.",
//     });
//   } catch (error) {
//     logger.error("Debug create test item failed:", error);
//     res.status(500).json({
//       error: error.message,
//       boardId: req.body.boardId || "2150077747",
//       stack: error.stack,
//     });
//   }
// });

export { router as webhookRoutes };
