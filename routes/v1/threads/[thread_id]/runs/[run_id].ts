import { FreshContext, Handlers } from "$fresh/server.ts";
import { genPrimaryKey, RUN, type Run, runSchema } from "$/models/run.ts";
import { DbCommitError, NotFoundError } from "$/models/errors.ts";
import { renderJSON } from "$/routes/_middleware.ts";

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const kv = await Deno.openKv();

async function getRun(ctx: FreshContext) {
  const threadId = ctx.params.thread_id;
  const runId = ctx.params.run_id;

  const key = genPrimaryKey(threadId, runId);
  const result = await kv.get<Run>(key);
  if (!result.value) throw new NotFoundError();

  return result;
}

export const handler: Handlers<Run | null> = {
  async GET(_req, ctx: FreshContext) {
    const run = (await getRun(ctx)).value as Run;
    run.object = RUN;
    run.thread_id = ctx.params.thread_id;
    return renderJSON(run);
  },

  async PATCH(req: Request, ctx: FreshContext) {
    const oldRun = await getRun(ctx);

    const result = runSchema.pick({ metadata: true }).parse(
      await req.json(),
    );

    const run = {
      ...oldRun.value,
      ...result,
    } as Run;

    const { ok } = await kv.atomic().check(oldRun)
      .set(oldRun.key, run).commit();
    if (!ok) throw new DbCommitError();

    run.object = RUN;
    run.thread_id = ctx.params.thread_id;
    return renderJSON(run);
  },
};
