import mondaySdk from "monday-sdk-js";
import axios from "axios";
import { logger } from "../utils/logger.js";

class MondayService {
  constructor() {
    if (!process.env.MONDAY_ACCESS_TOKEN) {
      throw new Error("MONDAY_ACCESS_TOKEN is not set in environment");
    }
    this.accessToken = process.env.MONDAY_ACCESS_TOKEN;
    this.baseUrl = process.env.MONDAY_URL;
  }

  async makeRequest(query, variables = {}) {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: this.accessToken,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      const data = await response.json();

      if (data.errors) {
        throw new Error(`Monday.com API Error: ${data.errors[0].message}`);
      }

      return data.data;
    } catch (error) {
      console.error("Monday Service Error:", error);
      throw error;
    }
  }

  async getBoards() {
    const query = `
      query {
        boards {
          id
          name
          description
          state
        }
      }
    `;

    return this.makeRequest(query);
  }

  async getBoardItems(boardId) {
    const query = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          items_page {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        }
      }
    `;

    return this.makeRequest(query, { boardId });
  }

  async createItem(boardId, itemName, columnValues = {}) {
    const query = `
      mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON) {
        create_item(
          board_id: $boardId
          item_name: $itemName
          column_values: $columnValues
        ) {
          id
          name
        }
      }
    `;

    return this.makeRequest(query, {
      boardId,
      itemName,
      columnValues: JSON.stringify(columnValues),
    });
  }

  async updateItem(itemId, columnValues, boardId = null) {
    const query = boardId
      ? `
        mutation ($itemId: ID!, $boardId: ID!, $columnValues: JSON!) {
          change_multiple_column_values(
            item_id: $itemId
            board_id: $boardId
            column_values: $columnValues
          ) {
            id
            name
          }
        }
      `
      : `
        mutation ($itemId: ID!, $columnValues: JSON!) {
          change_multiple_column_values(
            item_id: $itemId
            column_values: $columnValues
          ) {
            id
            name
          }
        }
      `;

    const variables = {
      itemId,
      columnValues: JSON.stringify(columnValues),
    };

    if (boardId) {
      variables.boardId = boardId;
    }

    return this.makeRequest(query, variables);
  }

  async exchangeCodeForTokens(code) {
    return {
      access_token: "placeholder_token",
      token_type: "Bearer",
    };
  }
}

export default MondayService;

export { MondayService };
