import { httpRouter } from "convex/server";
import { webhook as clerkWebhook } from "./clerk/http";

const http = httpRouter();

http.route({
  path: "/clerk/webhook",
  method: "POST",
  handler: clerkWebhook,
});

export default http;
