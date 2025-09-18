import { MondayService } from "./monday-service.js";
import { PerformanceRewardService } from "./performance-reward-service.js";
import { NotificationService } from "./notification-service.js";
import { logger } from "../utils/logger.js";
import { COLUMN_MAPPINGS } from "../config/constant.js";

export class ApprovalWorkflowService {
  constructor() {
    this.mondayService = new MondayService();
    this.rewardService = new PerformanceRewardService();
    this.notificationService = new NotificationService();
    this.boardId =
      process.env.PERFORMANCE_REWARDS_BOARD_ID || "your-board-id-here";
  }

  
  async processApproval(itemId, managerId, approval, comments = "") {
    try {
      const approvalStatus = approval === "approved" ? "Approved" : "Rejected";
      const approvalDate = new Date().toISOString().split("T")[0];

      
      const updateValues = {
        color_mkvv22d8: { label: approvalStatus },
        text_mkvvj9j2: comments, 
        date_mkvvvs4j: approvalDate, 
      };

      
      await this.mondayService.updateItem(itemId, updateValues, this.boardId);

      
      const response = await this.mondayService.getBoardItems(this.boardId);
      const items = this.extractItems(response);
      const item = items.find((i) => i.id === itemId);

      if (!item) {
        throw new Error("Reward item not found");
      }

      const employeeName = this.getColumnValue(item, "name"); 
      const employeeEmail = this.getColumnValue(item, "text_mkvvj9j2"); 
      const giftCardAmount =
        parseFloat(this.getColumnValue(item, "numeric_mkvvsfzy")) || 0; 

      if (approval === "approved") {
        
        await this.rewardService.issueGiftCard(itemId, giftCardAmount);

        
        await this.notificationService.notifyEmployeeApproval(
          employeeEmail,
          employeeName,
          "approved",
          giftCardAmount,
          comments
        );

        logger.info("Reward approved and gift card issued:", {
          itemId,
          employeeName,
          amount: giftCardAmount,
        });
      } else {
        
        await this.notificationService.notifyEmployeeApproval(
          employeeEmail,
          employeeName,
          "rejected",
          0,
          comments
        );

        logger.info("Reward rejected:", {
          itemId,
          employeeName,
          reason: comments,
        });
      }

      return {
        itemId,
        status: approvalStatus,
        processedBy: managerId,
        processedAt: approvalDate,
        employee: employeeName,
        amount: approval === "approved" ? giftCardAmount : 0,
      };
    } catch (error) {
      logger.error("Failed to process approval:", error);
      throw error;
    }
  }

  
  async getPendingApprovals(managerId) {
    try {
      const response = await this.mondayService.getBoardItems(this.boardId);
      const items = this.extractItems(response);

      
      const pendingApprovals = items.filter((item) => {
        const approvalStatus = this.getColumnValue(item, "status5");
        const assignedManager = this.getColumnValue(item, "person");
        return approvalStatus === "Pending" && assignedManager === managerId;
      });

      return pendingApprovals.map((item) => ({
        itemId: item.id,
        employeeName: this.getColumnValue(item, "text"),
        employeeEmail: this.getColumnValue(item, "email"),
        targetDescription: this.getColumnValue(item, "long_text"),
        targetValue: parseFloat(this.getColumnValue(item, "numbers")) || 0,
        rewardTier: this.getColumnValue(item, "status"),
        giftCardAmount: parseFloat(this.getColumnValue(item, "numbers3")) || 0,
        submittedDate: this.getColumnValue(item, "date"),
        daysPending: this.calculateDaysPending(item.created_at),
      }));
    } catch (error) {
      logger.error("Failed to get pending approvals:", error);
      throw error;
    }
  }

  
  async getAllPendingApprovals() {
    try {
      const response = await this.mondayService.getBoardItems(this.boardId);
      const items = this.extractItems(response);

      const pendingApprovals = items.filter((item) => {
        const approvalStatus = this.getColumnValue(item, "status5");
        return approvalStatus === "Pending";
      });

      return pendingApprovals.map((item) => ({
        itemId: item.id,
        employeeName: this.getColumnValue(item, "text"),
        employeeEmail: this.getColumnValue(item, "email"),
        targetDescription: this.getColumnValue(item, "long_text"),
        targetValue: parseFloat(this.getColumnValue(item, "numbers")) || 0,
        rewardTier: this.getColumnValue(item, "status"),
        giftCardAmount: parseFloat(this.getColumnValue(item, "numbers3")) || 0,
        assignedManager: this.getColumnValue(item, "person"),
        submittedDate: this.getColumnValue(item, "date"),
        daysPending: this.calculateDaysPending(item.created_at),
        isOverdue: this.calculateDaysPending(item.created_at) > 7, 
      }));
    } catch (error) {
      logger.error("Failed to get all pending approvals:", error);
      throw error;
    }
  }

  
  async autoAssignManager(itemId, department) {
    try {
      const managerId = await this.getManagerForDepartment(department);

      if (managerId) {
        await this.mondayService.updateItem(itemId, {
          person: managerId,
        });

        
        const response = await this.mondayService.getBoardItems(this.boardId);
        const items = this.extractItems(response);
        const item = items.find((i) => i.id === itemId);

        if (item) {
          await this.notificationService.notifyManagerOfPendingApproval(
            managerId,
            itemId,
            this.getColumnValue(item, "text"),
            this.getColumnValue(item, "long_text"),
            parseFloat(this.getColumnValue(item, "numbers3")) || 0
          );
        }
      }

      return managerId;
    } catch (error) {
      logger.error("Failed to auto-assign manager:", error);
      return null;
    }
  }

  
  async sendOverdueReminders() {
    try {
      const pendingApprovals = await this.getAllPendingApprovals();
      const overdueApprovals = pendingApprovals.filter(
        (approval) => approval.isOverdue
      );

      for (const approval of overdueApprovals) {
        if (approval.assignedManager) {
          await this.notificationService.sendOverdueApprovalReminder(
            approval.assignedManager,
            approval.itemId,
            approval.employeeName,
            approval.daysPending
          );
        }
      }

      logger.info("Overdue approval reminders sent:", {
        count: overdueApprovals.length,
      });

      return {
        totalOverdue: overdueApprovals.length,
        remindersSent: overdueApprovals.filter((a) => a.assignedManager).length,
      };
    } catch (error) {
      logger.error("Failed to send overdue reminders:", error);
      throw error;
    }
  }

  
  async getApprovalStatistics(period = "month") {
    try {
      const response = await this.mondayService.getBoardItems(this.boardId);
      const items = this.extractItems(response);

      const periodDate = this.getDateForPeriod(period);

      const stats = {
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        totalValue: 0,
        averageProcessingTime: 0,
        overdueCount: 0,
      };

      const processedItems = [];

      items.forEach((item) => {
        const createdAt = new Date(item.created_at);
        if (createdAt >= periodDate) {
          stats.total++;

          const approvalStatus = this.getColumnValue(item, "status5");
          const giftCardAmount =
            parseFloat(this.getColumnValue(item, "numbers3")) || 0;

          stats.totalValue += giftCardAmount;

          if (approvalStatus === "Approved") {
            stats.approved++;
            processedItems.push(item);
          } else if (approvalStatus === "Rejected") {
            stats.rejected++;
            processedItems.push(item);
          } else if (approvalStatus === "Pending") {
            stats.pending++;
            const daysPending = this.calculateDaysPending(item.created_at);
            if (daysPending > 7) {
              stats.overdueCount++;
            }
          }
        }
      });

     
      if (processedItems.length > 0) {
        const totalProcessingTime = processedItems.reduce((total, item) => {
          const approvalDate = this.getColumnValue(item, "date7");
          if (approvalDate) {
            const daysDiff =
              Math.abs(new Date(approvalDate) - new Date(item.created_at)) /
              (1000 * 60 * 60 * 24);
            return total + daysDiff;
          }
          return total;
        }, 0);

        stats.averageProcessingTime =
          Math.round((totalProcessingTime / processedItems.length) * 10) / 10;
      }

      return stats;
    } catch (error) {
      logger.error("Failed to get approval statistics:", error);
      throw error;
    }
  }

  
  extractItems(response) {
    if (response?.boards?.[0]?.items_page) {
      return response.boards[0].items_page.items;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  }

  getColumnValue(item, columnId) {
    const column = item.column_values?.find((col) => col.id === columnId);
    return column ? column.text : null;
  }

  calculateDaysPending(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDateForPeriod(period) {
    const now = new Date();
    switch (period) {
      case "week":
        return new Date(now.setDate(now.getDate() - 7));
      case "month":
        return new Date(now.setMonth(now.getMonth() - 1));
      case "quarter":
        return new Date(now.setMonth(now.getMonth() - 3));
      case "year":
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setMonth(now.getMonth() - 1));
    }
  }

  async getManagerForDepartment(department) {
    const departmentManagers = {
      Sales: "manager-sales-id",
      Marketing: "manager-marketing-id",
      Engineering: "manager-eng-id",
      Support: "manager-support-id",
      Operations: "manager-ops-id",
    };

    return departmentManagers[department] || null;
  }
}
