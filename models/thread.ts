import { z } from "$zod/mod.ts";
import { metadata, metaSchema } from "$/models/_schema.ts";
import { ORGANIZATION } from "$/models/organization.ts";

export const THREAD = "thread";
export const THREAD_PREFIX = "thrd";
export const THREAD_OBJECT = "thread";

/**
 * The request body, which createing a thread.
 */
export const threadSchema = z.object({
  metadata,
});

export const threadType = threadSchema.merge(
  z.object({
    object: z.enum([THREAD]),
  }),
).merge(metaSchema);

/**
 * Represents a thread that contains messages.
 */
export type Thread = z.infer<typeof threadType>;

export const genPrimaryKey = (
  orgId: string,
  id: string,
) => [ORGANIZATION, orgId, THREAD, id];

export const genPrimaryIndexKey = (
  orgId: string,
) => [ORGANIZATION, orgId, THREAD];
