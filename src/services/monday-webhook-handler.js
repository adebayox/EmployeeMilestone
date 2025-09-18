import crypto from "crypto";
import { MondayService } from "./monday-service.js";
import { UGiftMeService } from "./ugiftme-service.js";
import { logger } from "../utils/logger.js";


export class MondayWebhookHandler {
  constructor() {
    this.mondayService = new MondayService();
    this.ugiftmeService = new UGiftMeService();
    this.signingSecret = process.env.MONDAY_SIGNING_SECRET;
  }

 
  verifySignature(body, signature) {
    if (!this.signingSecret) {
      logger.warn(
        "No signing secret configured, skipping signature verification"
      );
      return true;
    }

    try {
      const bodyString = typeof body === "string" ? body : JSON.stringify(body);
      const computedSignature = crypto
        .createHmac("sha256", this.signingSecret)
        .update(bodyString)
        .digest("hex");

      return signature === computedSignature;
    } catch (error) {
      logger.error("Signature verification failed:", error);
      return false;
    }
  }

 
  async processWebhook(payload) {
    const { event } = payload;

    if (!event) {
      throw new Error("Invalid webhook payload - missing event");
    }

    logger.info("Processing webhook event:", {
      type: event.type,
      boardId: event.boardId,
    });

    switch (event.type) {
      case "create_item":
        return await this.handleItemCreated(event);
      case "change_column_value":
        return await this.handleColumnValueChanged(event);
      case "change_status_column_value":
        return await this.handleStatusChanged(event);
      default:
        logger.info("Unhandled webhook event type:", event.type);
        return { message: "Event acknowledged but not processed" };
    }
  }


  async handleItemCreated(event) {
    try {
      const { boardId, itemId } = event;
      logger.info("Starting handleItemCreated:", { boardId, itemId });

      
      const response = await this.mondayService.getBoardItems(boardId);
      const items = this.extractItems(response, boardId);

      const newItem = items.find((item) => item.id === itemId.toString());
      if (!newItem) {
        logger.error("Newly created item not found", { itemId, boardId });
        return { message: `Item ${itemId} not found on board ${boardId}` };
      }

      logger.info("Found item:", {
        itemId: newItem.id,
        itemName: newItem.name,
        columnValues:
          newItem.column_values?.map((col) => ({
            id: col.id,
            text: col.text,
          })) || [],
      });

      
      if (!this.shouldCreateGiftCardOrder(newItem)) {
        return {
          message: "Item created but no gift card order triggered",
          itemId,
          itemName: newItem.name,
        };
      }

      logger.info("Gift card order decision:", {
        shouldCreate: true,
        itemName: newItem.name,
      });
      logger.info("Creating gift card order...");

      const orderData = await this.extractOrderData(newItem);
      logger.info("Order payload ready:", orderData);

      const order = await this.ugiftmeService.createOrder(orderData);
      logger.info("Gift card order created:", {
        orderId: order.id || order._id,
      });

      await this.updateItemWithOrderDetails(itemId, order, boardId);

      return {
        message: "Gift card order created",
        orderId: order.id || order._id,
        itemId,
        orderData,
        itemName: newItem.name,
      };
    } catch (error) {
      logger.error("Error in handleItemCreated:", error);
      throw error;
    }
  }

  
  extractItems(response, boardId) {
    if (response?.boards?.[0]?.items_page) {
      return response.boards[0].items_page.items;
    }
    if (Array.isArray(response)) {
      return response;
    }
    logger.error("Unexpected response structure from getBoardItems:", {
      response,
      boardId,
    });
    throw new Error("Unable to extract items from Monday.com API response");
  }

 
  async handleColumnValueChanged(event) {
    logger.info("Column value changed:", event);
    return { message: "Column value change processed" };
  }


  async handleStatusChanged(event) {
    try {
      const { value, boardId, itemId } = event;

      logger.info("Status change event received:", {
        itemId,
        newStatus: value?.label,
        previousStatus: event.previousValue?.label,
      });

      if (value?.label === "Approved" || value?.label === "Ready") {
        logger.info("Status approved - activating order", { itemId });

        const response = await this.mondayService.getBoardItems(boardId);
        const items = this.extractItems(response, boardId);
        const item = items.find((i) => i.id === itemId.toString());

        if (!item) {
          logger.error("Item not found for activation", { itemId, boardId });
          return { message: "Item not found", itemId };
        }

        
        const orderIdColumn = item.column_values?.find(
          (col) =>
            col.id === "order_id" ||
            col.id.includes("order") ||
            col.id === "text_mkvv457x" || 
            (col.text && col.text.match(/^[a-f0-9]{24}$/)) 
        );

        if (!orderIdColumn || !orderIdColumn.text) {
          logger.warn("No order ID found in item columns", {
            itemId,
            availableColumns: item.column_values?.map((col) => ({
              id: col.id,
              text: col.text,
            })),
          });
          return {
            message: "No order ID found to activate",
            itemId,
            itemName: item.name,
          };
        }

        const orderId = orderIdColumn.text;
        logger.info("Found order ID for activation:", { orderId, itemId });

        try {
          
          const activationResult = await this.ugiftmeService.activateOrder(
            orderId,
            {
              
            }
          );

          logger.info("Order activated successfully:", {
            orderId,
            itemId,
            activationResult,
          });

          
          await this.mondayService.updateItem(
            itemId,
            {
              text_mkvvn51w: "activated", 
              text_mkvvaj0r: new Date().toISOString().split("T")[0], 
            },
            boardId
          );

          return {
            message: "Order activated successfully",
            orderId,
            itemId,
            activationResult,
          };
        } catch (activationError) {
          logger.error("Failed to activate order:", {
            orderId,
            itemId,
            error: activationError.message,
          });

          
          await this.mondayService.updateItem(
            itemId,
            {
              text_mkvvn51w: "activation_failed",
              text_mkvvaj0r: activationError.message,
            },
            boardId
          );

          return {
            message: "Order activation failed",
            orderId,
            itemId,
            error: activationError.message,
          };
        }
      }

      
      logger.info("Status changed but no action needed:", {
        itemId,
        status: value?.label,
      });

      return {
        message: "Status change processed",
        itemId,
        newStatus: value?.label,
      };
    } catch (error) {
      logger.error("Error in handleStatusChanged:", error);
      throw error;
    }
  }

  
  shouldCreateGiftCardOrder(item) {
    const today = new Date();
    const columnValues = item.column_values || [];

    
    const nextMilestoneColumn = columnValues.find((col) =>
      col.id.includes("date_mkvtbjen")
    ); 
    const milestoneTypeColumn = columnValues.find((col) =>
      col.id.includes("color_mkvtrxzc")
    ); 

    if (!nextMilestoneColumn?.text || !milestoneTypeColumn?.text) {
      return false;
    }

    const milestoneDate = new Date(nextMilestoneColumn.text);
    const milestoneType = milestoneTypeColumn.text;

    
    const timeDiff = milestoneDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    
    return daysDiff <= 0 && milestoneType !== "Processed";
  }

  
  async extractOrderData(item) {
    const columnValues = item.column_values || [];
    const getColumnValue = (columnId) => {
      const column = columnValues.find((col) => col.id === columnId);
      return column ? column.text : null;
    };

   
    let merchant = getColumnValue("merchant") || "ASDA"; 
    const amount = parseInt(getColumnValue("amount")) || 10;
    const currency = getColumnValue("currency") || "GBP";

    logger.info("Searching products in UGiftMe:", { merchant });

    try {
      
      let searchResults = await this.ugiftmeService.searchProducts(merchant);
      logger.info("UGiftMe search results (raw):", searchResults);

      let products = searchResults?.products || [];

      
      if (!Array.isArray(products) || products.length === 0) {
        logger.info(
          "No products found with exact match, trying alternatives..."
        );

        const merchantAlternatives = this.getMerchantAlternatives(merchant);

        for (const altMerchant of merchantAlternatives) {
          logger.info("Trying alternative merchant:", altMerchant);
          searchResults = await this.ugiftmeService.searchProducts(altMerchant);
          products = searchResults?.products || [];

          if (Array.isArray(products) && products.length > 0) {
            logger.info(
              "Found products with alternative merchant:",
              altMerchant
            );
            merchant = altMerchant; 
            break;
          }
        }
      }

      
      if (!Array.isArray(products) || products.length === 0) {
        logger.info(
          "No products found with search, trying to get all available products..."
        );
        const allProductsResult = await this.ugiftmeService.getAllProducts();
        const allProducts = allProductsResult?.products || [];

     
        const matchingProduct = allProducts.find(
          (product) =>
            product.merchant?.toLowerCase().includes(merchant.toLowerCase()) ||
            merchant.toLowerCase().includes(product.merchant?.toLowerCase())
        );

        if (matchingProduct) {
          products = [matchingProduct];
          logger.info(
            "Found matching product from all products:",
            matchingProduct
          );
        }
      }

      if (!Array.isArray(products) || products.length === 0) {
      
        logger.info("Attempting to get list of available merchants...");
        try {
          const allProductsResult = await this.ugiftmeService.getAllProducts();
          const availableMerchants = [
            ...new Set(
              (allProductsResult?.products || []).map((p) => p.merchant)
            ),
          ];
          logger.info("Available merchants in UGiftMe:", availableMerchants);
        } catch (merchantError) {
          logger.error(
            "Could not fetch available merchants:",
            merchantError.message
          );
        }

        throw new Error(
          `No products found in UGiftMe for merchant: ${merchant}. Please check available merchants in your UGiftMe dashboard.`
        );
      }

      const product = products[0]; 
      logger.info("Matched product:", {
        productCode: product.productCode,
        merchant: product.merchant,
        currency: product.currency,
        name: product.name || product.productName,
      });

      return {
        productCode: product.productCode,
        merchant: product.merchant,
        currency: product.currency || currency,
        valuePurchased: amount,
      };
    } catch (err) {
      logger.error("Failed to map Monday item to product:", err);
      throw new Error(`Could not find valid product for order: ${err.message}`);
    }
  }

  
  getMerchantAlternatives(originalMerchant) {
    const merchant = originalMerchant.toLowerCase();
    const alternatives = [];

   
    const merchantMappings = {
      "amazon uk": ["ASDA", "Boots", "Currys"], 
      amazon: ["ASDA", "Boots", "Currys"],
      supermarket: ["ASDA", "Farmfoods"],
      pharmacy: ["Boots", "The Body Shop"],
      electronics: ["Currys", "Foot Locker"],
      home: ["B&Q"],
      sports: ["Decathlon", "adidas"],
      restaurant: ["Bella Italia", "Café Rouge", "All Bar One"],
      entertainment: ["Cineworld", "Buyagift"],
      fashion: ["adidas", "Browns", "Foot Locker"],
      beauty: ["The Body Shop", "Boots"],
    };

    
    for (const [key, variations] of Object.entries(merchantMappings)) {
      if (merchant.includes(key) || key.includes(merchant)) {
        alternatives.push(...variations);
      }
    }

    
    alternatives.push(
      originalMerchant,
      "ASDA", 
      "Boots", 
      "Currys",
      "B&Q" 
    );

    
    return [...new Set(alternatives.filter((alt) => alt && alt.trim()))];
  }

  
  async updateItemWithOrderDetails(itemId, order, boardId = null) {
    try {
      const columnValues = {
        text_mkvv457x: order.id || order._id, 
        text_mkvvn51w: order.status || "created", 
        text_mkvvaj0r: order.merchant?.name || order.merchant, 
      };

      await this.mondayService.updateItem(itemId, columnValues, boardId);
      logger.info("Monday item updated with order details", {
        itemId,
        orderId: order.id || order._id,
      });
    } catch (err) {
      logger.error("Failed to update item with order details:", err);
    }
  }
}
