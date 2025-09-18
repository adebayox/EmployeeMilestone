// import { MondayService } from "./monday-service.js";
// import { RewardTierService } from "./reward-tier-service.js";
// import { logger } from "../utils/logger.js";

// export class PerformanceAnalyticsService {
//   constructor() {
//     this.mondayService = new MondayService();
//     this.tierService = new RewardTierService();
//     this.boardId =
//       process.env.PERFORMANCE_REWARDS_BOARD_ID || "your-board-id-here";
//   }

//   async getDashboardData(period = "month", department = null) {
//     try {
//       const response = await this.mondayService.getBoardItems(this.boardId);
//       const items = this.extractItems(response);

//       const filteredItems = this.filterItemsByPeriodAndDepartment(
//         items,
//         period,
//         department
//       );

//       const dashboard = {
//         period,
//         department,
//         summary: await this.calculateSummaryMetrics(filteredItems),
//         tierDistribution: await this.calculateTierDistribution(filteredItems),
//         redemptionMetrics: await this.calculateRedemptionMetrics(filteredItems),
//         roiMetrics: await this.calculateROIMetrics(filteredItems),
//         departmentPerformance: await this.calculateDepartmentPerformance(
//           items,
//           period
//         ),
//         trends: await this.calculateTrends(items, period),
//         topPerformers: await this.getTopPerformers(filteredItems),
//         upcomingExpiries: await this.getUpcomingExpiries(items),
//       };

//       return dashboard;
//     } catch (error) {
//       logger.error("Failed to get dashboard data:", error);
//       throw error;
//     }
//   }

//   async generateReport(options = {}) {
//     try {
//       const { startDate, endDate, department, format = "json" } = options;

//       const response = await this.mondayService.getBoardItems(this.boardId);
//       const items = this.extractItems(response);

//       let filteredItems = items;

//       if (startDate || endDate) {
//         filteredItems = items.filter((item) => {
//           const itemDate = new Date(item.created_at);
//           if (startDate && itemDate < new Date(startDate)) return false;
//           if (endDate && itemDate > new Date(endDate)) return false;
//           return true;
//         });
//       }

//       if (department) {
//         filteredItems = filteredItems.filter((item) => {
//           const itemDepartment = this.getColumnValue(item, "dropdown");
//           return itemDepartment && itemDepartment.includes(department);
//         });
//       }

//       const report = {
//         metadata: {
//           generatedAt: new Date().toISOString(),
//           period: { startDate, endDate },
//           department,
//           totalRecords: filteredItems.length,
//         },
//         executiveSummary: await this.generateExecutiveSummary(filteredItems),
//         detailedMetrics: {
//           performance: await this.calculateDetailedPerformanceMetrics(
//             filteredItems
//           ),
//           financial: await this.calculateFinancialMetrics(filteredItems),
//           operational: await this.calculateOperationalMetrics(filteredItems),
//         },
//         departmentAnalysis: await this.generateDepartmentAnalysis(
//           filteredItems
//         ),
//         recommendations: await this.generateRecommendations(filteredItems),
//         appendices: {
//           rawData:
//             format === "detailed"
//               ? this.formatItemsForReport(filteredItems)
//               : null,
//           methodology: this.getMethodologyNotes(),
//         },
//       };

//       if (format === "csv") {
//         return this.convertReportToCSV(report);
//       }

//       return report;
//     } catch (error) {
//       logger.error("Failed to generate report:", error);
//       throw error;
//     }
//   }

//   async calculateSummaryMetrics(items) {
//     const totalRewards = items.length;
//     const totalValue = items.reduce(
//       (sum, item) =>
//         sum + (parseFloat(this.getColumnValue(item, "numbers3")) || 0),
//       0
//     );

//     const approvedRewards = items.filter(
//       (item) => this.getColumnValue(item, "status5") === "Approved"
//     );

//     const totalRedemptionValue = items.reduce(
//       (sum, item) =>
//         sum + (parseFloat(this.getColumnValue(item, "numbers4")) || 0),
//       0
//     );

//     const pendingApprovals = items.filter(
//       (item) => this.getColumnValue(item, "status5") === "Pending"
//     ).length;

//     return {
//       totalRewards,
//       totalValue: Math.round(totalValue),
//       approvedRewards: approvedRewards.length,
//       approvalRate:
//         totalRewards > 0
//           ? Math.round((approvedRewards.length / totalRewards) * 100)
//           : 0,
//       totalRedemptionValue: Math.round(totalRedemptionValue),
//       redemptionRate:
//         totalValue > 0
//           ? Math.round((totalRedemptionValue / totalValue) * 100)
//           : 0,
//       pendingApprovals,
//       averageRewardValue:
//         totalRewards > 0 ? Math.round(totalValue / totalRewards) : 0,
//     };
//   }

//   async calculateTierDistribution(items) {
//     const distribution = {};
//     const tiers = await this.tierService.getTierNames();

//     tiers.forEach((tier) => {
//       distribution[tier] = {
//         count: 0,
//         percentage: 0,
//         totalValue: 0,
//         averageValue: 0,
//       };
//     });

//     items.forEach((item) => {
//       const tier = this.getColumnValue(item, "status");
//       const value = parseFloat(this.getColumnValue(item, "numbers3")) || 0;

//       if (distribution[tier]) {
//         distribution[tier].count++;
//         distribution[tier].totalValue += value;
//       }
//     });

//     const totalItems = items.length;
//     Object.keys(distribution).forEach((tier) => {
//       const tierData = distribution[tier];
//       tierData.percentage =
//         totalItems > 0 ? Math.round((tierData.count / totalItems) * 100) : 0;
//       tierData.averageValue =
//         tierData.count > 0
//           ? Math.round(tierData.totalValue / tierData.count)
//           : 0;
//     });

//     return distribution;
//   }

//   async calculateRedemptionMetrics(items) {
//     const issuedCards = items.filter(
//       (item) => this.getColumnValue(item, "text8") // Has gift card code
//     );

//     const statusCounts = {
//       Issued: 0,
//       "Partially Used": 0,
//       "Fully Redeemed": 0,
//     };

//     let totalIssued = 0;
//     let totalRedeemed = 0;

//     issuedCards.forEach((item) => {
//       const status = this.getColumnValue(item, "status7");
//       const issuedAmount =
//         parseFloat(this.getColumnValue(item, "numbers3")) || 0;
//       const redeemedAmount =
//         parseFloat(this.getColumnValue(item, "numbers4")) || 0;

//       if (statusCounts.hasOwnProperty(status)) {
//         statusCounts[status]++;
//       }

//       totalIssued += issuedAmount;
//       totalRedeemed += redeemedAmount;
//     });

//     return {
//       totalCards: issuedCards.length,
//       statusDistribution: statusCounts,
//       totalIssued: Math.round(totalIssued),
//       totalRedeemed: Math.round(totalRedeemed),
//       overallRedemptionRate:
//         totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0,
//       averageRedemptionPerCard:
//         issuedCards.length > 0
//           ? Math.round(totalRedeemed / issuedCards.length)
//           : 0,
//     };
//   }

//   async calculateROIMetrics(items) {
//     const totalInvestment = items.reduce(
//       (sum, item) =>
//         sum + (parseFloat(this.getColumnValue(item, "numbers3")) || 0),
//       0
//     );

//     const totalROIImpact = items.reduce(
//       (sum, item) =>
//         sum + (parseFloat(this.getColumnValue(item, "numbers5")) || 0),
//       0
//     );

//     const approvedItems = items.filter(
//       (item) => this.getColumnValue(item, "status5") === "Approved"
//     );

//     const averageTargetValue =
//       items.length > 0
//         ? items.reduce(
//             (sum, item) =>
//               sum + (parseFloat(this.getColumnValue(item, "numbers")) || 0),
//             0
//           ) / items.length
//         : 0;

//     return {
//       totalInvestment: Math.round(totalInvestment),
//       totalROIImpact: Math.round(totalROIImpact),
//       roiRatio:
//         totalInvestment > 0
//           ? Math.round((totalROIImpact / totalInvestment) * 100) / 100
//           : 0,
//       averageROIPerReward:
//         approvedItems.length > 0
//           ? Math.round(totalROIImpact / approvedItems.length)
//           : 0,
//       averageTargetValue: Math.round(averageTargetValue),
//       costPerformanceRatio:
//         totalROIImpact > 0
//           ? Math.round((totalInvestment / totalROIImpact) * 100) / 100
//           : 0,
//     };
//   }

//   async calculateDepartmentPerformance(items, period) {
//     const departmentStats = {};

//     items.forEach((item) => {
//       const department = this.getColumnValue(item, "dropdown") || "Unknown";
//       const rewardValue =
//         parseFloat(this.getColumnValue(item, "numbers3")) || 0;
//       const targetValue = parseFloat(this.getColumnValue(item, "numbers")) || 0;
//       const roiImpact = parseFloat(this.getColumnValue(item, "numbers5")) || 0;
//       const isApproved = this.getColumnValue(item, "status5") === "Approved";

//       if (!departmentStats[department]) {
//         departmentStats[department] = {
//           totalRewards: 0,
//           approvedRewards: 0,
//           totalValue: 0,
//           totalTargetValue: 0,
//           totalROIImpact: 0,
//           averageRewardValue: 0,
//           approvalRate: 0,
//           roiRatio: 0,
//         };
//       }

//       const stats = departmentStats[department];
//       stats.totalRewards++;
//       stats.totalValue += rewardValue;
//       stats.totalTargetValue += targetValue;
//       stats.totalROIImpact += roiImpact;

//       if (isApproved) {
//         stats.approvedRewards++;
//       }
//     });

//     Object.keys(departmentStats).forEach((department) => {
//       const stats = departmentStats[department];
//       stats.averageRewardValue =
//         stats.totalRewards > 0
//           ? Math.round(stats.totalValue / stats.totalRewards)
//           : 0;
//       stats.approvalRate =
//         stats.totalRewards > 0
//           ? Math.round((stats.approvedRewards / stats.totalRewards) * 100)
//           : 0;
//       stats.roiRatio =
//         stats.totalValue > 0
//           ? Math.round((stats.totalROIImpact / stats.totalValue) * 100) / 100
//           : 0;
//     });

//     return departmentStats;
//   }

//   async calculateTrends(items, period) {
//     const trends = {
//       rewardVolume: {},
//       approvalRates: {},
//       redemptionRates: {},
//       averageValues: {},
//     };

//     const groupedItems = this.groupItemsByTimePeriod(items, period);

//     Object.keys(groupedItems).forEach((timePeriod) => {
//       const periodItems = groupedItems[timePeriod];

//       trends.rewardVolume[timePeriod] = periodItems.length;

//       const approved = periodItems.filter(
//         (item) => this.getColumnValue(item, "status5") === "Approved"
//       );
//       trends.approvalRates[timePeriod] =
//         periodItems.length > 0
//           ? Math.round((approved.length / periodItems.length) * 100)
//           : 0;

//       const totalValue = periodItems.reduce(
//         (sum, item) =>
//           sum + (parseFloat(this.getColumnValue(item, "numbers3")) || 0),
//         0
//       );
//       const redemptionValue = periodItems.reduce(
//         (sum, item) =>
//           sum + (parseFloat(this.getColumnValue(item, "numbers4")) || 0),
//         0
//       );

//       trends.redemptionRates[timePeriod] =
//         totalValue > 0 ? Math.round((redemptionValue / totalValue) * 100) : 0;

//       trends.averageValues[timePeriod] =
//         periodItems.length > 0
//           ? Math.round(totalValue / periodItems.length)
//           : 0;
//     });

//     return trends;
//   }

//   async getTopPerformers(items, limit = 10) {
//     const performers = items
//       .filter((item) => this.getColumnValue(item, "status5") === "Approved")
//       .map((item) => ({
//         employeeName: this.getColumnValue(item, "text"),
//         department: this.getColumnValue(item, "dropdown"),
//         targetValue: parseFloat(this.getColumnValue(item, "numbers")) || 0,
//         rewardValue: parseFloat(this.getColumnValue(item, "numbers3")) || 0,
//         roiImpact: parseFloat(this.getColumnValue(item, "numbers5")) || 0,
//         targetDescription: this.getColumnValue(item, "long_text"),
//         rewardTier: this.getColumnValue(item, "status"),
//       }))
//       .sort((a, b) => b.roiImpact - a.roiImpact)
//       .slice(0, limit);

//     return performers;
//   }

//   async getUpcomingExpiries(items, daysAhead = 30) {
//     const today = new Date();
//     const futureDate = new Date();
//     futureDate.setDate(today.getDate() + daysAhead);

//     const upcomingExpiries = items
//       .filter((item) => {
//         const expiryDate = this.getColumnValue(item, "date6");
//         const status = this.getColumnValue(item, "status7");

//         return (
//           expiryDate &&
//           new Date(expiryDate) <= futureDate &&
//           new Date(expiryDate) > today &&
//           ["Issued", "Partially Used"].includes(status)
//         );
//       })
//       .map((item) => ({
//         employeeName: this.getColumnValue(item, "text"),
//         giftCardCode: this.getColumnValue(item, "text8"),
//         originalAmount: parseFloat(this.getColumnValue(item, "numbers3")) || 0,
//         redemptionValue: parseFloat(this.getColumnValue(item, "numbers4")) || 0,
//         expiryDate: this.getColumnValue(item, "date6"),
//         daysUntilExpiry: Math.ceil(
//           (new Date(this.getColumnValue(item, "date6")) - today) /
//             (1000 * 60 * 60 * 24)
//         ),
//       }))
//       .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

//     return upcomingExpiries;
//   }

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

//   filterItemsByPeriodAndDepartment(items, period, department) {
//     let filteredItems = [...items];

//     if (period !== "all") {
//       const periodDate = this.getDateForPeriod(period);
//       filteredItems = filteredItems.filter(
//         (item) => new Date(item.created_at) >= periodDate
//       );
//     }

//     if (department) {
//       filteredItems = filteredItems.filter((item) => {
//         const itemDepartment = this.getColumnValue(item, "dropdown");
//         return itemDepartment && itemDepartment.includes(department);
//       });
//     }

//     return filteredItems;
//   }

//   getDateForPeriod(period) {
//     const now = new Date();
//     switch (period) {
//       case "week":
//         return new Date(now.setDate(now.getDate() - 7));
//       case "month":
//         return new Date(now.setMonth(now.getMonth() - 1));
//       case "quarter":
//         return new Date(now.setMonth(now.getMonth() - 3));
//       case "year":
//         return new Date(now.setFullYear(now.getFullYear() - 1));
//       default:
//         return new Date(0);
//     }
//   }

//   groupItemsByTimePeriod(items, period) {
//     const groups = {};

//     items.forEach((item) => {
//       const date = new Date(item.created_at);
//       let key;

//       switch (period) {
//         case "week":
//           key = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
//           break;
//         case "month":
//           key = `${date.getFullYear()}-${(date.getMonth() + 1)
//             .toString()
//             .padStart(2, "0")}`;
//           break;
//         case "quarter":
//           key = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
//           break;
//         case "year":
//           key = date.getFullYear().toString();
//           break;
//         default:
//           key = date.toISOString().split("T")[0];
//       }

//       if (!groups[key]) {
//         groups[key] = [];
//       }
//       groups[key].push(item);
//     });

//     return groups;
//   }

//   getWeekNumber(date) {
//     const d = new Date(
//       Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
//     );
//     const dayNum = d.getUTCDay() || 7;
//     d.setUTCDate(d.getUTCDate() + 4 - dayNum);
//     const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
//     return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
//   }

//   async generateExecutiveSummary(items) {
//     const summary = await this.calculateSummaryMetrics(items);
//     const redemption = await this.calculateRedemptionMetrics(items);
//     const roi = await this.calculateROIMetrics(items);

//     return {
//       overview: `Analysis of ${summary.totalRewards} performance rewards with a total value of £${summary.totalValue}.`,
//       keyFindings: [
//         `${summary.approvalRate}% approval rate indicates ${
//           summary.approvalRate > 80 ? "strong" : "moderate"
//         } management support`,
//         `${redemption.overallRedemptionRate}% redemption rate shows ${
//           redemption.overallRedemptionRate > 70 ? "high" : "moderate"
//         } employee engagement`,
//         `ROI ratio of ${roi.roiRatio}:1 demonstrates ${
//           roi.roiRatio > 2 ? "excellent" : "good"
//         } return on investment`,
//       ],
//       recommendations: this.generateQuickRecommendations(
//         summary,
//         redemption,
//         roi
//       ),
//     };
//   }

//   generateQuickRecommendations(summary, redemption, roi) {
//     const recommendations = [];

//     if (summary.approvalRate < 70) {
//       recommendations.push(
//         "Consider reviewing approval criteria to improve approval rates"
//       );
//     }

//     if (redemption.overallRedemptionRate < 60) {
//       recommendations.push(
//         "Implement reminder campaigns to boost gift card utilization"
//       );
//     }

//     if (roi.roiRatio < 1.5) {
//       recommendations.push(
//         "Evaluate reward tiers to optimize cost-effectiveness"
//       );
//     }

//     if (summary.pendingApprovals > summary.totalRewards * 0.2) {
//       recommendations.push(
//         "Streamline approval process to reduce pending backlog"
//       );
//     }

//     return recommendations;
//   }

//   convertReportToCSV(report) {
//     const lines = [];
//     lines.push("Metric,Value");

//     Object.entries(report.executiveSummary).forEach(([key, value]) => {
//       if (typeof value === "string") {
//         lines.push(`${key},"${value}"`);
//       } else if (Array.isArray(value)) {
//         value.forEach((item, index) => {
//           lines.push(`${key}_${index},"${item}"`);
//         });
//       }
//     });

//     return lines.join("\n");
//   }

//   async calculateDetailedPerformanceMetrics(items) {
//     return {};
//   }

//   async calculateFinancialMetrics(items) {
//     return {};
//   }

//   async calculateOperationalMetrics(items) {
//     return {};
//   }

//   async generateDepartmentAnalysis(items) {
//     // Implementation for department analysis
//     return {};
//   }

//   async generateRecommendations(items) {
//     // Implementation for recommendations
//     return [];
//   }

//   formatItemsForReport(items) {
//     // Implementation for formatting items
//     return items;
//   }

//   getMethodologyNotes() {
//     return {
//       dataSource: "Monday.com Performance Rewards Board",
//       calculationMethods: {
//         approvalRate: "Approved rewards / Total rewards * 100",
//         redemptionRate: "Total redeemed value / Total issued value * 100",
//         roiRatio: "Total ROI impact / Total investment",
//       },
//       limitations: [
//         "ROI impact values are self-reported and may not reflect actual business impact",
//         "Redemption data depends on UGiftMe API availability",
//         "Historical data may be incomplete for older entries",
//       ],
//     };
//   }
// }
