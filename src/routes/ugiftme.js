import express from "express";
import { UGiftMeService } from "../services/ugiftme-service.js";
import { logger } from "../utils/logger.js";

const router = express.Router();
const ugiftmeService = new UGiftMeService();
/**
 * @swagger
 * tags:
 *   name: UGiftMe
 *   description: UGiftMe API endpoints
 */

/**
 * @swagger
 * /ugiftme/products/search:
 *   get:
 *     summary: Search products
 *     tags: [UGiftMe]
 *     parameters:
 *       - in: query
 *         name: merchant
 *         schema:
 *           type: string
 *         description: Merchant name to filter products
 *     responses:
 *       200:
 *         description: List of products
 *       500:
 *         description: Server error
 */

router.get("/products/search", async (req, res) => {
  try {
    const { merchant } = req.query;
    const products = await ugiftmeService.searchProducts(merchant);
    res.json({ success: true, data: products });
  } catch (error) {
    logger.error("Failed to search products:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /ugiftme/orders:
 *   get:
 *     summary: Get all orders
 *     tags: [UGiftMe]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of orders
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new order
 *     tags: [UGiftMe]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productCode
 *               - merchant
 *               - currency
 *               - valuePurchased
 *             properties:
 *               productCode:
 *                 type: string
 *               merchant:
 *                 type: string
 *               currency:
 *                 type: string
 *               valuePurchased:
 *                 type: number
 *     responses:
 *       200:
 *         description: Order created successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */

router.get("/orders", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const orders = await ugiftmeService.getOrders(page, limit);
    res.json({ success: true, data: orders });
  } catch (error) {
    logger.error("Failed to fetch orders:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/orders", async (req, res) => {
  try {
    const orderData = req.body;

    const requiredFields = [
      "productCode",
      "merchant",
      "currency",
      "valuePurchased",
    ];
    const missingFields = requiredFields.filter((field) => !orderData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Missing required fields",
        missingFields,
      });
    }

    const order = await ugiftmeService.createOrder(orderData);
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error("Failed to create order:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /ugiftme/orders/{orderId}:
 *   get:
 *     summary: Get specific order details
 *     tags: [UGiftMe]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
 *       500:
 *         description: Server error
 */

router.get("/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await ugiftmeService.getOrder(orderId);
    res.json({ success: true, data: order });
  } catch (error) {
    logger.error("Failed to fetch order:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /ugiftme/orders/{orderId}/activate:
 *   post:
 *     summary: Activate an order
 *     tags: [UGiftMe]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Order activated successfully
 *       500:
 *         description: Server error
 */

router.post("/orders/:orderId/activate", async (req, res) => {
  try {
    const { orderId } = req.params;
    const activationData = req.body;

    const result = await ugiftmeService.activateOrder(orderId, activationData);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error("Failed to activate order:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /ugiftme/orders/search:
 *   get:
 *     summary: Search orders with filters
 *     tags: [UGiftMe]
 *     parameters:
 *       - in: query
 *         name: merchant
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Filtered list of orders
 *       500:
 *         description: Server error
 */

router.get("/orders/search", async (req, res) => {
  try {
    const filters = req.query;
    const orders = await ugiftmeService.searchOrders(filters);
    res.json({ success: true, data: orders });
  } catch (error) {
    logger.error("Failed to search orders:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /ugiftme/wallet:
 *   get:
 *     summary: Get wallet information
 *     tags: [UGiftMe]
 *     responses:
 *       200:
 *         description: Wallet details
 *       500:
 *         description: Server error
 */

// router.get("/wallet", async (req, res) => {
//   try {
//     const wallet = await ugiftmeService.getWallet();
//     res.json({ success: true, data: wallet });
//   } catch (error) {
//     logger.error("Failed to fetch wallet:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

export { router as ugiftmeRoutes };
