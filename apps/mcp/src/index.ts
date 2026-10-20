import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SaksiClient } from "./client";
import { registerSaksiTools } from "./tools";

const apiKey = process.env.SAKSI_API_KEY;
if (!apiKey) {
  console.error("SAKSI_API_KEY is required");
  process.exit(1);
}

const client = new SaksiClient({
  baseUrl: process.env.SAKSI_API_URL ?? "http://127.0.0.1:3000",
  apiKey,
});

const server = new McpServer({
  name: "saksi",
  version: "0.1.0",
});

registerSaksiTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("saksi-mcp connected over stdio");
