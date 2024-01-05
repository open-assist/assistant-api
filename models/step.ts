import { z } from "$zod/mod.ts";
import { metadata, metaSchema } from "$/models/_schema.ts";
import { errorType, RUN } from "$/models/run.ts";
import { kv } from "$/models/_db.ts";
import { DbCommitError, NotFoundError } from "$/models/errors.ts";

export const STEP = "step";
export const STEP_OBJECT = "thread.run.step";
export const STEP_PREFIX = "step";

const messageCreationType = z.object({
  type: z.enum(["message_creation"]),
  message_creation: z.object({
    message_id: z.string(),
  }),
});

const stepType = z.object({
  object: z.enum([STEP_OBJECT]),
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

export const genSecondaryKey = (
  id: string,
) => [STEP, id];

export const genPrimaryIndexKey = (
  runId: string,
) => [RUN, runId, STEP];

export const createStep = async (step: Step) => {
  const newStep = {
    ...step,
    id: `${STEP_PREFIX}-${crypto.randomUUID()}`,
    created_at: Date.now(),
  } as Step;
  const key = genPrimaryKey(newStep.run_id, newStep.id);
  const secondaryKey = genSecondaryKey(newStep.id);
  const { ok } = await kv.atomic().check({ key: key, versionstamp: null })
    .check({ key: secondaryKey, versionstamp: null })
    .set(key, newStep)
    .set(secondaryKey, key)
    .commit();
  if (!ok) throw new DbCommitError();

  return newStep;
};

export const getByPrimaryKey = async (runId: string, stepId: string) => {
  const key = genPrimaryKey(runId, stepId);
  const result = await kv.get<Step>(key);
  if (!result.value) throw new NotFoundError();

  return result;
};

export const updateStepByPrimaryKey = async (
  runId: string,
  stepId: string,
  fields: Partial<Step>,
) => {
  const oldStep = await getByPrimaryKey(runId, stepId);

  const step = {
    ...oldStep.value,
    ...fields,
  } as Step;

  const { ok } = await kv.atomic().check(oldStep)
    .set(oldStep.key, step).commit();
  if (!ok) throw new DbCommitError();

  return step;
};
