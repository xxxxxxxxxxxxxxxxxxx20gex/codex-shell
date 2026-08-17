export function modelIdDisplayName(modelId: string) {
  if (!/^gpt(?:-|$)/i.test(modelId)) return modelId;
  return modelId
    .split("-")
    .map((part, index) => {
      if (index === 0) return "GPT";
      if (/^[a-z]/i.test(part)) return `${part[0].toUpperCase()}${part.slice(1)}`;
      return part;
    })
    .join("-");
}
