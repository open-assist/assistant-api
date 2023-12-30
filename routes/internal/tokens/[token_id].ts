import { FreshContext, Handlers } from "$fresh/server.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import {
  DbCommitError,
  NotFoundError,
  ValidationError,
} from "$/models/errors.ts";
import {
  genOrgByTokenKey,
  genPrimaryKey,
  genSecondaryKey,
  maskToken,
  type Token,
  tokenSchema,
} from "$/models/token.ts";

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const kv = await Deno.openKv();

async function getToken(ctx: FreshContext) {
  const organization = ctx.state.organization as string;
  const tokenId = ctx.params.token_id;

  const key = genPrimaryKey(organization, tokenId);
  const result = await kv.get<Token>(key);
  if (!result.value) throw new NotFoundError();

  return result;
}

export const handler: Handlers<Token | null> = {
  async GET(_req: Request, ctx: FreshContext) {
    const token = (await getToken(ctx)).value as Token;
    token.content = maskToken(token.content);
    return renderJSON(token, 200);
  },

  async PATCH(req: Request, ctx: FreshContext) {
    const oldToken = await getToken(ctx);

    const result = tokenSchema.safeParse(await req.json());
    if (!result.success) {
      throw new ValidationError("", {}, result.error.issues);
    }

    const token = {
      ...oldToken.value,
      ...result.data,
    } as Token;

    token.updated_at = Date.now();
    const { ok } = await kv.atomic().check(oldToken).set(oldToken.key, token)
      .commit();
    if (!ok) throw new DbCommitError();

    token.content = maskToken(token.content);
    return renderJSON(token, 200);
  },

  async DELETE(_req: Request, ctx: FreshContext) {
    const oldToken = await getToken(ctx);
    const { key, value } = oldToken;
    const secondaryKey = genSecondaryKey(key[1], value.content);
    const orgByTokenKey = genOrgByTokenKey(value.content);

    const { ok } = await kv.atomic().check(oldToken).delete(key).delete(
      secondaryKey,
    ).delete(orgByTokenKey).commit();
    if (!ok) throw new DbCommitError();

    return renderJSON(undefined, 204);
  },
};
