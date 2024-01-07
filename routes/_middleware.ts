import { FreshContext } from "$fresh/server.ts";
import {
  DbCommitError,
  InternalServerError,
  NotFoundError,
  ProblemDetail,
  UnauthorizedError,
  UnprocessableContent,
  ValidationError,
} from "$/models/errors.ts";
import { ZodError } from "$zod/mod.ts";

export interface State {
  organization: string;
}

export function renderJSON(
  data?: object | object[],
  status?: number,
  headers?: HeadersInit,
) {
  let body;
  if (!data) {
    body = data;
    // } else if (Array.isArray(data)) {
    //   body = JSON.stringify(data);
  } else {
    body = JSON.stringify(data);
    // body = JSON.stringify(data, Object.keys(data).sort());
  }
  return new Response(body, {
    status: status || 200,
    headers,
  });
}

export function handler(req: Request, ctx: FreshContext) {
  const headers: [string, string][] = [
    ["Content-Type", "application/json"],
    ["Access-Control-Allow-Origin", req.headers.get("Origin") || "*"],
    ["Access-Control-Allow-Credentials", "true"],
    ["Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS"],
  ];

  if (req.method == "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  return ctx.next().catch((error: Error) => {
    const problemDetail: ProblemDetail = {
      type: "about:blank",
      status: 500,
      title: error.message,
      detail: error.cause as string,
    };

    switch (error.constructor) {
      case UnauthorizedError:
        problemDetail.status = 401;
        break;
      case NotFoundError:
        problemDetail.status = 404;
        problemDetail.instance = (error as NotFoundError).instance;
        break;
      case ZodError:
        problemDetail.status = 422;
        problemDetail.title = "Unprocessable Content";
        problemDetail.errors = (error as ZodError).issues;
        break;
      case ValidationError:
      case UnprocessableContent:
        problemDetail.status = 422;
        problemDetail.errors = (error as ValidationError).errors;
        break;
      case DbCommitError:
      case InternalServerError:
        problemDetail.status = 500;
        break;
    }

    return new Response(JSON.stringify(problemDetail), {
      status: problemDetail.status,
      headers,
    });
  }).then((resp) => {
    for (const header of headers) {
      resp.headers.set(header[0], header[1]);
    }
    return resp;
  });
}
