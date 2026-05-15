export {
  messageSchemas,
  validatePayload,
  validatePayloadWithError,
  type MessageType,
  // Individual schemas for direct use
  adminSetMainMatchSchema,
  adminSetTickerMatchesSchema,
  adminSetThemeSchema,
  adminSetTogglesSchema,
  adminTestEventSchema,
  adminHelloSchema,
  overlayHelloSchema,
} from "./schemas.js";
