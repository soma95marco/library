import process from "node:process";
import Fastify, { type FastifyInstance } from "fastify";
import { config } from "./config.ts";
import { pool } from "./db/client.ts";
import { errorHandler } from "./http/errors.ts";
import { docsRoutes } from "./http/openapi.ts";
import { closeQueue, publishReviewCreated } from "./queue/connection.ts";
import { reviewsRoutes } from "./reviews/reviews.routes.ts";
import type { PublishReview } from "./reviews/reviews.service.ts";

const buildApp = (publish: PublishReview, logger = true): FastifyInstance => {
  const app = Fastify({ logger });
  app.setErrorHandler(errorHandler);
  app.get("/health", async () => ({ status: "ok" }));
  app.register(docsRoutes);
  app.register(reviewsRoutes, { publish });
  return app;
};

const start = async (): Promise<void> => {
  const app = buildApp(publishReviewCreated);

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, async () => {
      // close in dependency order and let node exit once the handles are gone: an explicit
      // process.exit here would cut the requests app.close is still draining
      app.log.info({ signal }, "shutting down");
      await app.close();
      await closeQueue();
      await pool.end();
    });
  }

  await app.listen({ port: config.PORT, host: "0.0.0.0" });
};

// guarded so the http tests can import buildApp without opening a port
if (import.meta.main) await start();

export { buildApp };
