import { ConvexClient } from "convex/browser";

let client: ConvexClient | null = null;

export function getConvexClient(): ConvexClient {
  if (!client) {
    const url = process.env["CONVEX_URL"];
    if (!url) throw new Error("CONVEX_URL is required");
    client = new ConvexClient(url);
  }
  return client;
}
