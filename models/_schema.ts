import { z } from "$zod/mod.ts";

export const metadata = z.record(
  z.string().min(1).max(64),
  z.string().max(512).nullable(),
  {
    description:
      "Set of 16 key-value pairs that can be attached to an object. This can be useful for storing additional information about the object in a structured format.",
  },
).optional();

export const metaSchema = z.object({
  id: z.string({
    description: "The identifier, which can be referenced in API endpoints.",
  }),
  created_at: z.number(),
  updated_at: z.number(),
});
