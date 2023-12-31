import { FreshContext, Handlers } from "$fresh/server.ts";
import { genPrimaryKey, STEP, type Step } from "$/models/step.ts";
import { NotFoundError } from "$/models/errors.ts";
import { renderJSON } from "$/routes/_middleware.ts";

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const kv = await Deno.openKv();

async function getStep(ctx: FreshContext) {
  const runId = ctx.params.run_id;
  const stepId = ctx.params.step_id;

  const key = genPrimaryKey(runId, stepId);
  const result = await kv.get<Step>(key);
  if (!result.value) throw new NotFoundError();

  return result;
}

export const handler: Handlers<Step | null> = {
  async GET(_req, ctx: FreshContext) {
    const step = (await getStep(ctx)).value as Step;
    step.object = STEP;
    step.thread_id = ctx.params.thread_id;
    step.run_id = ctx.params.run_id;
    return renderJSON(step);
  },
};
