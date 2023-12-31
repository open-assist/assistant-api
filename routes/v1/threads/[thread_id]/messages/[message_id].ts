import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  genPrimaryKey,
  MESSAGE,
  type Message,
  messageSchema,
} from "$/models/message.ts";
import { DbCommitError, NotFoundError } from "$/models/errors.ts";
import { renderJSON } from "$/routes/_middleware.ts";

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const kv = await Deno.openKv();

async function getMessage(ctx: FreshContext) {
  const threadId = ctx.params.thread_id;
  const messageId = ctx.params.message_id;

  const key = genPrimaryKey(threadId, messageId);
  const result = await kv.get<Message>(key);
  if (!result.value) throw new NotFoundError();

  return result;
}

export const handler: Handlers<Message | null> = {
  async GET(_req, ctx: FreshContext) {
    const message = (await getMessage(ctx)).value as Message;
    message.object = MESSAGE;
    return renderJSON(message);
  },

  async PATCH(req: Request, ctx: FreshContext) {
    const oldMessage = await getMessage(ctx);

    const result = messageSchema.pick({ metadata: true }).parse(
      await req.json(),
    );

    const message = {
      ...oldMessage.value,
      ...result,
    } as Message;

    message.updated_at = Date.now();
    const { ok } = await kv.atomic().check(oldMessage)
      .set(oldMessage.key, message).commit();
    if (!ok) throw new DbCommitError();

    message.object = MESSAGE;
    return renderJSON(message);
  },
};
