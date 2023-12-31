import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  genPrimaryIndexKey,
  genPrimaryKey,
  RUN,
  Run,
  RUN_PREFIX,
  runSchema,
} from "$/models/run.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import { DbCommitError } from "$/models/errors.ts";
import {
  genListOptions,
  genListSelector,
  LIST,
  List,
  listParamsSchema,
  parseSearchParams,
} from "$/models/list.ts";

// deno-lint-ignore ban-ts-comment
// @ts-ignore
const kv = await Deno.openKv();

export const handler: Handlers<Run | null> = {
  async GET(req: Request, ctx: FreshContext) {
    const listParams = listParamsSchema.parse(parseSearchParams(req));
    const threadId = ctx.params.thread_id as string;

    const iter = await kv.list<Run>(
      genListSelector(
        threadId,
        listParams,
        genPrimaryKey,
        genPrimaryIndexKey,
      ),
      genListOptions(listParams),
    );
    const runs = [];
    for await (const res of iter) {
      const value = res.value as Run;
      value.object = RUN;
      value.thread_id = threadId;
      runs.push(value);
    }

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
    let instructions;
    if (runJson.instructions && runJson.additional_instructions) {
      instructions =
        `${runJson.instructions}${runJson.additional_instructions}`;
    } else if (runJson.instructions) {
      instructions = runJson.instructions;
    } else if (runJson.additional_instructions) {
      instructions = runJson.additional_instructions;
    }

    const run = {
      ...runJson,
      instructions,
    } as Run;
    run.id = `${RUN_PREFIX}-${crypto.randomUUID()}`;
    run.created_at = Date.now();

    const key = genPrimaryKey(threadId, run.id);
    const { ok } = await kv.atomic().check({ key: key, versionstamp: null })
      .set(key, run)
      .commit();
    if (!ok) throw new DbCommitError();

    run.object = RUN;
    run.thread_id = threadId;
    return renderJSON(run, 201);
  },
};
