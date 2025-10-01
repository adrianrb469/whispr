import { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  blockDurationMs: number; // How long to block an IP after exceeding limit
  message?: string;
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

interface BlockedIP {
  blockedUntil: number;
  attempts: number;
}

// In-memory storage for rate limiting
// For production with multiple servers, consider using Redis
const requestStore = new Map<string, RequestRecord>();
const blockedIPs = new Map<string, BlockedIP>();

/**
 * Rate Limiter Middleware
 *
 * Implements IP-based rate limiting with automatic blocking for brute force protection.
 * Uses a sliding window algorithm to track requests per IP address.
 *
 * @param config - Configuration object for rate limiting behavior
 * @returns MiddlewareHandler
 */
export const rateLimiter = (config: RateLimitConfig): MiddlewareHandler => {
  const {
    windowMs,
    maxRequests,
    blockDurationMs,
    message = "Too many requests, please try again later",
  } = config;

  return async (c, next) => {
    // Get client IP address
    const clientIP = getClientIP(c);
    const now = Date.now();

    // Log IP detection for debugging (only in development)
    if (process.env.NODE_ENV !== "production") {
      console.log(`[RATE LIMIT] Request from IP: ${clientIP} to ${c.req.path}`);
    }

    // Check if IP is currently blocked
    const blocked = blockedIPs.get(clientIP);
    if (blocked && blocked.blockedUntil > now) {
      const remainingTime = Math.ceil((blocked.blockedUntil - now) / 1000 / 60);
      console.warn(
        `[RATE LIMIT] Blocked IP ${clientIP} attempted access (${remainingTime}min remaining)`
      );
      throw new HTTPException(429, {
        message: `IP address blocked due to excessive requests. Try again in ${remainingTime} minutes.`,
      });
    } else if (blocked && blocked.blockedUntil <= now) {
      // Block expired, remove it
      blockedIPs.delete(clientIP);
      console.log(`[RATE LIMIT] IP ${clientIP} unblocked (timeout expired)`);
    }

    // Get or create request record for this IP
    let record = requestStore.get(clientIP);

    if (!record || record.resetTime <= now) {
      // Create new window
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      requestStore.set(clientIP, record);

      if (process.env.NODE_ENV !== "production") {
        console.log(`[RATE LIMIT] New window created for IP ${clientIP}`);
      }

      await next();
      return;
    }

    // Increment request count
    record.count++;

    // Log when approaching limit (only in development)
    if (
      process.env.NODE_ENV !== "production" &&
      record.count > maxRequests * 0.8
    ) {
      console.warn(
        `[RATE LIMIT] IP ${clientIP} approaching limit: ${record.count}/${maxRequests}`
      );
    }

    // Check if limit exceeded
    if (record.count > maxRequests) {
      // Block the IP
      blockedIPs.set(clientIP, {
        blockedUntil: now + blockDurationMs,
        attempts: record.count,
      });

      console.warn(
        `[SECURITY] IP ${clientIP} BLOCKED for ${
          blockDurationMs / 1000 / 60
        } minutes after ${record.count} requests (limit: ${maxRequests})`
      );

      throw new HTTPException(429, {
        message,
      });
    }

    // Update the record
    requestStore.set(clientIP, record);

    // Add rate limit headers for client information
    c.header("X-RateLimit-Limit", maxRequests.toString());
    c.header("X-RateLimit-Remaining", (maxRequests - record.count).toString());
    c.header("X-RateLimit-Reset", new Date(record.resetTime).toISOString());

    await next();
  };
};

/**
 * Stricter rate limiter for sensitive endpoints (login, registration, etc.)
 *
 * Provides aggressive rate limiting for brute force protection on authentication endpoints.
 */
export const strictRateLimiter = (): MiddlewareHandler => {
  return rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests per 15 minutes
    blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
    message:
      "Too many authentication attempts. Your IP has been temporarily blocked.",
  });
};

/**
 * Standard rate limiter for general API endpoints
 */
export const standardRateLimiter = (): MiddlewareHandler => {
  return rateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
    message: "Rate limit exceeded. Please slow down your requests.",
  });
};

/**
 * Extract client IP address from request
 * Checks common headers used by proxies and load balancers
 */
function getClientIP(c: any): string {
  // 1. Check proxy/load balancer headers first
  const proxyHeaders = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip", // Cloudflare
    "x-client-ip",
    "x-cluster-client-ip",
    "forwarded-for",
    "forwarded",
  ];

  for (const header of proxyHeaders) {
    const value = c.req.header(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(",")[0].trim();
      if (ip) return ip;
    }
  }

  // 2. Try to get IP from Bun server context
  try {
    // Bun exposes connection info differently
    if (c.env?.incoming?.socket?.remoteAddress) {
      return c.env.incoming.socket.remoteAddress;
    }

    // Try env.ip (some Bun configurations)
    if (c.env?.ip) {
      return c.env.ip;
    }
  } catch (error) {
    // Silent fail, continue to fallback
  }

  // 3. Try to extract from request object
  try {
    // Some runtimes expose it here
    const req = c.req.raw as any;
    if (req?.connection?.remoteAddress) {
      return req.connection.remoteAddress;
    }
    if (req?.socket?.remoteAddress) {
      return req.socket.remoteAddress;
    }
  } catch (error) {
    // Silent fail, continue to fallback
  }

  // 4. Fallback for local development/testing
  // When using Burp Suite or direct local requests, use localhost
  const host = c.req.header("host") || "";
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return "127.0.0.1";
  }

  // 5. Last resort: use a default IP for local/test environments
  console.warn("[RATE LIMIT] Unable to determine client IP, using fallback");
  return "0.0.0.0"; // Fallback IP for unknown sources
}

/**
 * Utility function to manually unblock an IP (for admin purposes)
 */
export function unblockIP(ip: string): boolean {
  return blockedIPs.delete(ip);
}

/**
 * Utility function to get blocked IPs list (for monitoring)
 */
export function getBlockedIPs(): Array<{
  ip: string;
  blockedUntil: number;
  attempts: number;
}> {
  const now = Date.now();
  const blocked: Array<{ ip: string; blockedUntil: number; attempts: number }> =
    [];

  blockedIPs.forEach((data, ip) => {
    if (data.blockedUntil > now) {
      blocked.push({ ip, ...data });
    }
  });

  return blocked;
}

/**
 * Cleanup function to remove expired entries
 * Should be called periodically (e.g., every hour)
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();

  // Clean expired request records
  requestStore.forEach((record, ip) => {
    if (record.resetTime <= now) {
      requestStore.delete(ip);
    }
  });

  // Clean expired blocks
  blockedIPs.forEach((block, ip) => {
    if (block.blockedUntil <= now) {
      blockedIPs.delete(ip);
    }
  });

  console.log(
    `[RATE LIMIT] Cleanup completed. Active IPs: ${requestStore.size}, Blocked IPs: ${blockedIPs.size}`
  );
}

// Set up periodic cleanup (runs every hour)
setInterval(cleanupExpiredEntries, 60 * 60 * 1000);
