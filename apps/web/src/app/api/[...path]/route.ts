import { isAuthorized } from "@/lib/auth";

const API_URL = process.env.SAKSI_API_URL ?? "http://127.0.0.1:3000";
const API_KEY = process.env.SAKSI_API_KEY ?? "";

async function forward(request: Request, path: string[]) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return new Response("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Saksi"' },
    });
  }
  const url = new URL(request.url);
  const target = `${API_URL.replace(/\/$/, "")}/v1/${path.join("/")}${url.search}`;
  const init: RequestInit = {
    method: request.method,
    headers: {
      "content-type": request.headers.get("content-type") ?? "application/json",
      "x-api-key": API_KEY,
    },
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }
  const response = await fetch(target, init);
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forward(request, path);
}
