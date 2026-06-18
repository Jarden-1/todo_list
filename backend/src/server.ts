import { buildApp } from "./app";
import { config } from "./config";
import { startPurgeSoftDeletedWorker } from "./jobs/purgeSoftDeletedWorker";
import { startReminderWorker } from "./jobs/reminderWorker";

async function main(): Promise<void> {
  const app = await buildApp();
  const reminderWorker =
    config.NODE_ENV === "test"
      ? null
      : startReminderWorker({
          prisma: app.prisma,
          redis: app.redis,
          logger: app.log
        });
  const purgeWorker =
    config.NODE_ENV === "test"
      ? null
      : startPurgeSoftDeletedWorker({
          prisma: app.prisma,
          redis: app.redis,
          logger: app.log
        });

  const close = async (): Promise<void> => {
    app.log.info("Shutting down SmartTodo backend");
    reminderWorker?.stop();
    purgeWorker?.stop();
    await app.close();
  };

  process.on("SIGINT", () => {
    void close().then(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    void close().then(() => process.exit(0));
  });

  await app.listen({
    port: config.PORT,
    host: "0.0.0.0"
  });
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
