import { FreshContext, Handlers } from "$fresh/server.ts";
import { cancelRun, getRun, Run } from "$/models/run.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { UnprocessableContent } from "$/models/errors.ts";

export const handler: Handlers<Run | null> = {
  async POST(_req: Request, ctx: FreshContext) {
    const result = await getRun(ctx);
    const run = result.value as Run;
    if (
      run.status === "cancelling" || run.status === "cancelled" ||
      run.status === "completed" || run.status === "failed" ||
      run.status === "expired"
    ) {
      throw new UnprocessableContent(
        `The run was already ${run.status}.`,
      );
    }

    const newRun = await cancelRun(result);

    return renderJSON(newRun, 202, {
      "Location": `/threads/${run.thread_id}/runs/${run.id}`,
    });
  },
};
