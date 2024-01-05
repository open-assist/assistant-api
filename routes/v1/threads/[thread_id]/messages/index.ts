import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  createMessage,
  genPrimaryIndexKey,
  genPrimaryKey,
  Message,
  MESSAGE_OBJECT,
  messageSchema,
} from "$/models/message.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { LIST, List, listParamsSchema } from "$/models/list.ts";
import { listObjects } from "$/models/_db.ts";

export const handler: Handlers<Message | null> = {
  async GET(_req: Request, ctx: FreshContext) {
    const listParams = listParamsSchema.parse(
      Object.fromEntries(ctx.url.searchParams),
    );
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
    const fields = messageSchema.parse(await req.json());
    const threadId = ctx.params.thread_id as string;

    const message = await createMessage({
      ...fields,
      thread_id: threadId,
      content: [
        {
          type: "text",
          text: {
            value: fields.content,
          },
        },
      ],
    });

    message.object = MESSAGE_OBJECT;
    return renderJSON(message, 201);
  },
};
