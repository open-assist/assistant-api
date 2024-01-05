import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  genPrimaryKey,
  type Run,
  RUN_OBJECT,
  runSchema,
} from "$/models/run.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { getByPrimaryKey, updateObject } from "$/models/_db.ts";

async function getRun(ctx: FreshContext) {
  const threadId = ctx.params.thread_id;
  const runId = ctx.params.run_id;

  return await getByPrimaryKey<Run>(genPrimaryKey(threadId, runId));
}

export const handler: Handlers<Run | null> = {
  async GET(_req, ctx: FreshContext) {
    const run = (await getRun(ctx)).value as Run;
    run.object = RUN_OBJECT;
    return renderJSON(run);
  },

  async PATCH(req: Request, ctx: FreshContext) {
    const oldRun = await getRun(ctx);

    const fields = runSchema.pick({ metadata: true }).parse(
      await req.json(),
    );
    const run = await updateObject<Run>(oldRun, fields);
    run.object = RUN_OBJECT;
    return renderJSON(run);
  },
};
