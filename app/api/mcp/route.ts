import { NextRequest } from "next/server";
import { createXPilotMCPServer } from "@/lib/mcp-server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const server = createXPilotMCPServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function GET() {
  return new Response(
    JSON.stringify({
      name: "xPilot MCP Server",
      version: "1.0.0",
      description: "AI Social Media Marketing Automation — generate images, videos, and posts with 49 AI models",
      tools: [
        { name: "list_models", description: "List all available AI models" },
        { name: "generate_image", description: "Generate AI image (13 free models available)" },
        { name: "generate_video", description: "Generate AI video (Seedance, Wan, Kling)" },
        { name: "generate_post", description: "Generate social media post for X" },
        { name: "check_task", description: "Check generation task status" },
      ],
      resources: [
        { name: "platform-info", uri: "xpilot://info", description: "xPilot platform information" },
      ],
      transport: "streamable-http",
      endpoint: "https://xpilot.jytech.us/api/mcp",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}

export async function DELETE() {
  return new Response(null, { status: 405 });
}
