export const MAX_MODEL_VISIBLE_INPUT_BYTES = 8_000;

export function modelVisibleInputBytes(value: string) {
  return new TextEncoder().encode(value).length;
}

export function assertModelVisibleInput(value: string, label: string) {
  const bytes = modelVisibleInputBytes(value);
  if (bytes <= MAX_MODEL_VISIBLE_INPUT_BYTES) return;
  throw new Error(`${label}不能超过 ${MAX_MODEL_VISIBLE_INPUT_BYTES} UTF-8 字节（当前 ${bytes} 字节）`);
}
