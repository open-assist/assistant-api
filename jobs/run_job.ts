import {
  getBySecondaryKey,
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
import { createStep, Step, updateStepByPrimaryKey } from "$/models/step.ts";
import { Google } from "$/helpers/google.ts";

export interface RunJobMessage {
  runId: string;
}

export class RunJob {
  public static async perform(runId: string) {
    try {
      // judge run status
      const oldRun = await getBySecondaryKey<Run>(runId, genRunKey);
      const run = oldRun.value as Run;

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

      // request llm
      const assistant =
        (await getBySecondaryKey<Assistant>(run.assistant_id, genAssistantKey))
          .value as Assistant;
      const messages: Message[] = await getMessagesByThread(run.thread_id);
      console.log("[+] messages:", messages);

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
        step_details: {
          type: "message_creation",
          message_creation: {
            message_id: message.id,
          },
        },
        status: "completed",
        completed_at: Date.now(),
      } as Step);

      // run status: in_progress -> completed
      await updateObjectByKey<Run>(oldRun.key, {
        status: "completed",
        completed_at: Date.now(),
      } as Run);
    } catch (error) {
      console.log("[*] run id: ", runId, ", error: ", error);
      return;
    }
  }
}
