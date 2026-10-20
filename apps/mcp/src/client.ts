export interface SaksiClientOptions {
  baseUrl: string;
  apiKey: string;
}

export class SaksiApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "SaksiApiError";
  }
}

export class SaksiClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: SaksiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const init: RequestInit = {
      method,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
      },
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await fetch(`${this.baseUrl}${path}`, init);
    const text = await response.text();
    let parsed: unknown = null;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!response.ok) {
      throw new SaksiApiError(`Saksi API ${method} ${path} failed`, response.status, parsed);
    }
    return parsed as T;
  }
}
