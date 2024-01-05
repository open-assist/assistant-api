import { FreshContext, Handlers } from "$fresh/server.ts";
import { genPrimaryKey, type Step, STEP_OBJECT } from "$/models/step.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { getByPrimaryKey } from "$/models/_db.ts";

async function getStep(ctx: FreshContext) {
  const runId = ctx.params.run_id;
  const stepId = ctx.params.step_id;
  return await getByPrimaryKey<Step>(genPrimaryKey(runId, stepId));
}

export const handler: Handlers<Step | null> = {
  async GET(_req, ctx: FreshContext) {
    const step = (await getStep(ctx)).value as Step;
    step.object = STEP_OBJECT;
    return renderJSON(step);
  },
};
