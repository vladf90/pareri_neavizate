/**
 * HTTP Middleware - Rate Limiting
 */

import rateLimit from "express-rate-limit";

/**
 * General API rate limiter
 * 100 requests per minute
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  validate: { xForwardedForHeader: false },
});

/**
 * Debug endpoints rate limiter (stricter)
 * 30 requests per minute
 */
export const debugRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many debug requests." },
  validate: { xForwardedForHeader: false },
});

/**
 * Widget endpoints rate limiter (more generous)
 * 200 requests per minute
 */
export const widgetRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many widget requests." },
  validate: { xForwardedForHeader: false },
});
