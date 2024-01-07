import { FreshContext } from "$fresh/server.ts";
import { Unauthorized } from "$/models/errors.ts";
import { State } from "$/routes/_middleware.ts";
import { genOrgByTokenKey } from "$/models/token.ts";
import { kv } from "$/models/_db.ts";

export async function handler(
  req: Request,
  ctx: FreshContext<State>,
) {
  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    throw new Unauthorized("Missing authorization header.");
  }
  const [type, token] = authorization.split(" ");
  if (!type || !token || type.toLowerCase() !== "bearer") {
    throw new Unauthorized("Invalid authorization format.");
  }

  const result = await kv.get<string>(genOrgByTokenKey(token));
  if (!result.value) throw new Unauthorized("Invalid token.");
  ctx.state.organization = result.value;

  return ctx.next();
}
