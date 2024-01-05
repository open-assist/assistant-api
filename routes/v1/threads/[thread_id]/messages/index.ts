import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  genPrimaryIndexKey,
  genPrimaryKey,
  Message,
  MESSAGE_OBJECT,
  MESSAGE_PREFIX,
  messageSchema,
} from "$/models/message.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import {
  LIST,
  List,
  listParamsSchema,
  parseSearchParams,
} from "$/models/list.ts";
import { createObject, listObjects } from "$/models/_db.ts";

export const handler: Handlers<Message | null> = {
  async GET(req: Request, ctx: FreshContext) {
    const listParams = listParamsSchema.parse(parseSearchParams(req));
    const threadId = ctx.params.thread_id as string;
    const messages = await listObjects<Message>(
      threadId,
      listParams,
      genPrimaryKey,
      genPrimaryIndexKey,
      {
        object: MESSAGE_OBJECT,
      },
    );

    const list: List<Message> = {
      object: LIST,
      data: messages,
      first_id: messages.length > 0 ? messages[0].id : undefined,
      last_id: messages.length > 0
        ? messages[messages.length - 1].id
        : undefined,
      has_more: false,
    };
    return renderJSON(list);
  },

  async POST(req: Request, ctx: FreshContext) {
    const messageJson = messageSchema.parse(await req.json());
    const threadId = ctx.params.thread_id as string;

    const message = {
      ...messageJson,
      id: `${MESSAGE_PREFIX}-${crypto.randomUUID()}`,
      created_at: Date.now(),
      thread_id: threadId,
      content: [
        {
          type: "text",
          text: {
            value: messageJson.content,
          },
        },
      ],
    } as Message;

    await createObject(
      genPrimaryKey(threadId, message.id),
      message,
    );

    message.object = MESSAGE_OBJECT;
    return renderJSON(message, 201);
  },
};
