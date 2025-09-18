// import { MondayService } from "./monday-service.js";
// import { UGiftMeService } from "./ugiftme-service.js";
// import { NotificationService } from "./notification-service.js";
// import { logger } from "../utils/logger.js";

// export class RedemptionMonitorService {
//   constructor() {
//     this.mondayService = new MondayService();
//     this.ugiftmeService = new UGiftMeService();
//     this.notificationService = new NotificationService();
//     this.boardId =
//       process.env.PERFORMANCE_REWARDS_BOARD_ID || "your-board-id-here";
//   }

//   /**
//    * Check redemption status for all active gift cards
//    */
//   async checkAllRedemptionStatuses() {
//     try {
//       const response = await this.mondayService.getBoardItems(this.boardId);
//       const items = this.extractItems(response);

//       // Filter items that have gift cards issued
//       const activeGiftCards = items.filter((item) => {
//         const redemptionStatus = this.getColumnValue(item, "status7");
//         const giftCardCode = this.getColumnValue(item, "text8");
//         return (
//           giftCardCode &&
//           ["Issued", "Partially Used"].includes(redemptionStatus)
//         );
//       });

//       const results = [];

//       for (const item of activeGiftCards) {
//         try {
//           const result = await this.updateRedemptionStatus(item);
//           results.push(result);
//         } catch (error) {
//           logger.error("Failed to check redemption for item:", {
//             itemId: item.id,
//             error: error.message,
//           });
//           results.push({
//             itemId: item.id,
//             success: false,
//             error: error.message,
//           });
//         }
//       }

//       logger.info("Redemption status check completed:", {
//         totalChecked: activeGiftCards.length,
//         successful: results.filter((r) => r.success).length,
//         failed: results.filter((r) => !r.success).length,
//       });

//       return results;
//     } catch (error) {
//       logger.error("Failed to check all redemption statuses:", error);
//       throw error;
//     }
//   }

//   /**
//    * Update redemption status for a specific item
//    */
//   async updateRedemptionStatus(item) {
//     try {
//       const itemId = item.id;
//       const giftCardCode = this.getColumnValue(item, "text8");
//       const currentStatus = this.getColumnValue(item, "status7");
//       const originalAmount =
//         parseFloat(this.getColumnValue(item, "numbers3")) || 0;

//       if (!giftCardCode) {
//         return {
//           itemId,
//           success: false,
//           error: "No gift card code found",
//         };
//       }

//       // Get current redemption status from UGiftMe
//       const redemptionData = await this.ugiftmeService.getOrderStatus(
//         giftCardCode
//       );

//       let newStatus = currentStatus;
//       let redemptionValue =
//         parseFloat(this.getColumnValue(item, "numbers4")) || 0;
//       let updated = false;

//       if (redemptionData) {
//         const usedAmount = redemptionData.amountUsed || 0;
//         const remainingAmount = originalAmount - usedAmount;

//         // Update redemption value
//         if (usedAmount !== redemptionValue) {
//           redemptionValue = usedAmount;
//           updated = true;
//         }

//         // Determine new status
//         if (usedAmount === 0) {
//           newStatus = "Issued";
//         } else if (remainingAmount > 0) {
//           newStatus = "Partially Used";
//         } else {
//           newStatus = "Fully Redeemed";
//         }

//         // Check if status changed
//         if (newStatus !== currentStatus) {
//           updated = true;

//           // Send notifications for status changes
//           const employeeEmail = this.getColumnValue(item, "email");
//           const employeeName = this.getColumnValue(item, "text");

//           if (newStatus === "Fully Redeemed" && employeeEmail) {
//             await this.notificationService.notifyGiftCardFullyRedeemed(
//               employeeEmail,
//               employeeName,
//               originalAmount,
//               giftCardCode
//             );
//           }
//         }

//         // Update Monday.com if anything changed
//         if (updated) {
//           const updateValues = {
//             status7: newStatus, // Redemption Status
//             numbers4: redemptionValue, // Redemption Value
//             date8: new Date().toISOString().split("T")[0], // Last Checked Date
//           };

//           await this.mondayService.updateItem(itemId, updateValues);

//           logger.info("Redemption status updated:", {
//             itemId,
//             giftCardCode,
//             oldStatus: currentStatus,
//             newStatus,
//             redemptionValue,
//             remainingAmount: originalAmount - redemptionValue,
//           });
//         }
//       }

//       return {
//         itemId,
//         success: true,
//         updated,
//         previousStatus: currentStatus,
//         newStatus,
//         redemptionValue,
//         remainingAmount: originalAmount - redemptionValue,
//       };
//     } catch (error) {
//       logger.error("Failed to update redemption status:", error);
//       return {
//         itemId: item.id,
//         success: false,
//         error: error.message,
//       };
//     }
//   }

//   /**
//    * Get redemption status for a specific reward
//    */
//   async getRedemptionStatus(itemId) {
//     try {
//       const response = await this.mondayService.getBoardItems(this.boardId);
//       const items = this.extractItems(response);
//       const item = items.find((i) => i.id === itemId);

//       if (!item) {
//         throw new Error("Reward item not found");
//       }

//       const giftCardCode = this.getColumnValue(item, "text8");
//       const currentStatus = this.getColumnValue(item, "status7");
//       const originalAmount =
//         parseFloat(this.getColumnValue(item, "numbers3")) || 0;
//       const redemptionValue =
//         parseFloat(this.getColumnValue(item, "numbers4")) || 0;
//       const expiryDate = this.getColumnValue(item, "date6");
//       const issueDate = this.getColumnValue(item, "date");

//       let detailedStatus = null;

//       if (giftCardCode) {
//         try {
//           detailedStatus = await this.ugiftmeService.getOrderStatus(
//             giftCardCode
//           );
//         } catch (error) {
//           logger.warn(
//             "Could not fetch detailed status from UGiftMe:",
//             error.message
//           );
//         }
//       }

//       return {
//         itemId,
//         giftCardCode,
//         status: currentStatus,
//         originalAmount,
//         redemptionValue,
//         remainingAmount: originalAmount - redemptionValue,
//         redemptionPercentage:
//           originalAmount > 0
//             ? Math.round((redemptionValue / originalAmount) * 100)
//             : 0,
//         issueDate,
//         expiryDate,
//         daysUntilExpiry: expiryDate
//           ? this.calculateDaysUntilExpiry(expiryDate)
//           : null,
//         isExpired: expiryDate ? new Date(expiryDate) < new Date() : false,
//         detailedStatus,
//       };
//     } catch (error) {
//       logger.error("Failed to get redemption status:", error);
//       throw error;
//     }
//   }

//   /**
//    * Get gift cards expiring soon
//    */
//   async getExpiringGiftCards(daysThreshold = 30) {
//     try {
//       const response = await this.mondayService.getBoardItems(this.boardId);
//       const items = this.extractItems(response);

//       const currentDate = new Date();
//       const thresholdDate = new Date();
//       thresholdDate.setDate(currentDate.getDate() + daysThreshold);

//       const expiringCards = items
//         .filter((item) => {
//           const expiryDate = this.getColumnValue(item, "date6");
//           const redemptionStatus = this.getColumnValue(item, "status7");

//           return (
//             expiryDate &&
//             new Date(expiryDate) <= thresholdDate &&
//             new Date(expiryDate) > currentDate &&
//             ["Issued", "Partially Used"].includes(redemptionStatus)
//           );
//         })
//         .map((item) => ({
//           itemId: item.id,
//           employeeName: this.getColumnValue(item, "text"),
//           employeeEmail: this.getColumnValue(item, "email"),
//           giftCardCode: this.getColumnValue(item, "text8"),
//           originalAmount:
//             parseFloat(this.getColumnValue(item, "numbers3")) || 0,
//           redemptionValue:
//             parseFloat(this.getColumnValue(item, "numbers4")) || 0,
//           remainingAmount:
//             (parseFloat(this.getColumnValue(item, "numbers3")) || 0) -
//             (parseFloat(this.getColumnValue(item, "numbers4")) || 0),
//           expiryDate: this.getColumnValue(item, "date6"),
//           daysUntilExpiry: this.calculateDaysUntilExpiry(
//             this.getColumnValue(item, "date6")
//           ),
//           redemptionStatus: this.getColumnValue(item, "status7"),
//         }));

//       // Send notifications for cards expiring soon
//       for (const card of expiringCards) {
//         if (card.employeeEmail && card.daysUntilExpiry <= 7) {
//           await this.notificationService.sendExpiryWarning(
//             card.employeeEmail,
//             card.employeeName,
//             card.giftCardCode,
//             card.remainingAmount,
//             card.daysUntilExpiry
//           );
//         }
//       }

//       logger.info("Expiring gift cards check completed:", {
//         total: expiringCards.length,
//         expiringSoon: expiringCards.filter((card) => card.daysUntilExpiry <= 7)
//           .length,
//       });

//       return expiringCards;
//     } catch (error) {
//       logger.error("Failed to get expiring gift cards:", error);
//       throw error;
//     }
//   }

//   /**
//    * Generate redemption report
//    */
//   async generateRedemptionReport(filters = {}) {
//     try {
//       const response = await this.mondayService.getBoardItems(this.boardId);
//       const items = this.extractItems(response);

//       let filteredItems = items.filter((item) => {
//         const giftCardCode = this.getColumnValue(item, "text8");
//         return giftCardCode; // Only include items with gift cards
//       });

//       // Apply filters
//       if (filters.status) {
//         filteredItems = filteredItems.filter(
//           (item) => this.getColumnValue(item, "status7") === filters.status
//         );
//       }

//       if (filters.dateFrom || filters.dateTo) {
//         filteredItems = filteredItems.filter((item) => {
//           const issueDate = new Date(this.getColumnValue(item, "date"));
//           if (filters.dateFrom && issueDate < new Date(filters.dateFrom))
//             return false;
//           if (filters.dateTo && issueDate > new Date(filters.dateTo))
//             return false;
//           return true;
//         });
//       }

//       const report = {
//         summary: {
//           totalCards: filteredItems.length,
//           totalValue: 0,
//           totalRedeemed: 0,
//           redemptionRate: 0,
//           byStatus: {},
//         },
//         details: [],
//       };

//       filteredItems.forEach((item) => {
//         const originalAmount =
//           parseFloat(this.getColumnValue(item, "numbers3")) || 0;
//         const redemptionValue =
//           parseFloat(this.getColumnValue(item, "numbers4")) || 0;
//         const status = this.getColumnValue(item, "status7");

//         report.summary.totalValue += originalAmount;
//         report.summary.totalRedeemed += redemptionValue;

//         if (!report.summary.byStatus[status]) {
//           report.summary.byStatus[status] = { count: 0, value: 0, redeemed: 0 };
//         }
//         report.summary.byStatus[status].count++;
//         report.summary.byStatus[status].value += originalAmount;
//         report.summary.byStatus[status].redeemed += redemptionValue;

//         report.details.push({
//           itemId: item.id,
//           employeeName: this.getColumnValue(item, "text"),
//           giftCardCode: this.getColumnValue(item, "text8"),
//           originalAmount,
//           redemptionValue,
//           remainingAmount: originalAmount - redemptionValue,
//           status,
//           issueDate: this.getColumnValue(item, "date"),
//           expiryDate: this.getColumnValue(item, "date6"),
//         });
//       });

//       if (report.summary.totalValue > 0) {
//         report.summary.redemptionRate = Math.round(
//           (report.summary.totalRedeemed / report.summary.totalValue) * 100
//         );
//       }

//       return report;
//     } catch (error) {
//       logger.error("Failed to generate redemption report:", error);
//       throw error;
//     }
//   }

//   /**
//    * Helper methods
//    */
//   extractItems(response) {
//     if (response?.boards?.[0]?.items_page) {
//       return response.boards[0].items_page.items;
//     }
//     if (Array.isArray(response)) {
//       return response;
//     }
//     return [];
//   }

//   getColumnValue(item, columnId) {
//     const column = item.column_values?.find((col) => col.id === columnId);
//     return column ? column.text : null;
//   }

//   calculateDaysUntilExpiry(expiryDate) {
//     if (!expiryDate) return null;

//     const expiry = new Date(expiryDate);
//     const today = new Date();
//     const diffTime = expiry.getTime() - today.getTime();
//     return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
//   }
// }
