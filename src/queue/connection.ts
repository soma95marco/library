import amqp, { type Channel, type ChannelModel } from "amqplib";
import { config } from "../config.ts";

const EXCHANGE = "reviews";
const DEAD_LETTER_EXCHANGE = "reviews.dlx";
const QUEUE = "reviews.enrich";
const DEAD_LETTER_QUEUE = "reviews.enrich.dlq";
const ROUTING_KEY = "review.created";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

// both processes call this: the topology is declared by whoever connects first, so the worker
// starting before the api (or the other way round) makes no difference
const getChannel = async (): Promise<Channel> => {
  if (channel) return channel;

  connection = await amqp.connect(config.RABBITMQ_URL);
  const created = await connection.createChannel();

  await created.assertExchange(EXCHANGE, "direct", { durable: true });
  await created.assertExchange(DEAD_LETTER_EXCHANGE, "direct", { durable: true });
  await created.assertQueue(QUEUE, {
    durable: true,
    deadLetterExchange: DEAD_LETTER_EXCHANGE,
    deadLetterRoutingKey: ROUTING_KEY,
  });
  await created.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
  await created.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);
  await created.bindQueue(DEAD_LETTER_QUEUE, DEAD_LETTER_EXCHANGE, ROUTING_KEY);

  channel = created;
  return created;
};

// only the id travels: the worker re-reads the row, so a PUT landing in the meantime is not lost
const publishReviewCreated = async (reviewId: string): Promise<void> => {
  const ch = await getChannel();
  ch.publish(EXCHANGE, ROUTING_KEY, Buffer.from(JSON.stringify({ reviewId })), {
    persistent: true,
  });
};

const closeQueue = async (): Promise<void> => {
  await channel?.close();
  await connection?.close();
  channel = null;
  connection = null;
};

export { closeQueue, getChannel, publishReviewCreated, QUEUE };
