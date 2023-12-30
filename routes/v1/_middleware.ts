import { FreshContext } from "$fresh/server.ts";
import { UnauthorizedError } from "$/models/errors.ts";
import { State } from "$/routes/_middleware.ts";
import { genOrgByTokenKey } from "$/models/token.ts";

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const kv = await Deno.openKv();

export async function handler(
  req: Request,
  ctx: FreshContext<State>,
) {
  const authorization = req.headers.get("Authorization");
  if (!authorization) {
    throw new UnauthorizedError("Missing authorization header.");
  }
  const [type, token] = authorization.split(" ");
  if (!type || !token || type.toLowerCase() !== "bearer") {
    throw new UnauthorizedError("Invalid authorization format.");
  }

  const result = await kv.get<string>(genOrgByTokenKey(token));
  if (!result.value) throw new UnauthorizedError("Invalid token.");
  ctx.state.organization = result.value;

  return ctx.next();

  // return ctx.next().then((response) => response).catch((error) => {
  //   console.error(error);
  //   if (error instanceof SyntaxError) {
  //     return render400("Invalid json format.");
  //   }
  //   if (error instanceof ApiError) {
  //     if (error.cause) {
  //       return renderJSON(error.cause, error.status);
  //     }
  //     return renderJSON({
  //       code: error.code,
  //       message: error.message,
  //     }, error.status);
  //   }
  //   return render400();
  // });
}
