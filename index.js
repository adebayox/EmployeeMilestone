import { MondayService } from "../src/services/monday-service.js";
import { UGiftMeService } from "../src/services/ugiftme-service.js";
import { logger } from "../src/utils/logger.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Test script to verify API connectivity and functionality
 */
async function runTests() {
  logger.info("Starting API connectivity tests...");

  // Test UGiftMe API
  await testUGiftMeAPI();

  // Test Monday.com API (if configured)
  if (process.env.MONDAY_ACCESS_TOKEN) {
    await testMondayAPI();
  } else {
    logger.warn(
      "Monday.com access token not configured, skipping Monday API tests"
    );
  }

  logger.info("All tests completed!");
}

/**
 * Test UGiftMe API connectivity
 */
async function testUGiftMeAPI() {
  logger.info("Testing UGiftMe API...");

  try {
    const ugiftmeService = new UGiftMeService();

    // Test health check
    await ugiftmeService.healthCheck();
    logger.info("✅ UGiftMe health check passed");

    // Test wallet endpoint
    try {
      const wallet = await ugiftmeService.getWallet();
      logger.info("✅ Wallet fetch successful:", {
        currencies: Object.keys(wallet || {}),
      });
    } catch (error) {
      logger.warn(
        "⚠️  Wallet fetch failed (may require specific permissions):",
        error.message
      );
    }

    // Test product search
    try {
      const products = await ugiftmeService.searchProducts("Amazon");
      logger.info("✅ Product search successful");
    } catch (error) {
      logger.warn("⚠️  Product search failed:", error.message);
    }

    // Test orders list
    try {
      const orders = await ugiftmeService.getOrders(1, 5);
      logger.info("✅ Orders fetch successful");
    } catch (error) {
      logger.warn("⚠️  Orders fetch failed:", error.message);
    }
  } catch (error) {
    logger.error("❌ UGiftMe API test failed:", error.message);
  }
}

/**
 * Test Monday.com API connectivity
 */
async function testMondayAPI() {
  logger.info("Testing Monday.com API...");

  try {
    const mondayService = new MondayService();

    // Test health check
    await mondayService.healthCheck();
    logger.info("✅ Monday.com health check passed");

    // Test boards fetch
    try {
      const boards = await mondayService.getBoards();
      logger.info("✅ Boards fetch successful:", {
        count: boards.length,
        boards: boards.slice(0, 3).map((b) => ({ id: b.id, name: b.name })),
      });

      // Test items fetch for first board
      if (boards.length > 0) {
        const items = await mondayService.getBoardItems(boards[0].id);
        logger.info("✅ Board items fetch successful:", {
          boardId: boards[0].id,
          itemCount: items.length,
        });
      }
    } catch (error) {
      logger.warn("⚠️  Monday.com data fetch failed:", error.message);
    }
  } catch (error) {
    logger.error("❌ Monday.com API test failed:", error.message);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    logger.error("Test execution failed:", error);
    process.exit(1);
  });
}
