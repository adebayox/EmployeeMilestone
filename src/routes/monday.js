import express from "express";
import { MondayService } from "../services/monday-service.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Monday
 *   description: Endpoints for interacting with Monday.com API
 */

/**
 * @swagger
 * /api/monday/boards:
 *   get:
 *     summary: Get all boards
 *     tags: [Monday]
 *     responses:
 *       200:
 *         description: List of boards
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/boards", async (req, res) => {
  try {
    const mondayService = new MondayService();
    const boards = await mondayService.getBoards();
    res.json({ success: true, data: boards });
  } catch (error) {
    logger.error("Failed to fetch boards:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/monday/boards/{boardId}/items:
 *   get:
 *     summary: Get board items
 *     tags: [Monday]
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the board
 *     responses:
 *       200:
 *         description: List of items from the board
 */
router.get("/boards/:boardId/items", async (req, res) => {
  try {
    const mondayService = new MondayService();
    const { boardId } = req.params;
    const items = await mondayService.getBoardItems(boardId);
    res.json({ success: true, data: items });
  } catch (error) {
    logger.error("Failed to fetch board items:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/monday/boards/{boardId}/items:
 *   post:
 *     summary: Create a new item
 *     tags: [Monday]
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the board
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               itemName:
 *                 type: string
 *               columnValues:
 *                 type: object
 *     responses:
 *       200:
 *         description: Item created successfully
 */
router.post("/boards/:boardId/items", async (req, res) => {
  try {
    const mondayService = new MondayService();
    const { boardId } = req.params;
    const { itemName, columnValues } = req.body;

    const item = await mondayService.createItem(
      boardId,
      itemName,
      columnValues
    );
    res.json({ success: true, data: item });
  } catch (error) {
    logger.error("Failed to create item:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/monday/items/{itemId}:
 *   patch:
 *     summary: Update item column values
 *     tags: [Monday]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               columnValues:
 *                 type: object
 *     responses:
 *       200:
 *         description: Item updated successfully
 */
router.patch("/items/:itemId", async (req, res) => {
  try {
    const mondayService = new MondayService();
    const { itemId } = req.params;
    const { columnValues } = req.body;

    const result = await mondayService.updateItem(itemId, columnValues);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error("Failed to update item:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/monday/oauth/callback:
 *   get:
 *     summary: OAuth callback handler
 *     tags: [Monday]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OAuth tokens received
 */
router.get("/oauth/callback", async (req, res) => {
  try {
    const mondayService = new MondayService();
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: "Authorization code required" });
    }

    const tokens = await mondayService.exchangeCodeForTokens(code);

    logger.info("OAuth tokens received", { tokens });

    res.json({
      success: true,
      message: "Authorization successful",
      tokens,
    });
  } catch (error) {
    logger.error("OAuth callback failed:", error);
    res.status(500).json({ error: error.message });
  }
});

export { router as mondayRoutes };
