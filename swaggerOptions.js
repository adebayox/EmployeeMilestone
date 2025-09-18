// swaggerOptions.js
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "UGM INTEGRATIONS",
      version: "1.0.0",
      description: "API Documentation for UGM INTEGRATION TASKS",

      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    components: {
      // securitySchemes: {
      //   bearerAuth: {
      //     type: "http",
      //     scheme: "bearer",
      //     bearerFormat: "JWT",
      //   },
      // },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    servers: [
      {
        url: "http://localhost:3000",
        description: "Local development server",
      },
    ],
  },

  apis: ["./src/routes/*.js"],
};

module.exports = options;
