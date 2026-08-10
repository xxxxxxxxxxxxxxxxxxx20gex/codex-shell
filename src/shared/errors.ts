export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function asError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}
