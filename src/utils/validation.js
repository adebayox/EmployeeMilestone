import { logger } from "./logger.js";
export function validateEnvironment() {
  const requiredVars = ["UGIFTME_API_KEY", "UGIFTME_BASE_URL"];

  const optionalVars = [
    "MONDAY_CLIENT_ID",
    "MONDAY_CLIENT_SECRET",
    "MONDAY_ACCESS_TOKEN",
    "MONDAY_SIGNING_SECRET",
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  const missingOptional = optionalVars.filter(
    (varName) => !process.env[varName]
  );
  if (missingOptional.length > 0) {
    logger.warn("Missing optional environment variables:", missingOptional);
    logger.warn("Some features may not work without these variables");
  }

  logger.info("Environment variables validated successfully");
}

export function validateWebhookPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload format");
  }

  if (!payload.event) {
    throw new Error("Payload missing event data");
  }

  return true;
}

export function validateOrderData(orderData) {
  const requiredFields = [
    "productCode",
    "merchant",
    "currency",
    "valuePurchased",
  ];
  const missingFields = requiredFields.filter((field) => !orderData[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required order fields: ${missingFields.join(", ")}`
    );
  }

  if (
    typeof orderData.valuePurchased !== "number" ||
    orderData.valuePurchased <= 0
  ) {
    throw new Error("valuePurchased must be a positive number");
  }

  const validCurrencies = ["GBP", "USD", "EUR"];
  if (!validCurrencies.includes(orderData.currency)) {
    throw new Error(
      `Invalid currency. Must be one of: ${validCurrencies.join(", ")}`
    );
  }

  return true;
}
