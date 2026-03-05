import pino from "pino";

const logger = pino({
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined,
});

export const emailLogger = logger.child({ module: "email" });
export const stripeLogger = logger.child({ module: "stripe" });
export const serverLogger = logger.child({ module: "server" });
export const nextLogger = logger.child({ module: "nextjs" });
