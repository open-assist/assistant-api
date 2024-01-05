import { FreshContext, Handlers } from "$fresh/server.ts";
import { renderJSON } from "$/routes/_middleware.ts";
import {
  type Assistant,
  ASSISTANT_OBJECT,
  ASSISTANT_PREFIX,
  assistantSchema,
  genPrimaryIndexKey,
  genPrimaryKey,
} from "$/models/assistant.ts";
import {
  LIST,
  List,
  listParamsSchema,
  parseSearchParams,
} from "$/models/list.ts";
import { createObject, listObjects } from "$/models/_db.ts";

export const handler: Handlers<Assistant | null> = {
  async GET(req: Request, ctx: FreshContext) {
    const listParams = listParamsSchema.parse(parseSearchParams(req));
    const organization = ctx.state.organization as string;

    const runs = await listObjects<Assistant>(
      organization,
      listParams,
      genPrimaryKey,
      genPrimaryIndexKey,
      {
        object: ASSISTANT_OBJECT,
      },
    );

    const list: List<Assistant> = {
      object: LIST,
      data: runs,
      first_id: runs.length > 0 ? runs[0].id : undefined,
      last_id: runs.length > 0 ? runs[runs.length - 1].id : undefined,
      has_more: false,
    };
    return renderJSON(list);
  },

  async POST(req, ctx) {
    const assistant = assistantSchema.parse(await req.json()) as Assistant;
    const organization = ctx.state.organization as string;

    assistant.id = `${ASSISTANT_PREFIX}-${crypto.randomUUID()}`;
    assistant.created_at = Date.now();

    await createObject(
      genPrimaryKey(organization, assistant.id),
      assistant,
    );

    assistant.object = ASSISTANT_OBJECT;
    return renderJSON(assistant, 201);
  },
};
