import { FreshContext } from "$fresh/server.ts";
import { BadRequest } from "$/models/errors.ts";
import { State } from "$/routes/_middleware.ts";

export function handler(
  req: Request,
  ctx: FreshContext<State>,
) {
  const organization = req.headers.get("X-Assist-Org-Id");
  if (!organization) {
    throw new BadRequest("Missing X-Assist-Org-Id header.");
  }
  ctx.state.organization = organization;

  return ctx.next();
}
