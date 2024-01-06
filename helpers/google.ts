import { Message } from "$/models/message.ts";
import { load } from "$std/dotenv/mod.ts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { InternalServerError } from "$/models/errors.ts";

export class Google {
  public static async chat(
    modelName: string,
    messages: Message[],
    instructions?: string,
  ) {
    const env = await load();
    const genAi = new GoogleGenerativeAI(env["GOOGLE_API_KEY"]);
    const model = genAi.getGenerativeModel({
      model: modelName,
    });

    try {
      const { totalTokens } = await model.countTokens(
        messages.flatMap((m) => m.content.map((c) => c.text.value)),
      );
      console.log("[+] total tokens: ", totalTokens);

      const history = [];
      if (instructions) {
        history.push({
          role: "user",
          parts: [instructions],
        });
      }
      history.push(
        ...(messages.slice(0, -1).map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: m.content.map((c) => c.text.value),
        }))),
      );

      const chat = model.startChat({
        history,
      });
      const result = await chat.sendMessage(
        messages[messages.length - 1].content.map((c) => c.text.value),
      );
      return result.response.text();
    } catch (error) {
      const groups = (error as Error).message.match(
        /\[(\d{3}) ([\w\s]+)\] ([\w\s\.,]+)/gm,
      );
      if (groups && groups.length > 1) {
        const statusCode = new Number(groups[0]);
        if (statusCode === 500) {
          throw new InternalServerError(groups[2]);
        }
      }
    }
  }
}
