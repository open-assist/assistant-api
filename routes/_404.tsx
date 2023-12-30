import { FreshContext } from "$fresh/server.ts";

export function handler(_req: Request, _ctx: FreshContext) {
  const problemDetail = {
    type: "about:blank",
    title: "Not Found",
    detail: "The url you were looking for doesn't exist.",
  };

  return new Response(JSON.stringify(problemDetail), {
    status: 404,
  });
}
