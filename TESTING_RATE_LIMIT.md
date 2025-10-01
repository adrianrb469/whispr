# Testing Rate Limiting with Burp Suite

## Quick Start Guide

### Prerequisites

- Burp Suite Community Edition installed
- Server running: `bun run dev` or `npm run dev`
- Server URL: `http://localhost:3000`

---

## Testing Setup

### 1. Configure Burp Suite Proxy

1. Open Burp Suite
2. Go to **Proxy** → **Options**
3. Ensure proxy listener is running on `127.0.0.1:8080`
4. Go to **Proxy** → **Intercept** and turn it **OFF** (for automated testing)

### 2. Configure Your Browser/Tool

Set proxy settings to:

- **Host**: `127.0.0.1` or `localhost`
- **Port**: `8080`

---

## Test Scenarios

### Test 1: Standard Rate Limit (60 req/min)

**Target**: Any general endpoint (e.g., `/conversations`, `/user`)

**Steps**:

1. Send **61 requests** in less than 1 minute
2. Expected: First 60 succeed, request 61 returns **429 Too Many Requests**

**Burp Suite Intruder**:

```
1. Capture a request to /conversations or /user
2. Right-click → Send to Intruder
3. Clear all payload positions
4. Payload type: Numbers
5. Set: From 1 to 61, Step 1
6. Start attack
7. Check response codes: first 60 should be 200/401, last one should be 429
```

---

### Test 2: Strict Rate Limit (5 req/15min) - Brute Force Protection

**Target**: Authentication endpoints

- `/auth/login`
- `/auth/register`
- `/auth/mfa/verify`

**Steps**:

1. Send **6 login attempts** within 15 minutes
2. Expected: First 5 processed, request 6 returns **429 Too Many Requests**
3. IP gets **BLOCKED for 1 hour**

**Burp Suite Intruder Setup**:

```
POST /auth/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{"username":"test§1§","password":"wrongpassword"}
```

**Intruder Config**:

- Payload position: `§1§` (to make each request unique)
- Payload type: Numbers (1 to 10)
- Throttle: None (send as fast as possible)

**Expected Results**:

```
Request 1-5: 400/401 (invalid credentials, but processed)
Request 6: 429 (rate limit exceeded)
Request 7-10: 429 (IP blocked for 1 hour)
```

---

### Test 3: SQL Injection Attack Simulation

**Simulate**: Automated SQL injection attempts

**Burp Suite Intruder**:

```
POST /auth/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{"username":"admin§' OR '1'='1§","password":"test"}
```

**Payload**:

- Load SQL injection payload list
- Or use simple numbers: 1 to 50

**Expected**:

- After 5 attempts: **429 Too Many Requests**
- IP blocked for 1 hour
- Console shows: `[SECURITY] IP 127.0.0.1 BLOCKED`

---

## Monitoring & Debugging

### Console Logs (Development Mode)

You should see detailed logs like:

```bash
[RATE LIMIT] Request from IP: 127.0.0.1 to /auth/login
[RATE LIMIT] Request from IP: 127.0.0.1 to /auth/login
[RATE LIMIT] Request from IP: 127.0.0.1 to /auth/login
[RATE LIMIT] Request from IP: 127.0.0.1 to /auth/login
[RATE LIMIT] Request from IP: 127.0.0.1 to /auth/login
[RATE LIMIT] IP 127.0.0.1 approaching limit: 5/5
[SECURITY] IP 127.0.0.1 BLOCKED for 60 minutes after 6 requests (limit: 5)
[RATE LIMIT] Blocked IP 127.0.0.1 attempted access (60min remaining)
```

### Response Headers

Check these headers in Burp Suite response:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 2025-10-01T15:45:00.000Z
```

### Response Body (429 Error)

```json
{
  "success": false,
  "error": "Too many authentication attempts. Your IP has been temporarily blocked."
}
```

---

## IP Detection Debug

If you see `Unable to determine client IP`, the middleware now has better fallbacks:

1. **Checks proxy headers**: `x-forwarded-for`, `x-real-ip`, etc.
2. **Checks Bun socket**: `c.env.incoming.socket.remoteAddress`
3. **Checks host header**: If `localhost`, uses `127.0.0.1`
4. **Fallback**: Uses `0.0.0.0` (should never happen now)

### Verify IP Detection

Look for this log:

```
[RATE LIMIT] Request from IP: 127.0.0.1 to /auth/login
```

If you see `0.0.0.0`, there's still an issue with IP detection.

---

## Manual Testing (cURL Alternative)

If you don't want to use Burp Suite:

```bash
# Test strict rate limit (5 req/15min)
for i in {1..10}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"test$i\",\"password\":\"wrong\"}" \
    -w "\nHTTP Status: %{http_code}\n" \
    -s -o /dev/null
  echo "---"
done
```

**Expected Output**:

```
Request 1: HTTP Status: 400
Request 2: HTTP Status: 400
Request 3: HTTP Status: 400
Request 4: HTTP Status: 400
Request 5: HTTP Status: 400
Request 6: HTTP Status: 429  ← Rate limit exceeded
Request 7: HTTP Status: 429  ← IP blocked
Request 8: HTTP Status: 429  ← IP blocked
...
```

---

## Unblocking Your IP

If you get blocked during testing:

### Method 1: Wait 1 Hour

The block will expire automatically.

### Method 2: Restart the Server

Since storage is in-memory, restarting clears all blocks.

```bash
# Stop server (Ctrl+C)
bun run dev  # Start again
```

### Method 3: Manual Unblock (Future Feature)

Add this endpoint for development:

```typescript
// In controller.ts (for testing only)
app.delete("/admin/unblock/:ip", async (c) => {
  const ip = c.req.param("ip");
  unblockIP(ip);
  return c.json({ message: `IP ${ip} unblocked` });
});
```

Then:

```bash
curl -X DELETE http://localhost:3000/admin/unblock/127.0.0.1
```

---

## Common Issues & Solutions

### Issue 1: All requests go through (no rate limiting)

**Cause**: IP detection failing  
**Solution**: Check console for IP detection logs

### Issue 2: Rate limit too aggressive

**Cause**: Multiple IPs detected (proxy confusion)  
**Solution**: Check what IP is being logged

### Issue 3: Can't reproduce block

**Cause**: Requests spread over time  
**Solution**: Use Burp Intruder with no throttling

### Issue 4: Block doesn't expire

**Cause**: Server time vs. calculation  
**Solution**: Restart server or wait full hour

---

## Production Considerations

### For Production Testing:

1. **Use Redis** instead of in-memory storage
2. **Add IP whitelist** for your test IPs
3. **Adjust limits** based on your needs
4. **Monitor logs** in production
5. **Set up alerts** for frequent blocks

### Disable Rate Limiting for Testing:

```typescript
// In index.ts - comment out for specific tests
// app.use("*", standardRateLimiter());
```

---

## Burp Suite Pro Features (Optional)

If you have Burp Suite Professional:

1. **Scanner**: Will automatically trigger rate limits
2. **Active Scan**: Set to "Thorough" to test limits
3. **Resource Pool**: Configure threads to control request rate
4. **Macros**: Create login sequences to test session-based limits

---

## Checklist

- [ ] Server running on `localhost:3000`
- [ ] Burp Suite proxy configured on `127.0.0.1:8080`
- [ ] Burp Intercept is **OFF**
- [ ] Console shows IP detection: `127.0.0.1`
- [ ] Test endpoint selected
- [ ] Intruder payload configured
- [ ] Monitor console for logs
- [ ] Check response status codes
- [ ] Verify block duration (1 hour)

---

**Happy Testing! 🔒**

_Remember: Rate limiting works! If you see 429 errors, the system is protecting your API correctly._
