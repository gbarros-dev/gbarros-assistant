import { createGateway } from "@ai-sdk/gateway";
import { env } from "@gbarros-assistant/env/agent";
import { generateText, stepCountIs } from "ai";

import { tools } from "./tools";
import { getWebSearchTool } from "./tools/web-search";

const gateway = createGateway({
  apiKey: env.AI_GATEWAY_API_KEY,
});

const SYSTEM_PROMPT = `You are a helpful personal AI assistant for Guilherme (gbarros). You can assist with questions, tasks, and general conversation. Be concise but friendly. When you don't know something, say so. Use tools when appropriate.`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function generateResponse(
  conversationMessages: Message[],
): Promise<{ content: string; toolCalls?: unknown[] }> {
  const result = await generateText({
    model: gateway(env.AI_MODEL),
    system: SYSTEM_PROMPT,
    messages: conversationMessages,
    tools: {
      ...tools,
      ...getWebSearchTool(env.AI_MODEL),
    },
    stopWhen: stepCountIs(10),
  });

  const toolCalls = result.steps
    .flatMap((step) => step.toolCalls)
    .map((tc) => ({ name: tc.toolName, input: tc.input }));

  return {
    content: result.text,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}
