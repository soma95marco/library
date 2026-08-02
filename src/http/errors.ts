import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

class AppError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return reply.status(400).send({ error: "validation failed", details });
  }

  if (error instanceof AppError) {
    return reply.status(error.status).send({ error: error.message });
  }

  // anything else is a bug or a dependency being down: log it whole, tell the client nothing
  request.log.error({ err: error }, "unhandled error");
  return reply.status(500).send({ error: "internal server error" });
};

export { AppError, errorHandler };
