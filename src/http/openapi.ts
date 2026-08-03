import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createReviewSchema, updateReviewSchema } from "../reviews/reviews.schemas.ts";

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object, example?: unknown) => ({
  content: { "application/json": { schema, ...(example ? { example } : {}) } },
});

const idParam = {
  name: "id",
  in: "path",
  required: true,
  description: "the uuid returned by POST /review",
  schema: { type: "string", format: "uuid" },
};

const readyExample = {
  id: "c6d7c11a-3ca6-4b3d-9942-a7ee8d0b721c",
  status: "ready",
  bookId: "2701",
  score: 8,
  review: "long, dense, and worth finishing at least once",
  book: {
    title: "Moby Dick; Or, The Whale",
    authors: ["Melville, Herman"],
    coverUrl: "https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg",
    metadata: { languages: ["en"], subjects: ["Whaling -- Fiction"], downloadCount: 188210 },
  },
  failureReason: null,
  createdAt: "2026-08-03T10:05:41.000Z",
  updatedAt: "2026-08-03T10:05:42.000Z",
};

const errors = {
  400: { description: "validation failed, details say which field", ...json(ref("Error")) },
  404: { description: "no review with that id", ...json(ref("Error")) },
  500: {
    description: "gutendex did not answer in time, or something else broke",
    ...json(ref("Error")),
  },
};

// hand written on purpose: the routes validate with zod inside the handler, so there is no
// fastify route schema for a generator to read. only the request bodies come from zod.
const openapiDocument = {
  openapi: "3.1.0",
  info: {
    title: "book review service",
    version: "1.0.0",
    description:
      "Reviews are enriched asynchronously: POST /review answers 202, a worker fills in the " +
      "book data, GET /review/{id} answers 200 once it is done. Book ids come from /book/search.",
  },
  servers: [{ url: "/" }],
  paths: {
    "/book/search": {
      get: {
        summary: "search the gutendex catalogue",
        description: "Results are ordered by download count. Several editions can share a title.",
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            description: "at least two characters once trimmed",
            schema: { type: "string", minLength: 2 },
          },
        ],
        responses: {
          200: {
            description: "matching books, empty when nothing matches",
            ...json({ type: "array", items: ref("Book") }),
          },
          400: errors[400],
          500: errors[500],
        },
      },
    },
    "/review": {
      post: {
        summary: "submit a review",
        description: "The book id is checked on gutendex before the review is stored.",
        requestBody: {
          required: true,
          description:
            "id is a gutendex book id, up to 32 characters. review is 10 to 2000 characters " +
            "once trimmed. score is a whole number from 1 to 10.",
          ...json(z.toJSONSchema(createReviewSchema), {
            id: "2701",
            review: "long, dense, and worth finishing at least once",
            score: 8,
          }),
        },
        responses: {
          202: {
            description: "stored and queued, poll the url in the Location header",
            headers: { Location: { schema: { type: "string" } } },
            ...json(ref("Pending"), {
              id: "c6d7c11a-3ca6-4b3d-9942-a7ee8d0b721c",
              status: "pending",
            }),
          },
          400: errors[400],
          404: { description: "no book on gutendex with that id", ...json(ref("Error")) },
          500: errors[500],
          503: {
            description: "the queue is unreachable, nothing was stored, safe to retry",
            ...json(ref("Error")),
          },
        },
      },
    },
    "/review/{id}": {
      get: {
        summary: "read a review",
        parameters: [idParam],
        responses: {
          200: { description: "ready or failed", ...json(ref("Review"), readyExample) },
          202: { description: "still queued, no book data yet", ...json(ref("Pending")) },
          404: errors[404],
        },
      },
      put: {
        summary: "replace score and review text",
        description: "The book data is left untouched and not fetched again.",
        parameters: [idParam],
        requestBody: {
          required: true,
          description:
            "both fields are required and replace the stored ones. review is 10 to 2000 " +
            "characters once trimmed, score a whole number from 1 to 10.",
          ...json(z.toJSONSchema(updateReviewSchema), {
            review: "second read, it holds up better than expected",
            score: 9,
          }),
        },
        responses: {
          200: { description: "the updated review", ...json(ref("Review")) },
          ...errors,
        },
      },
      delete: {
        summary: "delete a review",
        description: "The stored book is kept, other reviews may point at it.",
        parameters: [idParam],
        responses: { 204: { description: "deleted, no body" }, 404: errors[404] },
      },
    },
    "/health": {
      get: {
        summary: "liveness probe used by the container healthcheck",
        description: "Does not check the database or the queue.",
        responses: {
          200: { description: "the process is running", ...json(ref("Health")) },
        },
      },
    },
  },
  components: {
    schemas: {
      Book: {
        type: "object",
        properties: {
          id: { type: "string", description: "gutendex id, goes in the body of POST /review" },
          title: { type: "string" },
          authors: { type: "array", items: { type: "string" } },
          coverUrl: { type: ["string", "null"] },
        },
      },
      Pending: {
        type: "object",
        properties: { id: { type: "string", format: "uuid" }, status: { const: "pending" } },
      },
      Review: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          status: {
            enum: ["pending", "ready", "failed"],
            description: "failed means the book could not be fetched",
          },
          bookId: { type: "string", description: "gutendex id" },
          score: { type: "integer", minimum: 1, maximum: 10 },
          review: { type: "string", description: "10 to 2000 characters once trimmed" },
          book: {
            type: ["object", "null"],
            description: "null until the review is ready",
            properties: {
              title: { type: "string" },
              authors: { type: "array", items: { type: "string" } },
              coverUrl: { type: ["string", "null"] },
              metadata: {
                type: "object",
                description: "languages, subjects and download count",
              },
            },
          },
          failureReason: { type: ["string", "null"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Health: {
        type: "object",
        properties: { status: { const: "ok" } },
      },
      Error: {
        type: "object",
        description: "details is only present on validation errors",
        properties: {
          error: { type: "string" },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: { path: { type: "string" }, message: { type: "string" } },
            },
          },
        },
      },
    },
  },
};

const docsPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>book review service</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>SwaggerUIBundle({ url: "/openapi.json", dom_id: "#swagger" });</script>
  </body>
</html>`;

const docsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/openapi.json", async () => openapiDocument);
  app.get("/docs", async (_request, reply) => reply.type("text/html").send(docsPage));
};

export { docsRoutes, openapiDocument };
