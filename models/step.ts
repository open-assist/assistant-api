import { z } from "$zod/mod.ts";
import { metadata, metaSchema } from "$/models/_schema.ts";
import { errorType, RUN } from "$/models/run.ts";

export const STEP = "thread.run.step";
export const STEP_PREFIX = "step";

const messageCreationType = z.object({
  type: z.enum(["message_creation"]),
  message_creation: z.object({
    message_id: z.string(),
  }),
});

const stepType = z.object({
  object: z.enum([STEP]),
  assistant_id: z.string(),
  thread_id: z.string(),
  run_id: z.string(),
  type: z.enum(["message_creation"]),
  status: z.enum([
    "in_progress",
    "cancelled",
    "failed",
    "completed",
    "expired",
  ]),
  step_details: messageCreationType,
  last_error: errorType,
  expired_at: z.number().optional(),
  cancelled_at: z.number().optional(),
  failed_at: z.number().optional(),
  completed_at: z.number().optional(),
  metadata,
}).merge(metaSchema.omit({ updated_at: true }));

export type Step = z.infer<typeof stepType>;

export const genPrimaryKey = (
  runId: string,
  id: string,
) => [RUN, runId, STEP, id];

export const genPrimaryIndexKey = (
  runId: string,
) => [RUN, runId, STEP];
