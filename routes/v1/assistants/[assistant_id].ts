import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  ASSISTANT,
  type Assistant,
  assistantSchema,
  genPrimaryKey,
} from "$/models/assistant.ts";
import { DbCommitError, NotFoundError } from "$/models/errors.ts";
import { renderJSON } from "$/routes/_middleware.ts";

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const kv = await Deno.openKv();

async function getAssistant(ctx: FreshContext) {
  const organization = ctx.state.organization as string;
  const assistantId = ctx.params.assistant_id;

  const key = genPrimaryKey(organization, assistantId);
  const result = await kv.get<Assistant>(key);
  if (!result.value) throw new NotFoundError();

  return result;
}

export const handler: Handlers<Assistant | null> = {
  async GET(_req, ctx: FreshContext) {
    const assistant = (await getAssistant(ctx)).value as Assistant;
    assistant.object = ASSISTANT;
    return renderJSON(assistant);
  },

  async PATCH(req: Request, ctx: FreshContext) {
    const oldAssistant = await getAssistant(ctx);

    const result = assistantSchema.partial().parse(await req.json());

    const assistant = {
      ...oldAssistant.value,
      ...result,
    } as Assistant;

    assistant.updated_at = Date.now();
    const { ok } = await kv.atomic().check(oldAssistant)
      .set(oldAssistant.key, assistant).commit();
    if (!ok) throw new DbCommitError();

    assistant.object = ASSISTANT;
    return renderJSON(assistant);
  },

  async DELETE(_req: Request, ctx: FreshContext) {
    const oldAssistant = await getAssistant(ctx);

    const { ok } = await kv.atomic().check(oldAssistant)
      .delete(oldAssistant.key).commit();
    if (!ok) throw new DbCommitError();

    return renderJSON(undefined, 204);
  },
};
