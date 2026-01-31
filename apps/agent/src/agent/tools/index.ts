import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { getCurrentTime } from "./current-time";

export interface ToolHandler {
  definition: Tool;
  execute: (input: Record<string, unknown>) => Promise<string>;
}

const tools: ToolHandler[] = [getCurrentTime];

export function getToolDefinitions(): Tool[] {
  return tools.map((t) => t.definition);
}

export async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) return `Unknown tool: ${name}`;
  return await tool.execute(input);
}
