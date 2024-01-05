import { FreshContext, Handlers } from "$fresh/server.ts";
import { LIST, List, listParamsSchema } from "$/models/list.ts";
import { Step, STEP_OBJECT } from "$/models/step.ts";
import { genPrimaryIndexKey, genPrimaryKey } from "$/models/step.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { listObjects } from "$/models/_db.ts";

export const handler: Handlers<Step | null> = {
  async GET(_req: Request, ctx: FreshContext) {
    const listParams = listParamsSchema.parse(
      Object.fromEntries(ctx.url.searchParams),
    );
    const runId = ctx.params.run_id as string;

    const step = await listObjects<Step>(
      runId,
      listParams,
      genPrimaryKey,
      genPrimaryIndexKey,
      {
        object: STEP_OBJECT,
      },
    );

    const list: List<Step> = {
      object: LIST,
      data: step,
      first_id: step.length > 0 ? step[0].id : undefined,
      last_id: step.length > 0 ? step[step.length - 1].id : undefined,
      has_more: false,
    };
    return renderJSON(list);
  },
};
