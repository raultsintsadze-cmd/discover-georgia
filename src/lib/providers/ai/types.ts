/**
 * Thin abstraction over a tool-calling LLM API. This is the ONLY module
 * allowed to import the OpenAI SDK. AIService (src/lib/services/ai.service.ts)
 * owns the tool-calling loop and the actual tool implementations
 * (search_places, calculate_route, ...); this provider just executes one
 * turn of "given messages + tool definitions, return text or tool calls."
 *
 * Server-only. The API key must never reach the client — see
 * docs/architecture.md §Security.
 */
export interface AIProvider {
  createResponse(request: AIRequest): Promise<AIResponse>;
}

export interface AIRequest {
  systemPrompt: string;
  messages: AIMessage[];
  tools: ToolDefinition[];
  /** Structured output schema for the final itinerary — see ai-architecture.md. */
  responseSchema?: Record<string, unknown>;
}

export interface AIMessage {
  role: "user" | "assistant" | "tool";
  content: string | null;
  /** "tool"-role messages only: which call this responds to. */
  toolCallId?: string;
  toolName?: string;
  /**
   * "assistant"-role messages only: the calls this turn requested. Must be
   * replayed back on the next createResponse call, immediately followed by
   * one "tool" message per call — providers that require strict
   * assistant/tool message pairing (e.g. OpenAI) need this to reconstruct
   * a valid conversation history.
   */
  toolCalls?: ToolCall[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema for the tool's input. */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export type AIResponse =
  | { type: "message"; content: string }
  | { type: "tool_calls"; calls: ToolCall[] };
