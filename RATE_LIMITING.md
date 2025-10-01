# Rate Limiting & Brute Force Protection

## Overview

This API implements comprehensive **rate limiting** and **IP-based blocking** to protect against brute force attacks and API abuse.

## Terminology

- **Rate Limiting**: Controlling the number of requests a client can make within a time window
- **Rate Limiter**: The middleware that enforces rate limiting rules
- **IP Blocking/Banning**: Temporarily blocking IP addresses that exceed request limits
- **Brute Force Protection**: Preventing automated attack attempts on authentication endpoints
- **Sliding Window Algorithm**: The method used to track requests over time

## Implementation Details

### File Structure

```
whispr/src/middleware/
├── rate-limit.middleware.ts  # Main rate limiting implementation
├── auth.middleware.ts        # JWT authentication
└── index.ts                  # Middleware exports
```

### Rate Limiting Strategies

#### 1. Standard Rate Limiter

Applied to all API routes for general protection.

- **Window**: 1 minute
- **Max Requests**: 60 requests per minute
- **Block Duration**: 1 hour after exceeding limit
- **Use Case**: General API endpoints (conversations, messages, user data)

#### 2. Strict Rate Limiter

Applied to sensitive authentication endpoints for brute force protection.

- **Window**: 15 minutes
- **Max Requests**: 5 requests per 15 minutes
- **Block Duration**: 1 hour after exceeding limit
- **Use Case**: Login, registration, OAuth, MFA verification

### Protected Endpoints

#### All Routes (Standard Rate Limiting)

- `GET /conversations/*`
- `POST /message/*`
- `GET /user/*`
- `POST /blockchain/*`

#### Authentication Routes (Strict Rate Limiting)

- `POST /auth/login` - 5 requests per 15 minutes
- `POST /auth/register` - 5 requests per 15 minutes
- `POST /auth/oauth/github` - 5 requests per 15 minutes
- `POST /auth/mfa/verify` - 5 requests per 15 minutes

## How It Works

### 1. Request Tracking

Each request is tracked by the client's IP address:

```typescript
// IP is extracted from headers (supports proxies/load balancers)
const ip = x-forwarded-for | x-real-ip | cf-connecting-ip
```

### 2. Sliding Window

Requests are counted within a time window:

```
Request 1 ────┐
Request 2 ────┤ Within window (allowed)
Request 3 ────┤
Request 4 ────┤ Exceeds limit (blocked)
              │
        [Window expires]
              │
Request 5 ────┘ New window starts
```

### 3. Automatic IP Blocking

When an IP exceeds the limit:

1. IP is added to blocklist with expiration time
2. All subsequent requests are rejected with 429 status
3. Block expires after 1 hour
4. IP is automatically unblocked

### 4. Client Information Headers

Responses include rate limit information:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2025-09-30T15:30:00.000Z
```

## Response Examples

### Normal Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Rate Limit Exceeded (429 Too Many Requests)

```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

### IP Blocked (429 Too Many Requests)

```json
{
  "success": false,
  "error": "IP address blocked due to excessive requests. Try again in 45 minutes."
}
```

## Configuration

### Custom Rate Limiter

You can create custom rate limiters with specific configurations:

```typescript
import { rateLimiter } from "@/middleware";

// Custom configuration
app.use(
  "/api/special",
  rateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 requests per window
    blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
    message: "Custom rate limit message",
  })
);
```

### Adjusting Limits

Edit `/src/middleware/rate-limit.middleware.ts`:

```typescript
// Standard rate limiter
export const standardRateLimiter = (): MiddlewareHandler => {
  return rateLimiter({
    windowMs: 1 * 60 * 1000, // Adjust time window
    maxRequests: 60, // Adjust max requests
    blockDurationMs: 60 * 60 * 1000, // Adjust block duration
  });
};
```

## Administrative Functions

### Unblock an IP Manually

```typescript
import { unblockIP } from "@/middleware";

// Remove IP from blocklist
unblockIP("192.168.1.100");
```

### View Blocked IPs

```typescript
import { getBlockedIPs } from "@/middleware";

const blocked = getBlockedIPs();
console.log(blocked);
// Output: [{ ip: "192.168.1.100", blockedUntil: 1727715600000, attempts: 10 }]
```

### Manual Cleanup

```typescript
import { cleanupExpiredEntries } from "@/middleware";

// Remove expired entries from memory
cleanupExpiredEntries();
```

## Storage Considerations

### Current Implementation (In-Memory)

- **Pros**: Fast, simple, no external dependencies
- **Cons**: Not persistent across server restarts, doesn't scale across multiple servers

### Production Recommendations

For production environments with multiple servers, consider:

1. **Redis-based Storage**

   ```typescript
   // Use Redis for distributed rate limiting
   import Redis from "ioredis";

   const redis = new Redis();
   // Store request counts and blocks in Redis
   ```

2. **Database Storage**

   - Store rate limit data in PostgreSQL/MySQL
   - Better for audit trails and analytics

3. **Third-party Services**
   - Cloudflare Rate Limiting
   - AWS WAF
   - Kong API Gateway

## Security Best Practices

### ✅ Implemented

- IP-based tracking with proxy support
- Automatic blocking after threshold
- Stricter limits on authentication endpoints
- Request information headers
- Automatic cleanup of expired entries
- Security logging

### 🔄 Recommended Additions

1. **CAPTCHA Integration**: Add CAPTCHA after multiple failed attempts
2. **Redis/Distributed Storage**: For multi-server deployments
3. **Whitelist**: Allow certain trusted IPs to bypass limits
4. **Rate Limit Dashboard**: Admin interface to monitor and manage blocks
5. **Alerts**: Notify admins of suspicious activity patterns

## Testing

### Test Rate Limiting

```bash
# Send multiple requests quickly
for i in {1..10}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}'
  echo ""
done
```

### Expected Behavior

- Requests 1-5: Normal responses (or validation errors)
- Request 6+: 429 Too Many Requests
- After block: All requests from that IP blocked for 1 hour

## Monitoring

### Logs to Watch

```bash
# Security warnings for blocked IPs
[SECURITY] IP 192.168.1.100 blocked for 60 minutes after 10 requests

# Cleanup logs
[RATE LIMIT] Cleanup completed. Active IPs: 25, Blocked IPs: 3
```

### Metrics to Track

- Number of rate limit violations per hour
- Most frequently blocked IPs
- Average requests per IP
- Block duration effectiveness

## Troubleshooting

### Issue: Legitimate users getting blocked

**Solution**: Increase `maxRequests` or decrease `windowMs` for standard rate limiter

### Issue: Bot attacks still succeeding

**Solution**: Decrease `maxRequests` and increase `blockDurationMs` for strict rate limiter

### Issue: Rate limiting not working behind reverse proxy

**Solution**: Ensure proxy is forwarding client IP in headers:

```nginx
# Nginx configuration
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
```

### Issue: Memory usage growing over time

**Solution**: Automatic cleanup runs hourly. For immediate cleanup:

```typescript
cleanupExpiredEntries();
```

## Future Enhancements

1. **User-based Rate Limiting**: Track authenticated users separately from IP
2. **Dynamic Limits**: Adjust limits based on time of day or server load
3. **Geo-blocking**: Block requests from specific countries/regions
4. **Pattern Detection**: Identify and block attack patterns beyond simple rate limiting
5. **Web Application Firewall (WAF)**: Integrate with cloud WAF services

---

**Last Updated**: September 30, 2025  
**Maintained by**: Whispr Development Team
