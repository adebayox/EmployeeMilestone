import axios from "axios";
import { logger } from "../utils/logger.js";

export class UGiftMeService {
  constructor() {
    this.apiKey = process.env.UGIFTME_API_KEY;
    this.baseURL =
      process.env.UGIFTME_BASE_URL || "https://api-stage.ugift.me/api/v1";

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    this.client.interceptors.request.use(
      (config) => {
        logger.debug("UGiftMe API Request:", {
          method: config.method,
          url: config.url,
          data: config.data,
          params: config.params,
        });
        return config;
      },
      (error) => {
        logger.error("UGiftMe API Request Error:", error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug("UGiftMe API Response:", {
          status: response.status,
          url: response.config.url,
          data: response.data,
        });
        return response;
      },
      (error) => {
        logger.error("UGiftMe API Error:", {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  async healthCheck() {
    if (!this.apiKey) {
      throw new Error("UGiftMe API key not configured");
    }

    try {
      // Try to fetch wallet as a health check
      await this.getWallet();
      return true;
    } catch (error) {
      throw new Error(`UGiftMe API error: ${error.message}`);
    }
  }

  async getAllProducts(page = 1, limit = 100) {
    try {
      const response = await this.client.get("/business/products", {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error, "fetch all products");
      throw error;
    }
  }

  async searchProducts(merchant) {
    try {
      logger.info("Searching UGiftMe products:", { merchant });
      const response = await this.client.get("/business/products/search", {
        params: { merchant },
      });
      logger.info("Search response:", {
        merchant,
        resultsCount: response.data?.products?.length || 0,
        totalResults: response.data?.pagination?.total || 0,
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error, "search products");
      throw error;
    }
  }

  async getOrders(page = 1, limit = 20) {
    try {
      const response = await this.client.get("/business/orders", {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error, "fetch orders");
      throw error;
    }
  }

  async createOrder(orderData) {
    try {
      logger.info("Creating UGiftMe order with data:", orderData);
      const response = await this.client.post("/business/orders", orderData);
      logger.info("Order created successfully:", {
        orderId: response.data.id || response.data._id,
        status: response.data.status,
        merchant: response.data.merchant,
      });
      return response.data;
    } catch (error) {
      logger.error("Order creation failed:", {
        orderData,
        error: error.response?.data || error.message,
      });
      this.handleApiError(error, "create order");
      throw error;
    }
  }

  async getOrder(orderId) {
    try {
      const response = await this.client.get(`/business/orders/${orderId}`);
      return response.data;
    } catch (error) {
      this.handleApiError(error, "fetch order");
      throw error;
    }
  }

  async activateOrder(orderId, activationData) {
    try {
      const response = await this.client.post(
        `/business/orders/${orderId}/activate`,
        activationData
      );
      logger.info("Order activated successfully:", { orderId });
      return response.data;
    } catch (error) {
      this.handleApiError(error, "activate order");
      throw error;
    }
  }

  async searchOrders(filters) {
    try {
      const response = await this.client.get("/business/orders/search", {
        params: filters,
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error, "search orders");
      throw error;
    }
  }

  async createBulkOrders(ordersData) {
    try {
      const response = await this.client.post("/business/orders/bulk", {
        orders: ordersData,
      });
      logger.info("Bulk orders created successfully:", {
        count: ordersData.length,
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error, "create bulk orders");
      throw error;
    }
  }

  async getWallet() {
    try {
      const response = await this.client.get("/business/wallet");
      return response.data;
    } catch (error) {
      this.handleApiError(error, "fetch wallet");
      throw error;
    }
  }

  async getWalletTransactions(filters = {}) {
    try {
      const response = await this.client.get("/business/wallet/transactions", {
        params: filters,
      });
      return response.data;
    } catch (error) {
      this.handleApiError(error, "fetch wallet transactions");
      throw error;
    }
  }

  handleApiError(error, operation) {
    if (error.response) {
      const { status, data } = error.response;
      logger.error(`UGiftMe API ${operation} failed:`, {
        status,
        error: data.error,
        message: data.message,
        details: data,
      });

      switch (data.error) {
        case "ORDER_NOT_PAID_FOR":
          throw new Error("Order has not been paid for yet");
        case "ORDER_ALREADY_ACTIVATED":
          throw new Error("Order has already been activated");
        case "USER_NOT_FOUND":
          throw new Error("User not found");
        case "ORDER_NOT_FOUND":
          throw new Error("Order not found or access denied");
        case "PRODUCT_NOT_FOUND":
          throw new Error("Product not found");
        case "MERCHANT_NOT_FOUND":
          throw new Error("Merchant not found");
        default:
          throw new Error(data.message || `Failed to ${operation}`);
      }
    } else {
      logger.error(`UGiftMe API ${operation} network error:`, error.message);
      throw new Error(`Network error during ${operation}`);
    }
  }
}
