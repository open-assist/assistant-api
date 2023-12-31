import { FreshContext, Handlers } from "$fresh/server.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import {
  ASSISTANT,
  type Assistant,
  ASSISTANT_PREFIX,
  assistantSchema,
  genPrimaryIndexKey,
  genPrimaryKey,
} from "$/models/assistant.ts";
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

export const handler: Handlers<Assistant | null> = {
  async GET(req: Request, ctx: FreshContext) {
    const listParams = listParamsSchema.parse(parseSearchParams(req));
    const organization = ctx.state.organization as string;

    const iter = await kv.list<Assistant>(
      genListSelector(
        organization,
        listParams,
        genPrimaryKey,
        genPrimaryIndexKey,
      ),
      genListOptions(listParams),
    );
    const assistants = [];
    for await (const res of iter) {
      const value = res.value as Assistant;
      value.object = ASSISTANT;
      assistants.push(value);
    }

    const list: List<Assistant> = {
      object: LIST,
      data: assistants,
      first_id: assistants.length > 0 ? assistants[0].id : undefined,
      last_id: assistants.length > 0
        ? assistants[assistants.length - 1].id
        : undefined,
      has_more: false,
    };
    return renderJSON(list);
  },

  async POST(req, ctx) {
    const assistant = assistantSchema.parse(await req.json()) as Assistant;
    const organization = ctx.state.organization as string;

    assistant.id = `${ASSISTANT_PREFIX}-${crypto.randomUUID()}`;
    assistant.created_at = Date.now();

    const key = genPrimaryKey(organization, assistant.id);
    const { ok } = await kv.atomic().check({ key: key, versionstamp: null })
      .set(key, assistant)
      .commit();
    if (!ok) throw new DbCommitError();

    assistant.object = ASSISTANT;
    return renderJSON(assistant, 201);
  },
};
