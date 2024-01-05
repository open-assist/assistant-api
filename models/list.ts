import { z } from "$zod/mod.ts";

export const LIST = "list";

export interface List<T> {
  object: "list";
  data: T[];
  first_id?: string;
  last_id?: string;
  has_more: boolean;
}

export interface ListSelector {
  prefix?: string[];
  start?: string[];
  end?: string[];
}

export interface ListOptions {
  limit?: number;
  reverse?: boolean;
}

export const listParamsSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20), //.optional(),
  order: z.enum(["asc", "desc"]).default("desc"), //.optional(),
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
  parentId: string,
  params: ListParams,
  genPrimaryKey: (parentId: string, id: string) => string[],
  genPrimaryIndexKey: (parentId: string) => string[],
) => {
  const { after, before } = params;
  return {
    prefix: !(before && after) && genPrimaryIndexKey(parentId),
    start: after && genPrimaryKey(parentId, after),
    end: before && genPrimaryKey(parentId, before),
  } as Deno.KvListSelector;
};

/**
 * Parse the search parameters for request's url.
 *
 * @param req The http request.
 * @returns object Search parameters.
 */
export const parseSearchParams = (req: Request) =>
  Object.fromEntries((new URL(req.url)).searchParams);
