import express from "express";
import { PerformanceRewardService } from "../services/performance-reward-service.js";
// import { RewardTierService } from "../services/reward-tier-service.js";
import { ApprovalWorkflowService } from "../services/approval-workflow-service.js";
// import { RedemptionMonitorService } from "../services/redemption-monitor-service.js";
// import { PerformanceAnalyticsService } from "../services/performance-analytics-service.js";
import { logger } from "../utils/logger.js";

const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: PerformanceRewards
 *   description: Endpoints for managing performance rewards, approvals, redemption, and analytics
 */

/**
 * @swagger
 * /api/performance-rewards/create:
 *   post:
 *     summary: Create a new performance reward entry
 *     tags: [PerformanceRewards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeName
 *               - employeeEmail
 *               - targetDescription
 *               - targetValue
 *             properties:
 *               employeeName:
 *                 type: string
 *               employeeEmail:
 *                 type: string
 *               performancePeriod:
 *                 type: string
 *               targetDescription:
 *                 type: string
 *               targetValue:
 *                 type: number
 *               department:
 *                 type: string
 *               managerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Performance reward created successfully
 */

router.post("/create", async (req, res) => {
  try {
    const rewardService = new PerformanceRewardService();
    const {
      employeeName,
      employeeEmail,
      performancePeriod,
      targetDescription,
      targetValue,
      department,
      managerId,
    } = req.body;

    const requiredFields = [
      "employeeName",
      "employeeEmail",
      "targetDescription",
      "targetValue",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        missingFields,
      });
    }

    const result = await rewardService.createPerformanceReward({
      employeeName,
      employeeEmail,
      performancePeriod,
      targetDescription,
      targetValue,
      department,
      managerId,
    });

    res.json({
      success: true,
      message: "Performance reward created successfully",
      data: result,
    });
  } catch (error) {
    logger.error("Failed to create performance reward:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create performance reward",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/performance-rewards:
 *   get:
 *     summary: Get all performance rewards with filters
 *     tags: [PerformanceRewards]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: tier
 *         schema: { type: string }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of performance rewards
 */
router.get("/", async (req, res) => {
  try {
    const rewardService = new PerformanceRewardService();
    const {
      status,
      tier,
      department,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = req.query;

    const filters = {
      status,
      tier,
      department,
      dateFrom,
      dateTo,
    };

    const result = await rewardService.getPerformanceRewards(
      filters,
      page,
      limit
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to fetch performance rewards:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch performance rewards",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/performance-rewards/tiers/configure:
 *   post:
 *     summary: Update reward tier configuration
 *     tags: [PerformanceRewards]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tiers:
 *                 type: array
 *                 items: { type: object }
 *     responses:
 *       200:
 *         description: Reward tiers configured successfully
 */

router.post("/tiers/configure", async (req, res) => {
  try {
    const tierService = new RewardTierService();
    const { tiers } = req.body;

    if (!Array.isArray(tiers)) {
      return res.status(400).json({
        success: false,
        error: "Tiers must be an array",
      });
    }

    await tierService.updateTierConfiguration(tiers);

    res.json({
      success: true,
      message: "Reward tiers configured successfully",
    });
  } catch (error) {
    logger.error("Failed to configure reward tiers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to configure reward tiers",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/performance-rewards/tiers:
 *   get:
 *     summary: Get reward tier configuration
 *     tags: [PerformanceRewards]
 *     responses:
 *       200:
 *         description: List of reward tiers
 */

router.get("/tiers", async (req, res) => {
  try {
    const tierService = new RewardTierService();
    const tiers = await tierService.getTierConfiguration();

    res.json({
      success: true,
      data: tiers,
    });
  } catch (error) {
    logger.error("Failed to fetch reward tiers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch reward tiers",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/performance-rewards/{itemId}/approve:
 *   post:
 *     summary: Process manager approval
 *     tags: [PerformanceRewards]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - managerId
 *               - approval
 *             properties:
 *               managerId:
 *                 type: string
 *               approval:
 *                 type: string
 *                 enum: [approved, rejected]
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Approval processed
 */
router.post("/:itemId/approve", async (req, res) => {
  try {
    const approvalService = new ApprovalWorkflowService();
    const { itemId } = req.params;
    const { managerId, approval, comments } = req.body;

    if (!["approved", "rejected"].includes(approval)) {
      return res.status(400).json({
        success: false,
        error: "Approval must be 'approved' or 'rejected'",
      });
    }

    const result = await approvalService.processApproval(
      itemId,
      managerId,
      approval,
      comments
    );

    res.json({
      success: true,
      message: `Reward ${approval} successfully`,
      data: result,
    });
  } catch (error) {
    logger.error("Failed to process approval:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process approval",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/performance-rewards/approvals/pending:
 *   get:
 *     summary: Get pending approvals for a manager
 *     tags: [PerformanceRewards]
 *     parameters:
 *       - in: query
 *         name: managerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of pending approvals
 */
router.get("/approvals/pending", async (req, res) => {
  try {
    const approvalService = new ApprovalWorkflowService();
    const { managerId } = req.query;

    if (!managerId) {
      return res.status(400).json({
        success: false,
        error: "Manager ID is required",
      });
    }

    const pendingApprovals = await approvalService.getPendingApprovals(
      managerId
    );

    res.json({
      success: true,
      data: pendingApprovals,
    });
  } catch (error) {
    logger.error("Failed to fetch pending approvals:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending approvals",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/performance-rewards/redemption/check:
 *   post:
 *     summary: Check redemption status for all active gift cards
 *     tags: [PerformanceRewards]
 *     responses:
 *       200:
 *         description: Redemption statuses checked
 */
router.post("/redemption/check", async (req, res) => {
  try {
    const redemptionService = new RedemptionMonitorService();
    const results = await redemptionService.checkAllRedemptionStatuses();

    res.json({
      success: true,
      message: "Redemption status check completed",
      data: {
        totalChecked: results.length,
        updated: results.filter((r) => r.updated).length,
        errors: results.filter((r) => r.error).length,
        results,
      },
    });
  } catch (error) {
    logger.error("Failed to check redemption statuses:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check redemption statuses",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/performance-rewards/{itemId}/redemption:
 *   get:
 *     summary: Get redemption status for a specific reward
 *     tags: [PerformanceRewards]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Redemption status
 */
router.get("/:itemId/redemption", async (req, res) => {
  try {
    const redemptionService = new RedemptionMonitorService();
    const { itemId } = req.params;

    const status = await redemptionService.getRedemptionStatus(itemId);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error("Failed to get redemption status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get redemption status",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/performance-rewards/analytics/dashboard:
 *   get:
 *     summary: Get performance analytics dashboard
 *     tags: [PerformanceRewards]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, default: month }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Analytics dashboard data
 */
router.get("/analytics/dashboard", async (req, res) => {
  try {
    const analyticsService = new PerformanceAnalyticsService();
    const { period = "month", department } = req.query;

    const dashboard = await analyticsService.getDashboardData(
      period,
      department
    );

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error("Failed to fetch analytics dashboard:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics dashboard",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/performance-rewards/analytics/report:
 *   get:
 *     summary: Generate performance report
 *     tags: [PerformanceRewards]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: department
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, csv], default: json }
 *     responses:
 *       200:
 *         description: Performance report
 */

router.get("/analytics/report", async (req, res) => {
  try {
    const analyticsService = new PerformanceAnalyticsService();
    const { startDate, endDate, department, format = "json" } = req.query;

    const report = await analyticsService.generateReport({
      startDate,
      endDate,
      department,
      format,
    });

    if (format === "csv") {
      res.set({
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="performance_report.csv"',
      });
      res.send(report);
    } else {
      res.json({
        success: true,
        data: report,
      });
    }
  } catch (error) {
    logger.error("Failed to generate report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate report",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/performance-rewards/expiring:
 *   get:
 *     summary: Get expiring gift cards
 *     tags: [PerformanceRewards]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: Expiring gift cards
 */
router.get("/expiring", async (req, res) => {
  try {
    const redemptionService = new RedemptionMonitorService();
    const { days = 30 } = req.query;

    const expiringCards = await redemptionService.getExpiringGiftCards(
      parseInt(days)
    );

    res.json({
      success: true,
      data: {
        count: expiringCards.length,
        expiringIn: `${days} days`,
        cards: expiringCards,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch expiring gift cards:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch expiring gift cards",
      message: error.message,
    });
  }
});

export { router as performanceRewardsRoutes };
