import cron from "node-cron";
// import { RedemptionMonitorService } from "../services/redemption-monitor-service.js";
import { ApprovalWorkflowService } from "../services/approval-workflow-service.js";
import { PerformanceAnalyticsService } from "../services/performance-analytics-service.js";
import { logger } from "../utils/logger.js";

export class PerformanceRewardsCron {
  constructor() {
    this.redemptionService = new RedemptionMonitorService();
    this.approvalService = new ApprovalWorkflowService();
    this.analyticsService = new PerformanceAnalyticsService();
    this.jobs = new Map();
  }

  startJobs() {
    logger.info("Starting performance rewards cron jobs...");

    this.scheduleRedemptionMonitoring();
    this.scheduleOverdueApprovalReminders();
    this.scheduleExpiryWarnings();
    this.scheduleMonthlyReports();

    logger.info("Performance rewards cron jobs started successfully");
  }

  scheduleRedemptionMonitoring() {
    const job = cron.schedule(
      "0 10 * * *",
      async () => {
        logger.info("Starting daily redemption status check...");

        try {
          const results =
            await this.redemptionService.checkAllRedemptionStatuses();

          logger.info("Daily redemption check completed", {
            totalChecked: results.length,
            updated: results.filter((r) => r.updated).length,
            errors: results.filter((r) => r.error).length,
          });
        } catch (error) {
          logger.error("Daily redemption check failed:", error);
        }
      },
      {
        scheduled: true,
        timezone: "Europe/London",
      }
    );

    this.jobs.set("redemptionMonitoring", job);
    logger.info("Redemption monitoring scheduled for 10:00 AM daily");
  }

  scheduleOverdueApprovalReminders() {
    const job = cron.schedule(
      "30 9 * * *",
      async () => {
        logger.info("Checking for overdue approvals...");

        try {
          const results = await this.approvalService.sendOverdueReminders();

          logger.info("Overdue approval reminders processed", {
            totalOverdue: results.totalOverdue,
            remindersSent: results.remindersSent,
          });
        } catch (error) {
          logger.error("Overdue approval reminders failed:", error);
        }
      },
      {
        scheduled: true,
        timezone: "Europe/London",
      }
    );

    this.jobs.set("overdueReminders", job);
    logger.info("Overdue approval reminders scheduled for 9:30 AM daily");
  }

  scheduleExpiryWarnings() {
    const job = cron.schedule(
      "0 8 * * *",
      async () => {
        logger.info("Checking for expiring gift cards...");

        try {
          const expiringCards =
            await this.redemptionService.getExpiringGiftCards(30);

          logger.info("Expiry warnings processed", {
            total: expiringCards.length,
            expiringSoon: expiringCards.filter(
              (card) => card.daysUntilExpiry <= 7
            ).length,
          });
        } catch (error) {
          logger.error("Expiry warnings failed:", error);
        }
      },
      {
        scheduled: true,
        timezone: "Europe/London",
      }
    );

    this.jobs.set("expiryWarnings", job);
    logger.info("Expiry warnings scheduled for 8:00 AM daily");
  }

  scheduleMonthlyReports() {
    const job = cron.schedule(
      "0 9 1 * *",
      async () => {
        logger.info("Generating monthly performance report...");

        try {
          const report = await this.analyticsService.generateReport({
            startDate: this.getLastMonthStart(),
            endDate: this.getLastMonthEnd(),
          });

          logger.info("Monthly report generated", {
            period: `${this.getLastMonthStart()} to ${this.getLastMonthEnd()}`,
            totalRecords: report.metadata.totalRecords,
          });
        } catch (error) {
          logger.error("Monthly report generation failed:", error);
        }
      },
      {
        scheduled: true,
        timezone: "Europe/London",
      }
    );

    this.jobs.set("monthlyReports", job);
    logger.info("Monthly reports scheduled for 1st of each month at 9:00 AM");
  }

  async runRedemptionCheckNow() {
    logger.info("Running immediate redemption check...");

    try {
      const results = await this.redemptionService.checkAllRedemptionStatuses();

      logger.info("Immediate redemption check completed", {
        totalChecked: results.length,
        updated: results.filter((r) => r.updated).length,
        errors: results.filter((r) => r.error).length,
      });

      return results;
    } catch (error) {
      logger.error("Immediate redemption check failed:", error);
      throw error;
    }
  }

  async runExpiryCheckNow() {
    logger.info("Running immediate expiry check...");

    try {
      const expiringCards = await this.redemptionService.getExpiringGiftCards(
        30
      );

      logger.info("Immediate expiry check completed", {
        total: expiringCards.length,
        expiringSoon: expiringCards.filter((card) => card.daysUntilExpiry <= 7)
          .length,
      });

      return expiringCards;
    } catch (error) {
      logger.error("Immediate expiry check failed:", error);
      throw error;
    }
  }

  stopJobs() {
    logger.info("Stopping performance rewards cron jobs...");

    for (const [name, job] of this.jobs) {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    }

    this.jobs.clear();
    logger.info("All performance rewards cron jobs stopped");
  }

  getJobStatus() {
    const status = {};

    for (const [name] of this.jobs) {
      status[name] = {
        running: true,
        scheduled: true,
      };
    }

    return {
      jobsRunning: this.jobs.size,
      jobs: status,
    };
  }

  getLastMonthStart() {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    date.setDate(1);
    return date.toISOString().split("T")[0];
  }

  getLastMonthEnd() {
    const date = new Date();
    date.setDate(0);
    return date.toISOString().split("T")[0];
  }
}
