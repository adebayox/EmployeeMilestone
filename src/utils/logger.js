class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta,
    };

    if (this.isDevelopment) {
      return JSON.stringify(logData, null, 2);
    }
    return JSON.stringify(logData);
  }

  info(message, meta = {}) {
    console.log(this.formatMessage("info", message, meta));
  }

  error(message, meta = {}) {
    console.error(this.formatMessage("error", message, meta));
  }

  warn(message, meta = {}) {
    console.warn(this.formatMessage("warn", message, meta));
  }

  debug(message, meta = {}) {
    if (this.isDevelopment) {
      console.log(this.formatMessage("debug", message, meta));
    }
  }
}

export const logger = new Logger();
