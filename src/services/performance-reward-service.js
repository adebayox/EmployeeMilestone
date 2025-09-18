import { MondayService } from "./monday-service.js";
// import { RewardTierService } from "./reward-tier-service.js";
import { UGiftMeService } from "./ugiftme-service.js";
import { NotificationService } from "./notification-service.js";
import { logger } from "../utils/logger.js";

export class PerformanceRewardService {
  constructor() {
    this.mondayService = new MondayService();
    this.tierService = new RewardTierService();
    this.ugiftmeService = new UGiftMeService();
    this.notificationService = new NotificationService();
    this.boardId =
      process.env.PERFORMANCE_REWARDS_BOARD_ID || "your-board-id-here";
  }

  async createPerformanceReward(rewardData) {
    try {
      const {
        employeeName,
        employeeEmail,
        performancePeriod,
        targetDescription,
        targetValue,
        department,
        managerId,
      } = rewardData;

      const rewardTier = await this.tierService.calculateRewardTier(
        targetValue,
        department
      );
      const giftCardAmount = await this.tierService.getAmountForTier(
        rewardTier
      );

      const assignedManager =
        managerId || (await this.getManagerForDepartment(department));

      const columnValues = {
        color_mkvv8y5t: { label: rewardTier },
        color_mkvv22d8: { label: "Pending" },
        color_mkvvpnpv: { label: "Pending" },

        text_mkvvj9j2: "",
        text_mkvxe84q: "",
        text_mkvxe84q: "",
        numeric_mkvvsfzy: giftCardAmount.toString(),
        numeric_mkvvax8c: targetValue.toString(),
        long_text_mkvv2hnr: targetDescription,
        date_mkvvvs4j: new Date().toISOString().split("T")[0],
        timerange_mkvvr92x: this.formatDateRange(performancePeriod),
        name: `Performance Reward - ${employeeName}`,
      };

      const item = await this.mondayService.createItem(
        this.boardId,
        `Performance Reward - ${employeeName}`,
        columnValues
      );

      if (assignedManager) {
        await this.notificationService.notifyManagerOfPendingApproval(
          assignedManager,
          item.id,
          employeeName,
          targetDescription,
          giftCardAmount
        );
      }

      logger.info("Performance reward created:", {
        itemId: item.id,
        employeeName,
        rewardTier,
        amount: giftCardAmount,
      });

      return {
        itemId: item.id,
        employeeName,
        rewardTier,
        giftCardAmount,
        approvalStatus: "Pending",
        assignedManager,
      };
    } catch (error) {
      logger.error("Failed to create performance reward:", error);
      throw error;
    }
  }

  async getPerformanceRewards(filters = {}, page = 1, limit = 20) {
    try {
      const response = await this.mondayService.getBoardItems(this.boardId);
      let items = this.extractItems(response);

      if (filters.status) {
        items = items.filter(
          (item) => this.getColumnValue(item, "status5") === filters.status
        );
      }

      if (filters.tier) {
        items = items.filter(
          (item) => this.getColumnValue(item, "status") === filters.tier
        );
      }

      if (filters.department) {
        items = items.filter((item) =>
          this.getColumnValue(item, "dropdown")?.includes(filters.department)
        );
      }

      if (filters.dateFrom || filters.dateTo) {
        items = items.filter((item) => {
          const itemDate = new Date(
            this.getColumnValue(item, "date") || item.created_at
          );
          if (filters.dateFrom && itemDate < new Date(filters.dateFrom))
            return false;
          if (filters.dateTo && itemDate > new Date(filters.dateTo))
            return false;
          return true;
        });
      }

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = items.slice(startIndex, endIndex);

      const formattedItems = paginatedItems.map((item) => ({
        itemId: item.id,
        employeeName: this.getColumnValue(item, "text"),
        employeeEmail: this.getColumnValue(item, "email"),
        performancePeriod: this.getColumnValue(item, "date4"),
        targetDescription: this.getColumnValue(item, "long_text"),
        targetValue: parseFloat(this.getColumnValue(item, "numbers")) || 0,
        rewardTier: this.getColumnValue(item, "status"),
        giftCardAmount: parseFloat(this.getColumnValue(item, "numbers3")) || 0,
        approvalStatus: this.getColumnValue(item, "status5"),
        giftCardCode: this.getColumnValue(item, "text8"),
        issueDate: this.getColumnValue(item, "date"),
        redemptionStatus: this.getColumnValue(item, "status7"),
        redemptionValue: parseFloat(this.getColumnValue(item, "numbers4")) || 0,
        expiryDate: this.getColumnValue(item, "date6"),
        roiImpact: parseFloat(this.getColumnValue(item, "numbers5")) || 0,
        createdAt: item.created_at,
      }));

      return {
        items: formattedItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: items.length,
          totalPages: Math.ceil(items.length / limit),
        },
      };
    } catch (error) {
      logger.error("Failed to get performance rewards:", error);
      throw error;
    }
  }

  async issueGiftCard(itemId) {
    try {
      const response = await this.mondayService.getBoardItems(this.boardId);
      const items = this.extractItems(response);
      const item = items.find((i) => i.id === itemId);

      if (!item) throw new Error("Reward item not found");

      const employeeName =
        this.getColumnValue(item, "name") || item.name || "Unknown Employee";

      const employeeEmailColumn = item.column_values.find(
        (col) => col.id === "email_mkvxcqnr"
      );
      let employeeEmail = null;
      if (employeeEmailColumn?.value) {
        const val = JSON.parse(employeeEmailColumn.value);
        employeeEmail = val.email || null;
      }

      const giftCardAmount =
        parseFloat(
          item.column_values.find((col) => col.id === "numeric_mkvvsfzy")?.text
        ) || 0;

      const rewardTier = item.column_values.find(
        (col) => col.id === "color_mkvv8y5t"
      )?.text;

      if (!employeeName || !employeeEmail || giftCardAmount <= 0) {
        throw new Error(
          `Cannot issue gift card: missing data. Name: ${employeeName}, Email: ${employeeEmail}, Amount: ${giftCardAmount}`
        );
      }

      const productCode = await this.getProductCodeForTier(rewardTier, "ASDA");

      const orderData = {
        productCode,
        merchant: "ASDA",
        currency: "GBP",
        valuePurchased: giftCardAmount,
        recipientEmail: employeeEmail,
        recipientName: employeeName,
        message: `Congratulations on your outstanding performance! Here's your reward gift card.`,
      };

      // --- Create order via UGiftMe ---
      const order = await this.ugiftmeService.createOrder(orderData);

      // --- Update Monday.com item with gift card info ---
      const updateValues = {
        text_mkvvj9j2: order.giftCardCode || order.id, // Gift Card Code
        text_mkvxe84q: order.id, // Order ID
        date_mkvvvs4j: new Date().toISOString().split("T")[0], // Issue Date
        color_mkvvpnpv: "Issued", // Redemption Status
        date_mkvv1fpm: this.calculateExpiryDate(365), // Expiry Date
      };

      await this.mondayService.updateItem(itemId, updateValues, this.boardId);

      // --- Send gift card to employee ---
      await this.notificationService.sendGiftCardToEmployee(
        employeeEmail,
        employeeName,
        order,
        giftCardAmount
      );

      logger.info("Gift card issued successfully:", {
        itemId,
        orderId: order.id,
        amount: giftCardAmount,
        recipient: employeeEmail,
      });

      return {
        success: true,
        orderId: order.id,
        giftCardCode: order.giftCardCode,
        amount: giftCardAmount,
        recipient: employeeEmail,
      };
    } catch (error) {
      logger.error("Failed to issue gift card:", error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  extractItems(response) {
    if (response?.boards?.[0]?.items_page) {
      return response.boards[0].items_page.items;
    }
    if (Array.isArray(response)) {
      return response;
    }
    return [];
  }

  getColumnValue(columns, key) {
    const col = columns.find(
      (c) =>
        c.id.toLowerCase() === key.toLowerCase() ||
        c.title.toLowerCase() === key.toLowerCase()
    );
    return col?.text || col?.value || null;
  }

  formatDateRange(period) {
    if (!period) return null;
    if (typeof period === "object" && period.from && period.to) {
      return `${period.from} - ${period.to}`;
    }
    return period.toString();
  }

  calculateExpiryDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split("T")[0];
  }

  mapTierToProductCode(tier) {
    const mapping = {
      Bronze: "ASDA_10",
      Silver: "ASDA_20",
      Gold: "ASDA_50",
      Platinum: "ASDA_100",
    };
    return mapping[tier] || "ASDA_10";
  }

  /**
   * Dynamically fetch product code for a given tier and merchant
   */
  async getProductCodeForTier(tier, merchant = "ASDA") {
    try {
      // Fetch all products for the merchant
      const productsResponse = await this.ugiftmeService.searchProducts(
        merchant
      );
      const products = productsResponse?.products || [];

      if (!products.length) {
        throw new Error(`No products found for merchant ${merchant}`);
      }

      // Map tier amounts to product codes
      const tierAmounts = {
        Bronze: 10,
        Silver: 25,
        Gold: 50,
        Platinum: 100,
      };

      const targetAmount = tierAmounts[tier];
      if (!targetAmount) {
        throw new Error(`Unknown reward tier: ${tier}`);
      }

      // Find a product that matches the amount (valuePurchased)
      const product = products.find(
        (p) => p.value === targetAmount || p.displayValue === targetAmount
      );

      if (!product) {
        throw new Error(
          `No product found for tier ${tier} (amount: ${targetAmount})`
        );
      }

      return product.code; // return dynamic product code
    } catch (error) {
      logger.error("Failed to fetch product code dynamically:", error);
      throw error;
    }
  }

  async getManagerForDepartment(department) {
    // This should be configurable or come from an employee database
    // For now, return null and let manual assignment happen
    return null;
  }
}
