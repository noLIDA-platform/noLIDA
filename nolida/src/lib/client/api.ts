/**
 * Client-safe fetch helper for the `{ ok: true, data }` /
 * `{ ok: false, error }` envelope every NOlida API route returns.
 *
 * Safe to import from Client Components: no server-only imports.
 */

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = {
  ok: false;
  error: { code: string; message: string };
};
export type ApiResult<T> = ApiSuccess<T> | ApiError;

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "same-origin",
    });

    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      return {
        ok: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: "Something went wrong. Please try again.",
        },
      };
    }

    if (
      typeof json === "object" &&
      json !== null &&
      (json as { ok?: unknown }).ok === true &&
      "data" in (json as Record<string, unknown>)
    ) {
      return {
        ok: true,
        data: (json as { data: T }).data,
      };
    }

    if (
      typeof json === "object" &&
      json !== null &&
      (json as { ok?: unknown }).ok === false &&
      "error" in (json as Record<string, unknown>)
    ) {
      const err = (json as ApiError).error;
      if (
        typeof err === "object" &&
        err !== null &&
        typeof (err as { code?: unknown }).code === "string" &&
        typeof (err as { message?: unknown }).message === "string"
      ) {
        return { ok: false, error: { code: err.code, message: err.message } };
      }
    }

    return {
      ok: false,
      error: {
        code: "UNKNOWN_ERROR",
        message: "Something went wrong. Please try again.",
      },
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Could not reach the server. Check your connection.",
      },
    };
  }
}
