import { FreshContext, Handlers } from "$fresh/server.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import {
  genOrgByTokenKey,
  genPrimaryIndexKey,
  genPrimaryKey,
  genSecondaryKey,
  maskToken,
  type Token,
  TOKEN_PREFIX,
  tokenSchema,
} from "$/models/token.ts";
import { DbCommitError, UnprocessableContent } from "$/models/errors.ts";

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const kv = await Deno.openKv();

export const handler: Handlers<Token | null> = {
  async GET(_req: Request, ctx: FreshContext) {
    const organization = ctx.state.organization as string;

    const iter = await kv.list<Token>({
      prefix: genPrimaryIndexKey(organization),
    });
    const tokens = [];
    for await (const res of iter) {
      const value = res.value as Token;
      value.content = maskToken(value.content);
      tokens.push(value);
    }
    return renderJSON(tokens);
  },

  async POST(req: Request, ctx: FreshContext) {
    const result = tokenSchema.safeParse(await req.json());
    if (!result.success) {
      throw new UnprocessableContent(undefined, undefined, result.error.issues);
    }

    const token = result.data as Token;
    const organization = ctx.state.organization as string;

    token.id = `${TOKEN_PREFIX}-${crypto.randomUUID()}`;
    token.content = `sk-${crypto.randomUUID()}`;
    token.created_at = Date.now();
    const secondaryKey = genSecondaryKey(organization, token.content);
    const primaryKey = genPrimaryKey(organization, token.id);
    const orgByKeyKey = genOrgByTokenKey(token.content);
    const { ok } = await kv.atomic()
      .check({ key: primaryKey, versionstamp: null })
      .check({ key: secondaryKey, versionstamp: null })
      .set(primaryKey, token).set(secondaryKey, token.id)
      .set(orgByKeyKey, organization)
      .commit();
    if (!ok) throw new DbCommitError();

    return renderJSON(token, 201);
  },
};
