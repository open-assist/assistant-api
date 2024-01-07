import { FreshContext, Handlers } from "$fresh/server.ts";
import { renderJSON } from "$/routes/_middleware.ts";

import { LIST, List } from "$/models/list.ts";
import { Model } from "$/models/model.ts";

export const handler: Handlers<Model | null> = {
  GET(_req: Request, _ctx: FreshContext) {
    const models: Model[] = [
      {
        id: "gemini-pro",
        object: "model",
        owned_by: "google",
      },
      {
        id: "gemini-pro-vision",
        object: "model",
        owned_by: "google",
      },
    ];

    const list: List<Model> = {
      object: LIST,
      data: models,
    };
    return renderJSON(list);
  },
};
