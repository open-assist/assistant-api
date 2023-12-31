import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  genPrimaryIndexKey,
  genPrimaryKey,
  MESSAGE,
  Message,
  MESSAGE_PREFIX,
  messageSchema,
} from "$/models/message.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { DbCommitError } from "$/models/errors.ts";
import {
  genListOptions,
  genListSelector,
  LIST,
  List,
  listParamsSchema,
  parseSearchParams,
} from "$/models/list.ts";

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const kv = await Deno.openKv();

export const handler: Handlers<Message | null> = {
  async GET(req: Request, ctx: FreshContext) {
    const listParams = listParamsSchema.parse(parseSearchParams(req));
    const threadId = ctx.params.thread_id as string;

    const iter = await kv.list<Message>(
      genListSelector(
        threadId,
        listParams,
        genPrimaryKey,
        genPrimaryIndexKey,
      ),
      genListOptions(listParams),
    );
    const messages = [];
    for await (const res of iter) {
      const value = res.value as Message;
      value.object = MESSAGE;
      messages.push(value);
    }

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
      content: [
        {
          type: "text",
          text: {
            value: messageJson.content,
          },
        },
      ],
    } as Message;
    message.id = `${MESSAGE_PREFIX}-${crypto.randomUUID()}`;
    message.created_at = Date.now();

    const key = genPrimaryKey(threadId, message.id);
    const { ok } = await kv.atomic().check({ key: key, versionstamp: null })
      .set(key, message)
      .commit();
    if (!ok) throw new DbCommitError();

    message.object = MESSAGE;
    return renderJSON(message, 201);
  },
};
