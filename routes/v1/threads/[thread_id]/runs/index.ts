import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  genPrimaryIndexKey,
  genPrimaryKey,
  genSecondaryKey,
  Run,
  RUN_OBJECT,
  RUN_PREFIX,
  runSchema,
} from "$/models/run.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { LIST, List, listParamsSchema } from "$/models/list.ts";
import { createObject, kv, listObjects } from "$/models/_db.ts";

export const handler: Handlers<Run | null> = {
  async GET(_req: Request, ctx: FreshContext) {
    const listParams = listParamsSchema.parse(
      Object.fromEntries(ctx.url.searchParams),
    );
    const threadId = ctx.params.thread_id as string;

    const runs = await listObjects<Run>(
      threadId,
      listParams,
      genPrimaryKey,
      genPrimaryIndexKey,
      {
        object: RUN_OBJECT,
      },
    );

    const list: List<Run> = {
      object: LIST,
      data: runs,
      first_id: runs.length > 0 ? runs[0].id : undefined,
      last_id: runs.length > 0 ? runs[runs.length - 1].id : undefined,
      has_more: false,
    };
    return renderJSON(list);
  },

  async POST(req: Request, ctx: FreshContext) {
    const runJson = runSchema.parse(await req.json());
    const threadId = ctx.params.thread_id as string;
    let instructions = runJson.instructions;
    if (runJson.instructions && runJson.additional_instructions) {
      instructions =
        `${runJson.instructions}${runJson.additional_instructions}`;
    }

    const run = {
      ...runJson,
      id: `${RUN_PREFIX}-${crypto.randomUUID()}`,
      created_at: Date.now(),
      instructions,
      thread_id: threadId,
      status: "queued",
    } as Run;

    await createObject(
      genPrimaryKey(threadId, run.id),
      run,
      genSecondaryKey(run.id),
    );

    await kv.enqueue({
      runId: run.id,
    });

    run.object = RUN_OBJECT;
    return renderJSON(run, 201);
  },
};
