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

  // parsed inside the try: a hand written message that is not json must still be nacked, or it
  // would sit unacked and eat one of the prefetch slots until the channel closes
  let reviewId: string | undefined;
  try {
    reviewId = (JSON.parse(message.content.toString()) as { reviewId: string }).reviewId;
    const outcome = await enrichReview(reviewId);
    channel.ack(message);
    logger.info({ reviewId, outcome }, "review processed");
  } catch (error) {
    logger.error(
      { err: error, reviewId },
      "enrichment failed, message sent to the dead letter queue",
    );
    // the database being down is one of the reasons we are here, so recording the failure can
    // fail as well, and the nack has to happen either way
    if (reviewId) {
      const reason = error instanceof Error ? error.message : "unknown error";
      await markReviewFailed(reviewId, reason).catch((failure) => {
        logger.error({ err: failure, reviewId }, "could not mark the review as failed");
      });
    }
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
