import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  genPrimaryKey,
  THREAD,
  type Thread,
  THREAD_OBJECT,
  threadSchema,
} from "$/models/thread.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { deleteObject, getByPrimaryKey, updateObject } from "$/models/_db.ts";

async function getThread(ctx: FreshContext) {
  const organization = ctx.state.organization as string;
  const threadId = ctx.params.thread_id;

  return await getByPrimaryKey<Thread>(genPrimaryKey(organization, threadId));
}

export const handler: Handlers<Thread | null> = {
  async GET(_req, ctx: FreshContext) {
    const thread = (await getThread(ctx)).value as Thread;
    thread.object = THREAD_OBJECT;
    return renderJSON(thread);
  },

  async PATCH(req: Request, ctx: FreshContext) {
    const oldThread = await getThread(ctx);

    const fields = threadSchema.parse(await req.json());
    const thread = await updateObject<Thread>(oldThread, fields);
    thread.object = THREAD;
    return renderJSON(thread);
  },

  async DELETE(_req: Request, ctx: FreshContext) {
    const oldThread = await getThread(ctx);
    await deleteObject(oldThread);

    return renderJSON(undefined, 204);
  },
};
