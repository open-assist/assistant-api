import { FreshContext } from "$fresh/server.ts";
import {
  DbCommitError,
  InternalServerError,
  NotFoundError,
  ProblemDetail,
  UnauthorizedError,
  ValidationError,
} from "$/models/errors.ts";

export interface State {
  organization: string;
}

export function renderJSON(data?: object | object[], status?: number) {
  let body;
  if (!data) {
    body = data;
  } else if (Array.isArray(data)) {
    body = JSON.stringify(data);
  } else {
    body = JSON.stringify(data, Object.keys(data).sort());
  }
  return new Response(body, {
    status: status || 200,
  });
}

export function handler(_req: Request, ctx: FreshContext) {
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
      case ValidationError:
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
    });
  }).then((resp) => {
    resp.headers.set("Content-Type", "application/json");
    return resp;
  });
}
