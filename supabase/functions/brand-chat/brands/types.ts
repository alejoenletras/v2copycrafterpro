/**
 * Voces de marca disponibles en el chat.
 * Para agregar una nueva voz: añadir el literal aquí y crear el archivo correspondiente en brands/.
 */
export type Voice = "saleads" | "marco";

/**
 * Lista de voces soportadas en runtime.
 * Úsalo para validación de input y para generar mensajes de error.
 */
export const SUPPORTED_VOICES: readonly Voice[] = ["saleads", "marco"] as const;

/**
 * Voz por defecto cuando el request no incluye el campo `voice`.
 * Mantiene retrocompatibilidad con el frontend actual.
 */
export const DEFAULT_VOICE: Voice = "saleads";

/**
 * Type guard para validar que un string arbitrario es una Voice válida.
 */
export function isVoice(value: unknown): value is Voice {
  return typeof value === "string" && SUPPORTED_VOICES.includes(value as Voice);
}
