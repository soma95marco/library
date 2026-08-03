import type { FastifyPluginAsync } from "fastify";
import type { ReviewWithBook } from "./reviews.repository.ts";
import { createReviewSchema, searchQuerySchema, updateReviewSchema } from "./reviews.schemas.ts";
import type { PublishReview } from "./reviews.service.ts";
import * as service from "./reviews.service.ts";

type RoutesOptions = { publish: PublishReview };
type IdParam = { Params: { id: string } };

const reviewResponse = ({ review, book }: ReviewWithBook) => ({
  id: review.id,
  status: review.status,
  bookId: review.bookId,
  score: review.score,
  review: review.content,
  book:
    review.status === "ready" && book
      ? {
          title: book.title,
          authors: book.authors,
          coverUrl: book.coverUrl,
          metadata: book.metadata,
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
    const { id, review: content, score } = createReviewSchema.parse(request.body);
    const { review } = await service.createReview({ bookId: id, content, score }, publish);
    return reply
      .status(202)
      .header("Location", `/review/${review.id}`)
      .send({ id: review.id, status: review.status });
  });

  app.get<IdParam>("/review/:id", async (request, reply) => {
    const found = await service.getReview(request.params.id);
    // still queued: there is no book data to hand back, so the client is told to come back
    if (found.review.status === "pending") {
      return reply.status(202).send({ id: found.review.id, status: found.review.status });
    }
    return reviewResponse(found);
  });

  app.put<IdParam>("/review/:id", async (request) => {
    const { review: content, score } = updateReviewSchema.parse(request.body);
    return reviewResponse(await service.updateReview(request.params.id, { content, score }));
  });

  app.delete<IdParam>("/review/:id", async (request, reply) => {
    await service.deleteReview(request.params.id);
    return reply.status(204).send();
  });
};

export { reviewsRoutes };
