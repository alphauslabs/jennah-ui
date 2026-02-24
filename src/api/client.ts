import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { DeploymentService } from "../gen/proto/jennah_pb"; 

const API_URL = import.meta.env.VITE_API_GATEWAY_URL || "/api";

console.log("API Client initialized with base URL:", API_URL);

const transport = createConnectTransport({
  baseUrl: API_URL,
  
  // 1. Keeps the cookies attached for the browser
  fetch: (input, init) => {
    return globalThis.fetch(input, {
      ...init,
      credentials: "include", 
    });
  },
  
  interceptors: [
    (next) => async (req) => {
      // In production, oauth2-proxy injects these headers automatically.
      // These are only used for local development without the proxy running.
      if (import.meta.env.DEV) {
        req.header.set("X-OAuth-Email", import.meta.env.VITE_DEV_EMAIL || "dev@example.com");
        req.header.set("X-OAuth-UserId", import.meta.env.VITE_DEV_USER_ID || "dev-user-123");
        req.header.set("X-OAuth-Provider", "github");
      }
      return await next(req);
    }
  ]
});

export const client = createClient(DeploymentService, transport);