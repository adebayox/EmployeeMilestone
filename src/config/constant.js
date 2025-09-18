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
  PERFORMANCE_PERIOD: "timerange_mkvvr92x",
  TARGET_DESCRIPTION: "long_text_mkvv2hnr",
  TARGET_VALUE: "numeric_mkvvax8c",
  REWARD_TIER: "color_mkvv8y5t",
  GIFT_CARD_AMOUNT: "numeric_mkvvsfzy",
  MANAGER_APPROVAL: "color_mkvv22d8",
  GIFT_CARD_CODE: "text_mkvvj9j2",
  ISSUE_DATE: "date_mkvvvs4j",
  REDEMPTION_STATUS: "color_mkvvpnpv",
  REDEMPTION_VALUE: "numeric_mkvvtrwn",
  EXPIRY_DATE: "date_mkvv1fpm",
  ROI_IMPACT: "numeric_mkvv1sg4",
  PRODUCT_CODE: "product_code",
  MERCHANT: "merchant",
  CURRENCY: "currency",
  VALUE_PURCHASED: "value_purchased",
  RECIPIENT_EMAIL: "recipient_email",
  RECIPIENT_NAME: "recipient_name",
  ORDER_ID: "order_id",
  ORDER_STATUS: "order_status",
  ACTIVATION_CODE: "activation_code",
  EMPLOYEE_NAME: "employee_name",
  EMPLOYEE_EMAIL: "employee_email",
  REWARD_TIER: "reward_tier",
  GIFT_CARD_AMOUNT: "gift_card_amount",
  MANAGER_APPROVAL: "manager_approval",
  GIFT_CARD_CODE: "gift_card_code",
  ISSUE_DATE: "issue_date",
  REDEMPTION_STATUS: "redemption_status",
  REDEMPTION_VALUE: "redemption_value",
  EXPIRY_DATE: "expiry_date",
  ROI_IMPACT: "roi_impact",
  ORDER_ID: "text_orderid_xxx",
  MERCHANT: "text_merchant_xxx",
  CURRENCY: "text_currency_xxx",
};
