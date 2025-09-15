/**
 * Application constants and configuration
 */

export const WEBHOOK_EVENTS = {
  CREATE_ITEM: "create_item",
  CHANGE_COLUMN_VALUE: "change_column_value",
  CHANGE_STATUS_COLUMN_VALUE: "change_status_column_value",
  CREATE_UPDATE: "create_update",
};

export const ORDER_STATUSES = {
  CREATED: "created",
  PAID: "paid",
  ACTIVE: "active",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  FAILED: "failed",
};

export const SUPPORTED_CURRENCIES = ["GBP", "USD", "EUR"];

export const SUPPORTED_MERCHANTS = [
  "Amazon",
  "Adidas",
  "All Bar One",
  "Starbucks",
  "John Lewis",
  "Argos",
];

export const API_ENDPOINTS = {
  MONDAY: {
    AUTH: "https://auth.monday.com/oauth2/token",
    GRAPHQL: "https://api.monday.com/v2",
  },
  UGIFTME: {
    STAGE: "https://api-stage.ugift.me/api/v1",
    PRODUCTION: "https://api.ugift.me/api/v1",
  },
};

export const COLUMN_MAPPINGS = {
  // Map Monday.com column IDs to UGiftMe order fields
  // Customize these based on your actual Monday.com board structure
  PRODUCT_CODE: "product_code",
  MERCHANT: "merchant",
  CURRENCY: "currency",
  AMOUNT: "amount",
  ORDER_ID: "order_id",
  ORDER_STATUS: "order_status",
  ACTIVATION_CODE: "activation_code",
};
