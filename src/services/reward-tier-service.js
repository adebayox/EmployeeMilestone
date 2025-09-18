// import { logger } from "../utils/logger.js";
// import fs from "fs/promises";
// import path from "path";

// export class RewardTierService {
//   constructor() {
//     this.configPath = path.join(process.cwd(), "config", "reward-tiers.json");
//     this.defaultTiers = [
//       {
//         tier: "Bronze",
//         minValue: 0,
//         maxValue: 1000,
//         giftCardAmount: 10,
//         description: "Basic achievement recognition",
//       },
//       {
//         tier: "Silver",
//         minValue: 1001,
//         maxValue: 5000,
//         giftCardAmount: 25,
//         description: "Good performance achievement",
//       },
//       {
//         tier: "Gold",
//         minValue: 5001,
//         maxValue: 15000,
//         giftCardAmount: 50,
//         description: "Excellent performance achievement",
//       },
//       {
//         tier: "Platinum",
//         minValue: 15001,
//         maxValue: Infinity,
//         giftCardAmount: 100,
//         description: "Outstanding performance achievement",
//       },
//     ];
//   }

//   async getTierConfiguration() {
//     try {
//       await this.ensureConfigExists();
//       const configData = await fs.readFile(this.configPath, "utf8");
//       return JSON.parse(configData);
//     } catch (error) {
//       logger.error("Failed to get tier configuration:", error);
//       return this.defaultTiers;
//     }
//   }

//   async updateTierConfiguration(tiers) {
//     try {
//       this.validateTierConfiguration(tiers);

//       await this.ensureConfigDirectory();
//       await fs.writeFile(this.configPath, JSON.stringify(tiers, null, 2));

//       logger.info("Tier configuration updated successfully");
//     } catch (error) {
//       logger.error("Failed to update tier configuration:", error);
//       throw error;
//     }
//   }

//   async calculateRewardTier(targetValue, department = null) {
//     try {
//       const tiers = await this.getTierConfiguration();

//       const adjustedValue = this.applyDepartmentMultiplier(
//         targetValue,
//         department
//       );

//       const matchingTier = tiers.find(
//         (tier) =>
//           adjustedValue >= tier.minValue && adjustedValue <= tier.maxValue
//       );

//       return matchingTier ? matchingTier.tier : "Bronze";
//     } catch (error) {
//       logger.error("Failed to calculate reward tier:", error);
//       return "Bronze";
//     }
//   }

//   async getAmountForTier(tierName) {
//     try {
//       const tiers = await this.getTierConfiguration();
//       const tier = tiers.find((t) => t.tier === tierName);
//       return tier ? tier.giftCardAmount : 10;
//     } catch (error) {
//       logger.error("Failed to get amount for tier:", error);
//       return 10;
//     }
//   }

//   async getTierDetails(tierName) {
//     try {
//       const tiers = await this.getTierConfiguration();
//       return tiers.find((t) => t.tier === tierName) || null;
//     } catch (error) {
//       logger.error("Failed to get tier details:", error);
//       return null;
//     }
//   }

//   async getTierNames() {
//     try {
//       const tiers = await this.getTierConfiguration();
//       return tiers.map((tier) => tier.tier);
//     } catch (error) {
//       logger.error("Failed to get tier names:", error);
//       return ["Bronze", "Silver", "Gold", "Platinum"];
//     }
//   }

//   applyDepartmentMultiplier(targetValue, department) {
//     const departmentMultipliers = {
//       Sales: 1.0,
//       Marketing: 1.2,
//       Engineering: 1.1,
//       Support: 1.3,
//       Operations: 1.0,
//     };

//     const multiplier = departmentMultipliers[department] || 1.0;
//     return targetValue * multiplier;
//   }

//   validateTierConfiguration(tiers) {
//     if (!Array.isArray(tiers)) {
//       throw new Error("Tiers must be an array");
//     }

//     for (const tier of tiers) {
//       if (!tier.tier || typeof tier.tier !== "string") {
//         throw new Error("Each tier must have a valid tier name");
//       }

//       if (
//         typeof tier.minValue !== "number" ||
//         typeof tier.maxValue !== "number"
//       ) {
//         throw new Error("Each tier must have valid minValue and maxValue");
//       }

//       if (tier.minValue >= tier.maxValue && tier.maxValue !== Infinity) {
//         throw new Error("minValue must be less than maxValue");
//       }

//       if (typeof tier.giftCardAmount !== "number" || tier.giftCardAmount <= 0) {
//         throw new Error("Each tier must have a valid giftCardAmount");
//       }
//     }

//     // Check for overlapping ranges
//     const sortedTiers = [...tiers].sort((a, b) => a.minValue - b.minValue);
//     for (let i = 1; i < sortedTiers.length; i++) {
//       if (
//         sortedTiers[i].minValue <= sortedTiers[i - 1].maxValue &&
//         sortedTiers[i - 1].maxValue !== Infinity
//       ) {
//         throw new Error("Tier ranges cannot overlap");
//       }
//     }
//   }

//   /**
//    * Ensure config directory exists
//    */
//   async ensureConfigDirectory() {
//     const configDir = path.dirname(this.configPath);
//     try {
//       await fs.access(configDir);
//     } catch {
//       await fs.mkdir(configDir, { recursive: true });
//     }
//   }

//   /**
//    * Ensure config file exists with defaults
//    */
//   async ensureConfigExists() {
//     try {
//       await fs.access(this.configPath);
//     } catch {
//       await this.ensureConfigDirectory();
//       await fs.writeFile(
//         this.configPath,
//         JSON.stringify(this.defaultTiers, null, 2)
//       );
//       logger.info("Created default tier configuration");
//     }
//   }

//   /**
//    * Get tier statistics
//    */
//   async getTierStatistics(rewards) {
//     const tiers = await this.getTierConfiguration();
//     const stats = {};

//     tiers.forEach((tier) => {
//       stats[tier.tier] = {
//         count: 0,
//         totalValue: 0,
//         averageValue: 0,
//         totalGiftCardAmount: 0,
//       };
//     });

//     rewards.forEach((reward) => {
//       if (stats[reward.rewardTier]) {
//         stats[reward.rewardTier].count++;
//         stats[reward.rewardTier].totalValue += reward.targetValue || 0;
//         stats[reward.rewardTier].totalGiftCardAmount +=
//           reward.giftCardAmount || 0;
//       }
//     });

//     // Calculate averages
//     Object.keys(stats).forEach((tier) => {
//       if (stats[tier].count > 0) {
//         stats[tier].averageValue = stats[tier].totalValue / stats[tier].count;
//       }
//     });

//     return stats;
//   }
// }
