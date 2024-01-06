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
  versionstamp: z.string(),
});

export type Meta = z.infer<typeof metaSchema>;

export const statusFieldsType = z.object({
  status: z.enum([
    "in_progress",
    "cancelled",
    "failed",
    "completed",
    "expired",
  ], {
    description: "The status of the run or step.",
  }),
  last_error: z.object({
    code: z.enum(["server_error", "rate_limit_exceeded"]),
    message: z.string(),
  }).optional(),
  expired_at: z.number().optional(),
  cancelled_at: z.number().optional(),
  failed_at: z.number().optional(),
  completed_at: z.number().optional(),
});

export type StatusFields = z.infer<typeof statusFieldsType>;
