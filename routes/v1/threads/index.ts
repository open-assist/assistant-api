import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  genPrimaryIndexKey,
  genPrimaryKey,
  Thread,
  THREAD_OBJECT,
  THREAD_PREFIX,
  threadSchema,
} from "$/models/thread.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { LIST, List, listParamsSchema } from "$/models/list.ts";
import { createObject, listObjects } from "$/models/_db.ts";

export const handler: Handlers<Thread | null> = {
  async GET(_req: Request, ctx: FreshContext) {
    const listParams = listParamsSchema.parse(
      Object.fromEntries(ctx.url.searchParams),
    );
    const organization = ctx.state.organization as string;

    const threads = await listObjects<Thread>(
      organization,
      listParams,
      genPrimaryKey,
      genPrimaryIndexKey,
      {
        object: THREAD_OBJECT,
      },
    );

    const list: List<Thread> = {
      object: LIST,
      data: threads,
      first_id: threads.length > 0 ? threads[0].id : undefined,
      last_id: threads.length > 0 ? threads[threads.length - 1].id : undefined,
      has_more: false,
    };
    return renderJSON(list);
  },

  async POST(req: Request, ctx: FreshContext) {
    const thread = threadSchema.parse(await req.json()) as Thread;
    const organization = ctx.state.organization as string;

    thread.id = `${THREAD_PREFIX}-${crypto.randomUUID()}`;
    thread.created_at = Date.now();

    await createObject(
      genPrimaryKey(organization, thread.id),
      thread,
    );

    thread.object = THREAD_OBJECT;
    return renderJSON(thread, 201);
  },
};
