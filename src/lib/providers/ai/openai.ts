import "server-only";
import https from "https";
import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import type { AIProvider, AIRequest, AIResponse, AIMessage } from "./types";

// Node's fetch/undici connection-pool keep-alive reuse triggers a
// "premature close" error against api.openai.com in some Node versions
// (observed on Node 24 in this environment) — forcing a fresh connection
// per request (no keep-alive) avoids the stale-connection reuse that
// causes it. Confirmed working: raw HTTPS to the same endpoint with the
// same key succeeds every time outside Node's fetch client.
const noKeepAliveAgent = new https.Agent({ keepAlive: false });

function toOpenAIMessages(systemPrompt: string, messages: AIMessage[]): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [{ role: "system", content: systemPrompt }];

  for (const m of messages) {
    if (m.role === "user") {
      result.push({ role: "user", content: m.content ?? "" });
    } else if (m.role === "assistant") {
      result.push({
        role: "assistant",
        content: m.content,
        ...(m.toolCalls?.length
          ? {
              tool_calls: m.toolCalls.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
              })),
            }
          : {}),
      });
    } else {
      result.push({ role: "tool", tool_call_id: m.toolCallId ?? "", content: m.content ?? "" });
    }
  }

  return result;
}

export class OpenAIProvider implements AIProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey, httpAgent: noKeepAliveAgent });
    this.model = model;
  }

  async createResponse(request: AIRequest): Promise<AIResponse> {
    const tools: ChatCompletionTool[] = request.tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }));

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: toOpenAIMessages(request.systemPrompt, request.messages),
      // An empty array (rather than omitting the field) makes some
      // OpenAI-compatible backends reject the request — omit entirely
      // for tool-less calls (e.g. the trip-score judgment call).
      ...(tools.length > 0 ? { tools, tool_choice: "auto" as const } : {}),
      ...(request.responseSchema
        ? {
            response_format: {
              type: "json_schema",
              json_schema: { name: "structured_output", schema: request.responseSchema, strict: true },
            },
          }
        : {}),
    });

    const message = completion.choices[0]?.message;
    if (!message) {
      throw new Error("OpenAI returned no choices");
    }

    if (message.tool_calls && message.tool_calls.length > 0) {
      return {
        type: "tool_calls",
        calls: message.tool_calls.map((tc) => {
          if (tc.type !== "function") {
            throw new Error(`Unsupported tool call type: ${tc.type}`);
          }
          let args: Record<string, unknown>;
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            throw new Error(`OpenAI returned malformed arguments for tool "${tc.function.name}"`);
          }
          return { id: tc.id, name: tc.function.name, arguments: args };
        }),
      };
    }

    return { type: "message", content: message.content ?? "" };
  }
}

export const openaiProvider = new OpenAIProvider(
  process.env.OPENAI_API_KEY ?? "",
  process.env.OPENAI_MODEL ?? "gpt-4.1"
);
