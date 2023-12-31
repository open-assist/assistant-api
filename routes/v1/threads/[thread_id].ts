import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  genPrimaryKey,
  THREAD,
  type Thread,
  threadSchema,
} from "$/models/thread.ts";
import { DbCommitError, NotFoundError } from "$/models/errors.ts";
import { renderJSON } from "$/routes/_middleware.ts";

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const kv = await Deno.openKv();

async function getThread(ctx: FreshContext) {
  const organization = ctx.state.organization as string;
  const threadId = ctx.params.thread_id;

  const key = genPrimaryKey(organization, threadId);
  const result = await kv.get<Thread>(key);
  if (!result.value) throw new NotFoundError();

  return result;
}

export const handler: Handlers<Thread | null> = {
  async GET(_req, ctx: FreshContext) {
    const thread = (await getThread(ctx)).value as Thread;
    thread.object = THREAD;
    return renderJSON(thread);
  },

  async PATCH(req: Request, ctx: FreshContext) {
    const oldThread = await getThread(ctx);

    const result = threadSchema.parse(await req.json());

    const thread = {
      ...oldThread.value,
      ...result,
    } as Thread;

    thread.updated_at = Date.now();
    const { ok } = await kv.atomic().check(oldThread)
      .set(oldThread.key, thread).commit();
    if (!ok) throw new DbCommitError();

    thread.object = THREAD;
    return renderJSON(thread);
  },

  async DELETE(_req: Request, ctx: FreshContext) {
    const oldThread = await getThread(ctx);

    const { ok } = await kv.atomic().check(oldThread)
      .delete(oldThread.key).commit();
    if (!ok) throw new DbCommitError();

    return renderJSON(undefined, 204);
  },
};
