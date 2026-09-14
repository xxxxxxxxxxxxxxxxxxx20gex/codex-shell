import { createContext } from "react";
import type { ImageAttachment } from "../runtime/sessionInput";

export const ImageAnnotationContext = createContext<((image: ImageAttachment, text: string) => void) | null>(null);
