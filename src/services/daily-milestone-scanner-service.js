import { MondayService } from "./monday-service.js";
import { UGiftMeService } from "./ugiftme-service.js";
import { MilestoneCalculatorService } from "./milestone-calculator-service.js";
import { logger } from "../utils/logger.js";


export class DailyMilestoneScannerService {
  constructor() {
    this.mondayService = new MondayService();
    this.ugiftmeService = new UGiftMeService();
    this.milestoneCalculator = new MilestoneCalculatorService();
    this.boardId = process.env.MONDAY_BOARD_ID || "2150077747"; // Your board ID
  }

  
  async scanAndProcessMilestones() {
    try {
      logger.info("Starting daily milestone scan...");

      
      const employees = await this.getEmployeeData();
      logger.info(`Found ${employees.length} employees to check`);

      
      const milestonesToday = this.findTodaysMilestones(employees);
      logger.info(`Found ${milestonesToday.length} milestones for today`);

      
      const results = [];
      for (const milestone of milestonesToday) {
        try {
          const result = await this.processMilestone(milestone);
          results.push(result);
        } catch (error) {
          logger.error("Failed to process milestone:", {
            employee: milestone.name,
            error: error.message,
          });
          results.push({
            employee: milestone.name,
            success: false,
            error: error.message,
          });
        }
      }

      logger.info("Milestone scan completed", {
        totalEmployees: employees.length,
        milestonesToday: milestonesToday.length,
        processed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      });

      return {
        totalEmployees: employees.length,
        milestonesToday: milestonesToday.length,
        results,
      };
    } catch (error) {
      logger.error("Daily milestone scan failed:", error);
      throw error;
    }
  }

 
  async getEmployeeData() {
    try {
      const response = await this.mondayService.getBoardItems(this.boardId);
      const items = this.extractItems(response);

      return items.map((item) => this.parseEmployeeFromItem(item));
    } catch (error) {
      logger.error("Failed to fetch employee data:", error);
      throw error;
    }
  }

  
  extractItems(response) {
    if (response?.boards?.[0]?.items_page?.items) {
      return response.boards[0].items_page.items;
    }
    if (Array.isArray(response)) {
      return response;
    }
    throw new Error("Unable to extract items from Monday.com response");
  }

  
  parseEmployeeFromItem(item) {
    const getColumnValue = (pattern) => {
      const column = item.column_values?.find(
        (col) => col.id.includes(pattern) || col.id === pattern
      );
      return column ? column.text : null;
    };

    const getColumnValueById = (columnId) => {
      const column = item.column_values?.find((col) => col.id === columnId);
      return column ? column.text : null;
    };

    return {
      itemId: item.id,
      name: item.name,
      email: getColumnValue("email") || getColumnValueById("email_mkvt4x2g"),
      hireDate: getColumnValue("date_mkvtcjy7")
        ? new Date(getColumnValue("date_mkvtcjy7"))
        : null,
      birthday: getColumnValue("date_mkvtw3jr")
        ? new Date(getColumnValue("date_mkvtw3jr"))
        : null,
      department:
        getColumnValue("dropdown") || getColumnValueById("dropdown_mkvtsvpf"),
      nextMilestoneDate: getColumnValue("date_mkvtbjen")
        ? new Date(getColumnValue("date_mkvtbjen"))
        : null,
      milestoneType: getColumnValue("color_mkvtrxzc"),
      giftCardAmount:
        getColumnValue("numeric") || getColumnValueById("numeric_mkvt3p4p"),
      processingStatus: getColumnValue("color_mkvty3bb"),
      lastProcessed: getColumnValue("date_mkvtmdgh")
        ? new Date(getColumnValue("date_mkvtmdgh"))
        : null,
      giftCardCode: getColumnValue("text_mkvtnt08"),

      columnMappings: {
        email: "email_mkvt4x2g",
        hireDate: "date_mkvtcjy7",
        birthday: "date_mkvtw3jr",
        department: "dropdown_mkvtsvpf",
        nextMilestone: "date_mkvtbjen",
        milestoneType: "color_mkvtrxzc",
        giftCardAmount: "numeric_mkvt3p4p",
        processingStatus: "color_mkvty3bb",
        lastProcessed: "date_mkvtmdgh",
        giftCardCode: "text_mkvtnt08",
      },
    };
  }

 
  findTodaysMilestones(employees) {
    const today = new Date();
    const milestonesToday = [];

    for (const employee of employees) {
      if (!employee.hireDate && !employee.birthday) {
        continue;
      }

      
      if (employee.lastProcessed) {
        const lastProcessed = new Date(employee.lastProcessed);
        const isAlreadyProcessedToday =
          lastProcessed.getDate() === today.getDate() &&
          lastProcessed.getMonth() === today.getMonth() &&
          lastProcessed.getFullYear() === today.getFullYear();

        if (isAlreadyProcessedToday) {
          logger.debug("Employee already processed today:", employee.name);
          continue;
        }
      }

      
      if (employee.birthday) {
        const isBirthdayToday =
          employee.birthday.getDate() === today.getDate() &&
          employee.birthday.getMonth() === today.getMonth();

        if (isBirthdayToday) {
          milestonesToday.push({
            ...employee,
            milestoneType: "Birthday",
            amount: this.milestoneCalculator.getMilestoneAmount("Birthday"),
          });
          continue;
        }
      }

      
      if (employee.hireDate) {
        const isHireAnniversary =
          employee.hireDate.getDate() === today.getDate() &&
          employee.hireDate.getMonth() === today.getMonth();

        if (isHireAnniversary) {
          const yearsOfService =
            today.getFullYear() - employee.hireDate.getFullYear();

          
          const milestoneYears = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30];
          if (milestoneYears.includes(yearsOfService)) {
            const milestoneType = `${yearsOfService}-Year`;
            milestonesToday.push({
              ...employee,
              milestoneType,
              amount:
                this.milestoneCalculator.getMilestoneAmount(milestoneType),
              yearsOfService,
            });
          }
        }
      }
    }

    return milestonesToday;
  }

 
  async processMilestone(milestone) {
    logger.info("Processing milestone:", {
      employee: milestone.name,
      type: milestone.milestoneType,
      amount: milestone.amount,
    });

    try {
      
      await this.updateEmployeeStatus(milestone, "Sent");

      
      const orderData = {
        productCode: "ASDA-GB", 
        merchant: "ASDA",
        currency: "GBP",
        valuePurchased: milestone.amount || 50,
        // Add metadata
        employeeName: milestone.name,
        milestoneType: milestone.milestoneType,
        orderReference: `${milestone.itemId}-${milestone.milestoneType}-${
          new Date().toISOString().split("T")[0]
        }`,
      };

      const order = await this.ugiftmeService.createOrder(orderData);
      logger.info("Gift card order created:", {
        employee: milestone.name,
        orderId: order.id || order._id,
        amount: milestone.amount,
      });

      
      const activationResult = await this.ugiftmeService.activateOrder(
        order.id || order._id,
        { employeeName: milestone.name }
      );

      const voucherCode =
        activationResult?.order?.merchant?.voucherCode ||
        order?.merchant?.voucherCode ||
        "Voucher details will be emailed";

      logger.info("Gift card activated:", {
        employee: milestone.name,
        orderId: order.id || order._id,
        voucherCode: voucherCode?.substring(0, 20) + "...", 
      });

      
      await this.updateEmployeeAfterSuccess(milestone, order, voucherCode);

      return {
        employee: milestone.name,
        success: true,
        orderId: order.id || order._id,
        amount: milestone.amount,
        milestoneType: milestone.milestoneType,
        voucherCode: voucherCode,
      };
    } catch (error) {
      logger.error("Failed to process milestone:", {
        employee: milestone.name,
        error: error.message,
      });

     
      await this.updateEmployeeStatus(milestone, "Error", error.message);

      return {
        employee: milestone.name,
        success: false,
        error: error.message,
        milestoneType: milestone.milestoneType,
      };
    }
  }

  
  async updateEmployeeStatus(employee, status, errorMessage = null) {
    try {
      
      const statusMapping = {
        Sent: "Sent", 
        Delivered: "Delivered", 
        Error: "Error",
        Pending: "Pending",
      };

      const mondayStatus = statusMapping[status] || status;

      const columnValues = {
        [employee.columnMappings.processingStatus]: mondayStatus,
        [employee.columnMappings.lastProcessed]: new Date()
          .toISOString()
          .split("T")[0],
      };

      
      if (errorMessage && employee.columnMappings.giftCardCode) {
        columnValues[
          employee.columnMappings.giftCardCode
        ] = `Error: ${errorMessage}`;
      }

      await this.mondayService.updateItem(
        employee.itemId,
        columnValues,
        this.boardId
      );

      logger.debug("Updated employee status:", {
        employee: employee.name,
        status: mondayStatus,
      });
    } catch (error) {
      logger.error("Failed to update employee status:", {
        employee: employee.name,
        error: error.message,
      });
    }
  }

  
  async updateEmployeeAfterSuccess(employee, order, voucherCode) {
    try {
     
      const nextMilestone = this.milestoneCalculator.calculateNextMilestone(
        employee.hireDate,
        employee.birthday
      );

      const columnValues = {
        [employee.columnMappings.processingStatus]: "Delivered",
        [employee.columnMappings.lastProcessed]: new Date()
          .toISOString()
          .split("T")[0],
        [employee.columnMappings.giftCardCode]:
          voucherCode || order.id || order._id,
      };

     
      if (nextMilestone) {
        columnValues[employee.columnMappings.nextMilestone] = nextMilestone.date
          .toISOString()
          .split("T")[0];
        columnValues[employee.columnMappings.milestoneType] =
          nextMilestone.type;
        columnValues[employee.columnMappings.giftCardAmount] =
          nextMilestone.amount.toString();
      }

      await this.mondayService.updateItem(
        employee.itemId,
        columnValues,
        this.boardId
      );

      logger.info("Employee record updated successfully:", {
        employee: employee.name,
        nextMilestone: nextMilestone
          ? `${nextMilestone.type} on ${nextMilestone.date.toDateString()}`
          : "None",
      });
    } catch (error) {
      logger.error("Failed to update employee after success:", {
        employee: employee.name,
        error: error.message,
      });
    }
  }
}
