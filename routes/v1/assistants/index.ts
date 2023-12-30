import { FreshContext, Handlers } from "$fresh/server.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import {
  ASSISTANT,
  type Assistant,
  ASSISTANT_PREFIX,
  assistantSchema,
  genPrimaryIndexKey,
  genPrimaryKey,
} from "$/models/assistant.ts";
import { DbCommitError, ValidationError } from "$/models/errors.ts";

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const kv = await Deno.openKv();

export const handler: Handlers<Assistant | null> = {
  async GET(_req: Request, ctx: FreshContext) {
    const organization = ctx.state.organization as string;

    const iter = await kv.list<Assistant>({
      prefix: genPrimaryIndexKey(organization),
    });
    const assistants = [];
    for await (const res of iter) {
      const value = res.value as Assistant;
      value.object = ASSISTANT;
      assistants.push(value);
    }
    return renderJSON(assistants);
  },

  async POST(req, ctx) {
    const result = assistantSchema.safeParse(await req.json());
    if (!result.success) {
      throw new ValidationError(undefined, undefined, result.error.issues);
    }

    const organization = ctx.state.organization as string;
    const assistant = (result.data) as Assistant;

    assistant.id = `${ASSISTANT_PREFIX}-${crypto.randomUUID()}`;
    assistant.created_at = Date.now();

    const key = genPrimaryKey(organization, assistant.id);
    const { ok } = await kv.atomic().check({ key: key, versionstamp: null })
      .set(key, assistant)
      .commit();
    if (!ok) throw new DbCommitError();

    assistant.object = ASSISTANT;
    return renderJSON(assistant, 201);
  },
};
