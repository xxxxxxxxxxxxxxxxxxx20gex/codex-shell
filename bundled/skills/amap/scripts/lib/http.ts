import {
  CliError,
  DEFAULT_BACKOFF_MS,
  DEFAULT_RETRY_COUNT,
  DEFAULT_TIMEOUT_MS,
  ExitCode,
} from "./config.ts";

export interface HttpGetRequest {
  url: string;
  params: Record<string, string | undefined>;
  timeoutMs?: number;
  retries?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrlWithParams(url: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      query.set(key, value);
    }
  }

  const queryString = query.toString();
  if (queryString.length === 0) {
    return url;
  }

  return `${url}?${queryString}`;
}

export async function getJsonWithRetry(request: HttpGetRequest): Promise<unknown> {
  const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = request.retries ?? DEFAULT_RETRY_COUNT;
  const urlWithParams = buildUrlWithParams(request.url, request.params);

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const isLastAttempt = attempt === retries;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let retryable = true;

    try {
      const response = await fetch(urlWithParams, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        retryable = response.status >= 500 || response.status === 429;
        throw new CliError(
          `HTTP request failed with status ${response.status} for ${request.url}`,
          ExitCode.NETWORK,
        );
      }

      try {
        return await response.json();
      } catch (jsonError) {
        throw new CliError(
          `Failed to read JSON response from ${request.url}`,
          ExitCode.NETWORK,
          { cause: jsonError },
        );
      }
    } catch (error) {
      lastError = error;

      if (!retryable || (error instanceof CliError && error.exitCode !== ExitCode.NETWORK)) {
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }
    if (!isLastAttempt) await sleep(DEFAULT_BACKOFF_MS * 2 ** attempt);
  }

  if (lastError instanceof CliError) {
    throw lastError;
  }

  throw new CliError(
    `Network request failed after retries for ${request.url}`,
    ExitCode.NETWORK,
    { cause: lastError },
  );
}
