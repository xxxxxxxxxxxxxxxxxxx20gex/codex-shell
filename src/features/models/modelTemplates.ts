import catalog from "../../../bundled/model-templates.json";
import type { ModelTemplate } from "./types";

export const MODEL_TEMPLATES = catalog.templates as ModelTemplate[];

export function getModelTemplate(id: string) {
  return MODEL_TEMPLATES.find((template) => template.id === id);
}
