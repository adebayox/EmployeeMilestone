import express from "express";
import { DailyMilestoneScannerService } from "../services/daily-milestone-scanner-service.js";
import { MilestoneCalculatorService } from "../services/milestone-calculator-service.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Milestones
 *   description: Employee milestone management
 */

/**
 * @swagger
 * /api/milestones/scan:
 *   post:
 *     summary: Manually trigger a milestone scan
 *     tags: [Milestones]
 *     responses:
 *       200:
 *         description: Milestone scan completed
 *       500:
 *         description: Failed to run milestone scan
 */
router.post("/scan", async (req, res) => {
  try {
    logger.info("Manual milestone scan triggered via API");

    const scanner = new DailyMilestoneScannerService();
    const results = await scanner.scanAndProcessMilestones();

    res.json({
      success: true,
      message: "Milestone scan completed",
      data: {
        summary: {
          totalEmployees: results.totalEmployees,
          milestonesToday: results.milestonesToday,
          processed: results.results.length,
          successful: results.results.filter((r) => r.success).length,
          failed: results.results.filter((r) => !r.success).length,
        },
        results: results.results,
      },
    });
  } catch (error) {
    logger.error("Manual milestone scan failed:", error);
    res.status(500).json({
      success: false,
      error: "Milestone scan failed",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/milestones/employees:
 *   get:
 *     summary: Get employee data from Monday.com
 *     tags: [Milestones]
 *     responses:
 *       200:
 *         description: List of employees
 *       500:
 *         description: Failed to fetch employees
 */
router.get("/employees", async (req, res) => {
  try {
    const scanner = new DailyMilestoneScannerService();
    const employees = await scanner.getEmployeeData();

    res.json({
      success: true,
      data: {
        count: employees.length,
        employees: employees.map((emp) => ({
          id: emp.itemId,
          name: emp.name,
          email: emp.email,
          hireDate: emp.hireDate,
          birthday: emp.birthday,
          department: emp.department,
          nextMilestoneDate: emp.nextMilestoneDate,
          milestoneType: emp.milestoneType,
          processingStatus: emp.processingStatus,
          lastProcessed: emp.lastProcessed,
        })),
      },
    });
  } catch (error) {
    logger.error("Failed to fetch employees:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch employees",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/milestones/employees/{itemId}/milestone:
 *   get:
 *     summary: Calculate next milestone for an employee
 *     tags: [Milestones]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Monday.com item ID of the employee
 *     responses:
 *       200:
 *         description: Next milestone calculated
 *       404:
 *         description: Employee not found
 *       500:
 *         description: Failed to calculate milestone
 */
router.get("/employees/:itemId/milestone", async (req, res) => {
  try {
    const { itemId } = req.params;

    const scanner = new DailyMilestoneScannerService();
    const employees = await scanner.getEmployeeData();

    const employee = employees.find((emp) => emp.itemId === itemId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    const calculator = new MilestoneCalculatorService();
    const nextMilestone = calculator.calculateNextMilestone(
      employee.hireDate,
      employee.birthday
    );

    res.json({
      success: true,
      data: {
        employee: {
          name: employee.name,
          hireDate: employee.hireDate,
          birthday: employee.birthday,
        },
        nextMilestone,
      },
    });
  } catch (error) {
    logger.error("Failed to calculate milestone:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate milestone",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/milestones/today:
 *   get:
 *     summary: Get today's milestones
 *     tags: [Milestones]
 *     responses:
 *       200:
 *         description: List of today's milestones
 *       500:
 *         description: Failed to check today's milestones
 */
router.get("/today", async (req, res) => {
  try {
    const scanner = new DailyMilestoneScannerService();
    const employees = await scanner.getEmployeeData();
    const milestonesToday = scanner.findTodaysMilestones(employees);

    res.json({
      success: true,
      data: {
        date: new Date().toDateString(),
        count: milestonesToday.length,
        milestones: milestonesToday.map((milestone) => ({
          employee: milestone.name,
          email: milestone.email,
          milestoneType: milestone.milestoneType,
          amount: milestone.amount,
          yearsOfService: milestone.yearsOfService,
        })),
      },
    });
  } catch (error) {
    logger.error("Failed to check today's milestones:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check today's milestones",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/milestones/cron/status:
 *   get:
 *     summary: Get cron job status
 *     tags: [Milestones]
 *     responses:
 *       200:
 *         description: Cron job status
 *       500:
 *         description: Failed to fetch cron status
 */
router.get("/cron/status", (req, res) => {
  try {
    const scheduler = req.app.get("cronScheduler");

    if (!scheduler) {
      return res.status(500).json({
        success: false,
        error: "Cron scheduler not initialized",
      });
    }

    const status = scheduler.getJobStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get cron status",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/milestones/cron/run-now:
 *   post:
 *     summary: Run milestone scan immediately
 *     tags: [Milestones]
 *     responses:
 *       200:
 *         description: Milestone scan executed
 *       500:
 *         description: Failed to run scan
 */
router.post("/cron/run-now", async (req, res) => {
  try {
    const scheduler = req.app.get("cronScheduler");

    if (!scheduler) {
      return res.status(500).json({
        success: false,
        error: "Cron scheduler not initialized",
      });
    }

    const results = await scheduler.runMilestoneScanNow();

    res.json({
      success: true,
      message: "Milestone scan executed immediately",
      data: {
        summary: {
          totalEmployees: results.totalEmployees,
          milestonesToday: results.milestonesToday,
          processed: results.results.length,
          successful: results.results.filter((r) => r.success).length,
          failed: results.results.filter((r) => !r.success).length,
        },
        results: results.results,
      },
    });
  } catch (error) {
    logger.error("Immediate milestone scan failed:", error);
    res.status(500).json({
      success: false,
      error: "Immediate milestone scan failed",
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /api/milestones/cron/schedule-test:
 *   post:
 *     summary: Schedule a test milestone scan
 *     tags: [Milestones]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               delayMinutes:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Test milestone scan scheduled
 *       500:
 *         description: Failed to schedule test scan
 */
router.post("/cron/schedule-test", (req, res) => {
  try {
    const scheduler = req.app.get("cronScheduler");
    const { delayMinutes = 1 } = req.body;

    if (!scheduler) {
      return res.status(500).json({
        success: false,
        error: "Cron scheduler not initialized",
      });
    }

    const runTime = scheduler.scheduleTestScan(delayMinutes);

    res.json({
      success: true,
      message: "Test milestone scan scheduled",
      data: {
        scheduledFor: runTime.toLocaleString(),
        delayMinutes,
      },
    });
  } catch (error) {
    logger.error("Failed to schedule test scan:", error);
    res.status(500).json({
      success: false,
      error: "Failed to schedule test scan",
      message: error.message,
    });
  }
});

export { router as milestoneRoutes };
