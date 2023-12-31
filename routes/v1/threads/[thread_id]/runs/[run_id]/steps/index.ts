import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  genListOptions,
  genListSelector,
  LIST,
  List,
  listParamsSchema,
  parseSearchParams,
} from "$/models/list.ts";
import { STEP, Step } from "$/models/step.ts";
import { genPrimaryIndexKey, genPrimaryKey } from "$/models/thread.ts";
import { renderJSON } from "$/routes/_middleware.ts";

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const kv = await Deno.openKv();

export const handler: Handlers<Step | null> = {
  async GET(req: Request, ctx: FreshContext) {
    const listParams = listParamsSchema.parse(parseSearchParams(req));
    const threadId = ctx.params.thread_id as string;
    const runId = ctx.params.run_id as string;

    const iter = await kv.list<Step>(
      genListSelector(
        runId,
        listParams,
        genPrimaryKey,
        genPrimaryIndexKey,
      ),
      genListOptions(listParams),
    );
    const steps = [];
    for await (const res of iter) {
      const value = res.value as Step;
      value.object = STEP;
      value.thread_id = threadId;
      value.run_id = runId;
      steps.push(value);
    }

    const list: List<Step> = {
      object: LIST,
      data: steps,
      first_id: steps.length > 0 ? steps[0].id : undefined,
      last_id: steps.length > 0 ? steps[steps.length - 1].id : undefined,
      has_more: false,
    };
    return renderJSON(list);
  },
};
