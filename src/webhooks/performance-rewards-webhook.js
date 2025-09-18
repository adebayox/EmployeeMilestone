import { MondayService } from "../services/monday-service.js";
import { PerformanceRewardService } from "../services/performance-reward-service.js";
import { ApprovalWorkflowService } from "../services/approval-workflow-service.js";
// import { RedemptionMonitorService } from "../services/redemption-monitor-service.js";
import { logger } from "../utils/logger.js";

export class PerformanceRewardsWebhookHandler {
  constructor() {
    this.mondayService = new MondayService();
    this.rewardService = new PerformanceRewardService();
    this.approvalService = new ApprovalWorkflowService();
    // this.redemptionService = new RedemptionMonitorService();
    this.boardId = process.env.PERFORMANCE_REWARDS_BOARD_ID;
  }

  async processWebhook(payload) {
    const { event } = payload;

    if (!event) {
      throw new Error("Invalid webhook payload - missing event");
    }

    if (event.boardId !== this.boardId) {
      return { message: "Event not for performance rewards board, ignored" };
    }

    logger.info("Processing performance rewards webhook:", {
      type: event.type,
      boardId: event.boardId,
      itemId: event.itemId,
    });

    switch (event.type) {
      case "create_item":
        return await this.handleRewardCreated(event);
      case "change_status_column_value":
        return await this.handleStatusChanged(event);
      case "change_column_value":
        return await this.handleColumnValueChanged(event);
      default:
        logger.info("Unhandled performance rewards webhook event:", event.type);
        return { message: "Event acknowledged but not processed" };
    }
  }

  async handleRewardCreated(event) {
    try {
      const { boardId, itemId } = event;

      logger.info("Performance reward item created:", { itemId, boardId });

      const response = await this.mondayService.getBoardItems(boardId);
      const items = this.extractItems(response);
      const newItem = items.find((item) => item.id === itemId.toString());

      if (!newItem) {
        logger.error("Newly created performance reward not found", {
          itemId,
          boardId,
        });
        return { message: `Item ${itemId} not found on board ${boardId}` };
      }

      const targetValue =
        parseFloat(this.getColumnValue(newItem, "numbers")) || 0;
      const department = this.getColumnValue(newItem, "dropdown");

      if (targetValue > 0) {
        const tierService = new (
          await import("../services/reward-tier-service.js")
        ).RewardTierService();
        const rewardTier = await tierService.calculateRewardTier(
          targetValue,
          department
        );
        const giftCardAmount = await tierService.getAmountForTier(rewardTier);

        const updateValues = {
          status: rewardTier,
          numbers3: giftCardAmount,
        };

        await this.mondayService.updateItem(itemId, updateValues);

        logger.info("Performance reward auto-calculated:", {
          itemId,
          targetValue,
          rewardTier,
          giftCardAmount,
        });

        if (department) {
          const assignedManager = await this.approvalService.autoAssignManager(
            itemId,
            department
          );

          if (assignedManager) {
            logger.info("Manager auto-assigned:", {
              itemId,
              department,
              managerId: assignedManager,
            });
          }
        }

        return {
          message: "Performance reward created and configured",
          itemId,
          rewardTier,
          giftCardAmount,
          autoAssignedManager: !!department,
        };
      }

      return {
        message: "Performance reward created but requires manual configuration",
        itemId,
        targetValue,
      };
    } catch (error) {
      logger.error("Error handling performance reward creation:", error);
      throw error;
    }
  }

  async handleStatusChanged(event) {
    try {
      const { value, itemId, columnId } = event;

      if (columnId === "status5" || this.isApprovalColumn(columnId)) {
        const approvalStatus = value?.label;

        if (approvalStatus === "Approved") {
          logger.info("Performance reward approved via webhook:", { itemId });

          const response = await this.mondayService.getBoardItems(this.boardId);
          const items = this.extractItems(response);
          const item = items.find((i) => i.id === itemId.toString());

          if (item) {
            const giftCardAmount =
              parseFloat(this.getColumnValue(item, "numbers3")) || 0;

            const result = await this.rewardService.issueGiftCard(
              itemId,
              giftCardAmount
            );

            return {
              message: "Performance reward approved and gift card issued",
              itemId,
              giftCardCode: result.giftCardCode,
              amount: giftCardAmount,
            };
          }
        } else if (approvalStatus === "Rejected") {
          logger.info("Performance reward rejected via webhook:", { itemId });

          await this.mondayService.updateItem(itemId, {
            date7: new Date().toISOString().split("T")[0],
          });

          return {
            message: "Performance reward rejected",
            itemId,
            status: "Rejected",
          };
        }
      }

      return {
        message: "Status change processed",
        itemId,
        newStatus: value?.label,
      };
    } catch (error) {
      logger.error("Error handling performance reward status change:", error);
      throw error;
    }
  }

  async handleColumnValueChanged(event) {
    try {
      const { columnId, itemId, value } = event;

      logger.info("Performance reward column changed:", {
        itemId,
        columnId,
        newValue: value?.text,
      });

      if (columnId === "numbers" && value?.text) {
        const targetValue = parseFloat(value.text);

        if (targetValue > 0) {
          const response = await this.mondayService.getBoardItems(this.boardId);
          const items = this.extractItems(response);
          const item = items.find((i) => i.id === itemId.toString());

          if (item) {
            const department = this.getColumnValue(item, "dropdown");

            const tierService = new (
              await import("../services/reward-tier-service.js")
            ).RewardTierService();
            const rewardTier = await tierService.calculateRewardTier(
              targetValue,
              department
            );
            const giftCardAmount = await tierService.getAmountForTier(
              rewardTier
            );

            await this.mondayService.updateItem(itemId, {
              status: rewardTier,
              numbers3: giftCardAmount,
            });

            logger.info("Reward tier recalculated:", {
              itemId,
              targetValue,
              rewardTier,
              giftCardAmount,
            });

            return {
              message: "Target value updated and tier recalculated",
              itemId,
              newTargetValue: targetValue,
              rewardTier,
              giftCardAmount,
            };
          }
        }
      }

      if (columnId === "dropdown" && value?.text) {
        const department = value.text;
        const assignedManager = await this.approvalService.autoAssignManager(
          itemId,
          department
        );

        return {
          message: "Department updated and manager reassigned",
          itemId,
          department,
          assignedManager: assignedManager || "None available",
        };
      }

      return {
        message: "Column value change processed",
        itemId,
        columnId,
      };
    } catch (error) {
      logger.error("Error handling performance reward column change:", error);
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

  isApprovalColumn(columnId) {
    const approvalColumns = ["status5", "manager_approval", "approval_status"];
    return approvalColumns.includes(columnId);
  }
}
