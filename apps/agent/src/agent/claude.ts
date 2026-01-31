import Anthropic from "@anthropic-ai/sdk";
import { getToolDefinitions, executeTool } from "./tools/index";

const SYSTEM_PROMPT = `You are a helpful personal AI assistant for Guilherme (gbarros). You can assist with questions, tasks, and general conversation. Be concise but friendly. When you don't know something, say so. Use tools when appropriate.`;

let anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic();
  }
  return anthropic;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function generateResponse(
  conversationMessages: Message[],
): Promise<{ content: string; toolCalls?: unknown[] }> {
  const client = getClient();
  const tools = getToolDefinitions();

  const messages: Anthropic.MessageParam[] = conversationMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });

  const allToolCalls: unknown[] = [];

  while (response.stop_reason === "tool_use") {
    const assistantContent = response.content;
    const toolUseBlocks = assistantContent.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      allToolCalls.push({ name: toolUse.name, input: toolUse.input });
      const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>);
      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    messages.push({ role: "assistant", content: assistantContent });
    messages.push({ role: "user", content: toolResults });

    response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
  }

  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  const content = textBlocks.map((b) => b.text).join("\n");

  return {
    content,
    toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
  };
}
