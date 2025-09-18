import cron from "node-cron";
import { DailyMilestoneScannerService } from "../services/daily-milestone-scanner-service.js";
import { logger } from "../utils/logger.js";

export class CronJobScheduler {
  constructor() {
    this.milestoneScanner = new DailyMilestoneScannerService();
    this.jobs = new Map();
    this.jobStatus = new Map(); 
  }


  startJobs() {
    logger.info("Starting cron job scheduler...");

    
    this.scheduleDailyMilestoneScan();

    
    this.scheduleWeeklySummary();

    logger.info("Cron jobs started successfully");
  }


  scheduleDailyMilestoneScan() {
    const job = cron.schedule(
      "0 9 * * *",
      async () => {
        this.jobStatus.set("dailyMilestoneScan", {
          running: true,
          scheduled: true,
        });

        logger.info("Executing scheduled daily milestone scan...");

        try {
          const results =
            await this.milestoneScanner.scanAndProcessMilestones();
        } catch (error) {
          logger.error("Scheduled milestone scan failed:", error);
        } finally {
          this.jobStatus.set("dailyMilestoneScan", {
            running: false,
            scheduled: true,
          });
        }
      },
      {
        scheduled: true,
        timezone: "Europe/London",
      }
    );

    this.jobs.set("dailyMilestoneScan", job);
    this.jobStatus.set("dailyMilestoneScan", {
      running: false,
      scheduled: true,
    });
    logger.info("Daily milestone scan scheduled for 9:00 AM");
  }

  scheduleWeeklySummary() {
    const job = cron.schedule(
      "0 10 * * 1",
      async () => {
        logger.info("Generating weekly milestone summary...");

        try {
          logger.info("Weekly summary would be generated here");
        } catch (error) {
          logger.error("Weekly summary generation failed:", error);
        }
      },
      {
        scheduled: true,
        timezone: "Europe/London",
      }
    );

    this.jobs.set("weeklySummary", job);
    logger.info("Weekly summary scheduled for Mondays at 10:00 AM");
  }

  async runMilestoneScanNow() {
    logger.info("Running milestone scan immediately...");

    try {
      const results = await this.milestoneScanner.scanAndProcessMilestones();

      logger.info("Manual milestone scan completed", {
        summary: {
          totalEmployees: results.totalEmployees,
          milestonesToday: results.milestonesToday,
          successful: results.results.filter((r) => r.success).length,
          failed: results.results.filter((r) => !r.success).length,
        },
      });

      return results;
    } catch (error) {
      logger.error("Manual milestone scan failed:", error);
      throw error;
    }
  }


  stopJobs() {
    logger.info("Stopping all cron jobs...");

    for (const [name, job] of this.jobs) {
      job.stop();
      logger.info(`Stopped job: ${name}`);
    }

    this.jobs.clear();
    logger.info("All cron jobs stopped");
  }


  getJobStatus() {
    const status = {};

    for (const [name] of this.jobs) {
      status[name] = this.jobStatus.get(name) || {
        running: false,
        scheduled: true,
      };
    }

    return {
      jobsRunning: this.jobs.size,
      jobs: status,
    };
  }


  scheduleTestScan(delayMinutes = 1) {
    const now = new Date();
    const runTime = new Date(now.getTime() + delayMinutes * 60000);

    logger.info(
      `Scheduling test milestone scan for ${runTime.toLocaleString()}`
    );

    const cronExpression = `${runTime.getMinutes()} ${runTime.getHours()} ${runTime.getDate()} ${
      runTime.getMonth() + 1
    } *`;

    const job = cron.schedule(
      cronExpression,
      async () => {
        logger.info("Executing test milestone scan...");

        try {
          const results =
            await this.milestoneScanner.scanAndProcessMilestones();

          logger.info("Test milestone scan completed", {
            summary: {
              totalEmployees: results.totalEmployees,
              milestonesToday: results.milestonesToday,
              successful: results.results.filter((r) => r.success).length,
              failed: results.results.filter((r) => !r.success).length,
            },
          });

          job.stop();
          this.jobs.delete("testScan");
        } catch (error) {
          logger.error("Test milestone scan failed:", error);
          job.stop();
          this.jobs.delete("testScan");
        }
      },
      {
        scheduled: true,
        timezone: "Europe/London",
      }
    );

    this.jobs.set("testScan", job);
    return runTime;
  }
}
