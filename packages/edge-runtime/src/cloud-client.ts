import type { DemoCloudClient, DemoHttpResponse } from "../../e2e-slice/src/edge.ts";

export function createHttpEdgeCloudClient(baseUrl: string): DemoCloudClient {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  return {
    get: (path) => request(normalizedBaseUrl, "GET", path),
    post: (path, payload) => request(normalizedBaseUrl, "POST", path, payload),
  };
}

async function request(
  baseUrl: string,
  method: "GET" | "POST",
  requestPath: string,
  payload?: unknown,
): Promise<DemoHttpResponse> {
  if (!requestPath.startsWith("/")) throw new Error("Cloud request path must be absolute");
  const init: RequestInit = {
    method,
    ...(payload === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }),
  };
  const response = await fetch(new URL(requestPath, baseUrl), init);
  const text = await response.text();
  let parsed: unknown = {};
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error("Cloud response was not JSON", { cause: error });
    }
  }
  return {
    statusCode: response.status,
    json<T>(): T {
      return parsed as T;
    },
  };
}

function normalizeBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
    return `${url.toString().replace(/\/$/, "")}/`;
  } catch (error) {
    throw new Error("invalid Cloud endpoint", { cause: error });
  }
}
