import type { FastifyPluginAsync } from "fastify";
import type { Review } from "../db/schema.ts";
import { createReviewSchema, searchQuerySchema, updateReviewSchema } from "./reviews.schemas.ts";
import type { PublishReview } from "./reviews.service.ts";
import * as service from "./reviews.service.ts";

type RoutesOptions = { publish: PublishReview };
type IdParam = { Params: { id: string } };

const reviewResponse = (review: Review) => ({
  id: review.id,
  status: review.status,
  bookId: review.bookId,
  score: review.score,
  content: review.content,
  book:
    review.status === "ready"
      ? {
          title: review.bookTitle,
          authors: review.bookAuthors,
          coverUrl: review.bookCoverUrl,
          metadata: review.bookMetadata,
        }
      : null,
  failureReason: review.failureReason,
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

const reviewsRoutes: FastifyPluginAsync<RoutesOptions> = async (app, { publish }) => {
  app.get("/book/search", async (request) => {
    const { q } = searchQuerySchema.parse(request.query);
    const books = await service.searchCatalog(q);
    return books.map(({ id, title, authors, coverUrl }) => ({ id, title, authors, coverUrl }));
  });

  app.post("/review", async (request, reply) => {
    const input = createReviewSchema.parse(request.body);
    const review = await service.createReview(input, publish);
    return reply
      .status(202)
      .header("Location", `/review/${review.id}`)
      .send({ id: review.id, status: review.status });
  });

  app.get<IdParam>("/review/:id", async (request, reply) => {
    const review = await service.getReview(request.params.id);
    // still queued: there is no book data to hand back, so the client is told to come back
    if (review.status === "pending") {
      return reply.status(202).send({ id: review.id, status: review.status });
    }
    return reviewResponse(review);
  });

  app.put<IdParam>("/review/:id", async (request) => {
    const input = updateReviewSchema.parse(request.body);
    return reviewResponse(await service.updateReview(request.params.id, input));
  });

  app.delete<IdParam>("/review/:id", async (request, reply) => {
    await service.deleteReview(request.params.id);
    return reply.status(204).send();
  });
};

export { reviewsRoutes };
