import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { createReviewSchema, updateReviewSchema } from "../reviews/reviews.schemas.ts";

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: object) => ({ content: { "application/json": { schema } } });
const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};

const responses = {
  400: { description: "validation failed", ...json(ref("Error")) },
  404: { description: "not found", ...json(ref("Error")) },
};

// hand written on purpose: the routes validate with zod inside the handler, so there is no
// fastify route schema for a generator to read. only the request bodies come from zod.
const openapiDocument = {
  openapi: "3.1.0",
  info: { title: "book review service", version: "1.0.0" },
  servers: [{ url: "/" }],
  paths: {
    "/book/search": {
      get: {
        summary: "search the gutendex catalogue",
        parameters: [
          { name: "q", in: "query", required: true, schema: { type: "string", minLength: 2 } },
        ],
        responses: {
          200: { description: "matching books", ...json({ type: "array", items: ref("Book") }) },
          400: responses[400],
        },
      },
    },
    "/review": {
      post: {
        summary: "submit a review, enriched asynchronously",
        requestBody: { required: true, ...json(z.toJSONSchema(createReviewSchema)) },
        responses: {
          202: {
            description: "accepted, enrichment queued",
            headers: { Location: { schema: { type: "string" } } },
            ...json(ref("Pending")),
          },
          400: responses[400],
          404: { description: "book not found on gutendex", ...json(ref("Error")) },
        },
      },
    },
    "/review/{id}": {
      get: {
        summary: "read a review",
        parameters: [idParam],
        responses: {
          200: { description: "enriched or failed review", ...json(ref("Review")) },
          202: { description: "still pending", ...json(ref("Pending")) },
          404: responses[404],
        },
      },
      put: {
        summary: "replace score and content, book data is left untouched",
        parameters: [idParam],
        requestBody: { required: true, ...json(z.toJSONSchema(updateReviewSchema)) },
        responses: { 200: { description: "updated", ...json(ref("Review")) }, ...responses },
      },
      delete: {
        summary: "delete a review",
        parameters: [idParam],
        responses: { 204: { description: "deleted" }, 404: responses[404] },
      },
    },
  },
  components: {
    schemas: {
      Book: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          authors: { type: "array", items: { type: "string" } },
          coverUrl: { type: ["string", "null"] },
        },
      },
      Pending: {
        type: "object",
        properties: { id: { type: "string" }, status: { const: "pending" } },
      },
      Review: {
        type: "object",
        properties: {
          id: { type: "string" },
          status: { enum: ["pending", "ready", "failed"] },
          bookId: { type: "string" },
          score: { type: "integer" },
          content: { type: "string" },
          book: {
            type: ["object", "null"],
            properties: {
              title: { type: "string" },
              authors: { type: "array", items: { type: "string" } },
              coverUrl: { type: ["string", "null"] },
              metadata: { type: "object" },
            },
          },
          failureReason: { type: ["string", "null"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" }, details: { type: "array" } },
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
