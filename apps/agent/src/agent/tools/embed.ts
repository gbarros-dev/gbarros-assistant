import { createGateway } from "@ai-sdk/gateway";
import { env } from "@zenthor-assist/env/agent";
import { embed } from "ai";

const gateway = createGateway({ apiKey: env.AI_GATEWAY_API_KEY });

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = gateway.embeddingModel(env.AI_EMBEDDING_MODEL);
  const { embedding } = await embed({ model, value: text });
  return embedding;
}
