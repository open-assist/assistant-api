import {
  getBySecondaryKey,
  kv,
  updateObject,
  updateObjectByKey,
} from "$/models/_db.ts";
import { genSecondaryKey as genRunKey, Run } from "$/models/run.ts";
import {
  Assistant,
  genSecondaryKey as genAssistantKey,
} from "$/models/assistant.ts";
import {
  createMessage,
  getMessagesByThread,
  Message,
} from "$/models/message.ts";
import {
  createStep,
  getByRunId,
  Step,
  updateStepByPrimaryKey,
} from "$/models/step.ts";
import { Google } from "$/helpers/google.ts";
import { InternalServerError, TooManyRequests } from "$/models/errors.ts";
import { StatusFields } from "$/models/_schema.ts";

export interface RunJobMessage {
  action: "execute" | "cancel" | "expire";
  runId: string;
}

export function isRunJobMessage(message: unknown) {
  return (message as RunJobMessage).action !== undefined &&
    (message as RunJobMessage).runId !== undefined;
}

export class RunJob {
  public static async perform(message: RunJobMessage) {
    const { action, runId } = message;
    switch (action) {
      case "execute":
        await this.execute(runId);
        break;
      case "cancel":
        await this.cancel(runId);
        break;
      case "expire":
    }
  }

  /**
   * execute
   */
  private static async execute(runId: string) {
    // judge run status
    const oldRun = await getBySecondaryKey<Run>(runId, genRunKey);
    const run = oldRun.value as Run;
    if (run.status !== "queued") {
      return;
    }

    // run status: queued -> in_progress
    await updateObject<Run>(oldRun, {
      status: "in_progress",
      started_at: Date.now(),
    } as Run);

    // create step
    const step = await createStep({
      assistant_id: run.assistant_id,
      thread_id: run.thread_id,
      run_id: run.id,
      type: "message_creation",
      status: "in_progress",
    } as Step);

    try {
      // request llm
      const assistant =
        (await getBySecondaryKey<Assistant>(run.assistant_id, genAssistantKey))
          .value as Assistant;
      const messages: Message[] = await getMessagesByThread(run.thread_id);

      const reply = await Google.chat(
        run.model || assistant.model,
        messages,
        run.instructions || assistant.instructions,
      );

      // create message
      const message = await createMessage({
        thread_id: run.thread_id,
        assistant_id: run.assistant_id,
        run_id: run.id,
        role: "assistant",
        content: [
          {
            type: "text",
            text: {
              value: reply,
            },
          },
        ],
      } as Message);

      // updat step
      await updateStepByPrimaryKey(runId, step.id, {
        status: "completed",
        completed_at: Date.now(),
        step_details: {
          type: "message_creation",
          message_creation: {
            message_id: message.id,
          },
        },
      } as Step);

      // run status: in_progress -> completed
      await updateObjectByKey<Run>(oldRun.key, {
        status: "completed",
        completed_at: Date.now(),
      } as Run);
    } catch (error) {
      console.log("[-] run id:", runId, ",", error);

      const statusFields = {
        status: "failed",
        failed_at: Date.now(),
      } as StatusFields;
      if (error instanceof TooManyRequests) {
        statusFields.last_error = {
          code: "rate_limit_exceeded",
          message: error.message,
        };
      }
      if (error instanceof InternalServerError) {
        statusFields.last_error = {
          code: "server_error",
          message: error.message,
        };
      }

      // status: in_progress -> failed
      await updateStepByPrimaryKey(runId, step.id, statusFields);
      await updateObjectByKey<Run>(oldRun.key, statusFields);
      return;
    }
  }

  private static async cancel(runId: string) {
    const kvEntry = await getBySecondaryKey<Run>(runId, genRunKey);
    const run = kvEntry.value as Run;
    if (run.status === "cancelling") {
      const atomicOp = kv.atomic()
        .check(kvEntry)
        .set(
          kvEntry.key,
          { ...run, status: "cancelled", cancelled_at: Date.now() } as Run,
        );
      const stepEntrys = await getByRunId(run.id);
      if (
        stepEntrys.length === 1 && stepEntrys[0].value.status === "in_progress"
      ) {
        const stepEntry = stepEntrys[0];
        atomicOp.set(
          stepEntry.key,
          {
            ...stepEntry.value,
            status: "cancelled",
            cancelled_at: Date.now(),
          } as Step,
        );
      }
      const { ok } = await atomicOp.commit();
      if (!ok) {
        console.log("[-] cancel run(%s) failed.", runId);
      }
    }
  }
}
