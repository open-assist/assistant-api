import { z } from "$zod/mod.ts";

export const LIST = "list";

export interface List<T> {
  object: "list";
  data: T[];
  first_id?: string;
  last_id?: string;
  has_more: boolean;
}

export const listParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
  order: z.enum(["asc", "desc"]).default("desc").optional(),
  after: z.string().optional(),
  before: z.string().optional(),
});

export type ListParams = z.infer<typeof listParamsSchema>;

export const genListOptions = (params: ListParams) => (
  {
    limit: params.limit,
    reverse: params.order === "desc",
  }
);

export const genListSelector = (
  org: string,
  params: ListParams,
  genPrimaryKey: (org: string, id: string) => string[],
  genPrimaryIndexKey: (org: string) => string[],
) => {
  const { after, before } = params;
  const selector: { prefix?: string[]; start?: string[]; end?: string[] } = {};
  if (before) {
    selector["end"] = genPrimaryKey(org, before);
  }
  if (after) {
    selector["start"] = genPrimaryKey(org, after);
  }
  if (!before || !after) {
    selector["prefix"] = genPrimaryIndexKey(org);
  }
  return selector;
};
