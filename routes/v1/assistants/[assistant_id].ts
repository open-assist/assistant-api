import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  type Assistant,
  ASSISTANT_OBJECT,
  assistantSchema,
  genPrimaryKey,
} from "$/models/assistant.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { deleteObject, getByPrimaryKey, updateObject } from "$/models/_db.ts";

async function getAssistant(ctx: FreshContext) {
  const organization = ctx.state.organization as string;
  const assistantId = ctx.params.assistant_id;
  return await getByPrimaryKey<Assistant>(
    genPrimaryKey(organization, assistantId),
  );
}

export const handler: Handlers<Assistant | null> = {
  async GET(_req, ctx: FreshContext) {
    const assistant = (await getAssistant(ctx)).value as Assistant;
    assistant.object = ASSISTANT_OBJECT;
    return renderJSON(assistant);
  },

  async PATCH(req: Request, ctx: FreshContext) {
    const oldAssistant = await getAssistant(ctx);

    const fields = assistantSchema.partial().parse(await req.json());
    const assistant = await updateObject<Assistant>(oldAssistant, fields);
    assistant.object = ASSISTANT_OBJECT;
    return renderJSON(assistant);
  },

  async DELETE(_req: Request, ctx: FreshContext) {
    const oldAssistant = await getAssistant(ctx);
    await deleteObject<Assistant>(oldAssistant);

    return renderJSON(undefined, 204);
  },
};
