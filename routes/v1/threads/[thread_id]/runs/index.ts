import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  createRun,
  genPrimaryIndexKey,
  genPrimaryKey,
  Run,
  RUN_OBJECT,
  runSchema,
} from "$/models/run.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { LIST, List, listParamsSchema } from "$/models/list.ts";
import { listObjects } from "$/models/_db.ts";

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

    const run = await createRun({
      ...runJson,
      instructions,
      thread_id: threadId,
    } as Run);

    run.object = RUN_OBJECT;
    return renderJSON(run, 201);
  },
};
