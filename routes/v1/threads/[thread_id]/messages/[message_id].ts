import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  genPrimaryKey,
  type Message,
  MESSAGE_OBJECT,
  messageSchema,
} from "$/models/message.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { getByPrimaryKey, updateObject } from "$/models/_db.ts";

async function getMessage(ctx: FreshContext) {
  const threadId = ctx.params.thread_id;
  const messageId = ctx.params.message_id;

  return await getByPrimaryKey<Message>(genPrimaryKey(threadId, messageId));
}

export const handler: Handlers<Message | null> = {
  async GET(_req, ctx: FreshContext) {
    const message = (await getMessage(ctx)).value as Message;
    message.object = MESSAGE_OBJECT;
    return renderJSON(message);
  },

  async PATCH(req: Request, ctx: FreshContext) {
    const oldMessage = await getMessage(ctx);

    const fields = messageSchema.pick({ metadata: true }).parse(
      await req.json(),
    );
    const message = await updateObject<Message>(oldMessage, fields);
    message.object = MESSAGE_OBJECT;
    return renderJSON(message);
  },
};
