import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  genPrimaryIndexKey,
  genPrimaryKey,
  THREAD,
  Thread,
  THREAD_PREFIX,
  threadSchema,
} from "$/models/thread.ts";
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

export const handler: Handlers<Thread | null> = {
  async GET(req: Request, ctx: FreshContext) {
    const listParams = listParamsSchema.parse(parseSearchParams(req));
    const organization = ctx.state.organization as string;

    const iter = await kv.list<Thread>(
      genListSelector(
        organization,
        listParams,
        genPrimaryKey,
        genPrimaryIndexKey,
      ),
      genListOptions(listParams),
    );
    const threads = [];
    for await (const res of iter) {
      const value = res.value as Thread;
      value.object = THREAD;
      threads.push(value);
    }

    const list: List<Thread> = {
      object: LIST,
      data: threads,
      first_id: threads.length > 0 ? threads[0].id : undefined,
      last_id: threads.length > 0 ? threads[threads.length - 1].id : undefined,
      has_more: false,
    };
    return renderJSON(list);
  },

  async POST(req: Request, ctx: FreshContext) {
    const thread = threadSchema.parse(await req.json()) as Thread;
    const organization = ctx.state.organization as string;

    thread.id = `${THREAD_PREFIX}-${crypto.randomUUID()}`;
    thread.created_at = Date.now();

    const key = genPrimaryKey(organization, thread.id);
    const { ok } = await kv.atomic().check({ key: key, versionstamp: null })
      .set(key, thread)
      .commit();
    if (!ok) throw new DbCommitError();

    thread.object = THREAD;
    return renderJSON(thread, 201);
  },
};
