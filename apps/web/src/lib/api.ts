export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path.replace(/^\//, "")}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  let body: unknown = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    const details =
      typeof body === "object" && body !== null
        ? (body as {
            error?: unknown;
            message?: unknown;
            issues?: Array<{ message?: unknown }>;
          })
        : null;
    const issue = details?.issues?.[0]?.message;
    const message = [details?.error, details?.message, issue]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(" — ");
    throw new ApiError(message || `request failed (${response.status})`, response.status, body);
  }
  return body as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) });
}
