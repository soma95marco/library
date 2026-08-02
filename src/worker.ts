import process from "node:process";
import { pino } from "pino";
import { pool } from "./db/client.ts";
import { closeQueue, getChannel, QUEUE } from "./queue/connection.ts";
import { enrichReview, markReviewFailed } from "./reviews/reviews.consumer.ts";

const logger = pino();

const channel = await getChannel();
// enrichment waits on gutendex far more than on cpu, so a handful of messages in flight keeps
// the worker busy without letting one slow instance hold a large slice of the queue hostage
await channel.prefetch(5);

await channel.consume(QUEUE, async (message) => {
  if (!message) return;

  const { reviewId } = JSON.parse(message.content.toString()) as { reviewId: string };
  try {
    const outcome = await enrichReview(reviewId);
    channel.ack(message);
    logger.info({ reviewId, outcome }, "review processed");
  } catch (error) {
    logger.error(
      { err: error, reviewId },
      "enrichment failed, message sent to the dead letter queue",
    );
    await markReviewFailed(reviewId, error instanceof Error ? error.message : "unknown error");
    // no requeue: gutendex being down would make the same message spin forever
    channel.nack(message, false, false);
  }
});

logger.info({ queue: QUEUE }, "worker consuming");

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, async () => {
    logger.info({ signal }, "shutting down");
    await closeQueue();
    await pool.end();
  });
}
