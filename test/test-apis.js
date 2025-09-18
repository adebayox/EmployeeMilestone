import { MondayService } from "../src/services/monday-service.js";
import { UGiftMeService } from "../src/services/ugiftme-service.js";
import { logger } from "../src/utils/logger.js";
import dotenv from "dotenv";

dotenv.config();

async function runTests() {
  logger.info("Starting API connectivity tests...");

  await testUGiftMeAPI();

  if (process.env.MONDAY_ACCESS_TOKEN) {
    await testMondayAPI();
  } else {
    logger.warn(
      "Monday.com access token not configured, skipping Monday API tests"
    );
  }

  logger.info("All tests completed!");
}

async function testUGiftMeAPI() {
  logger.info("Testing UGiftMe API...");

  try {
    const ugiftmeService = new UGiftMeService();

    await ugiftmeService.healthCheck();
    logger.info("UGiftMe health check passed");

    // try {
    //   const wallet = await ugiftmeService.getWallet();
    //   logger.info("✅ Wallet fetch successful:", {
    //     currencies: Object.keys(wallet || {}),
    //   });
    // } catch (error) {
    //   logger.warn(
    //     "Wallet fetch failed (may require specific permissions):",
    //     error.message
    //   );
    // }

    try {
      const products = await ugiftmeService.searchProducts("Amazon");
      logger.info("✅ Product search successful");
    } catch (error) {
      logger.warn("⚠️  Product search failed:", error.message);
    }

    try {
      const orders = await ugiftmeService.getOrders(1, 5);
      logger.info("Orders fetch successful");
    } catch (error) {
      logger.warn("Orders fetch failed:", error.message);
    }
  } catch (error) {
    logger.error("UGiftMe API test failed:", error.message);
  }
}

async function testMondayAPI() {
  logger.info("Testing Monday.com API...");

  try {
    const mondayService = new MondayService();

    await mondayService.healthCheck();
    logger.info("Monday.com health check passed");

    try {
      const boards = await mondayService.getBoards();
      logger.info("Boards fetch successful:", {
        count: boards.length,
        boards: boards.slice(0, 3).map((b) => ({ id: b.id, name: b.name })),
      });

      if (boards.length > 0) {
        const items = await mondayService.getBoardItems(boards[0].id);
        logger.info("Board items fetch successful:", {
          boardId: boards[0].id,
          itemCount: items.length,
        });
      }
    } catch (error) {
      logger.warn("Monday.com data fetch failed:", error.message);
    }
  } catch (error) {
    logger.error("Monday.com API test failed:", error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch((error) => {
    logger.error("Test execution failed:", error);
    process.exit(1);
  });
}
