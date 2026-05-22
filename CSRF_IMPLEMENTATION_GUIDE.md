# FIX #5: CSRF Protection - Implementation Guide

## Overview

Cross-Site Request Forgery (CSRF) protection is the remaining critical security fix needed before production deployment.

## Current Status

- ✅ All other 11 fixes: COMPLETED
- ⏳ CSRF Protection: PENDING (requires package installation and code changes)

## Why CSRF Protection Matters

**Without CSRF tokens**, an attacker can:

```html
<!-- Malicious site -->
<img
  src="https://berkah-kajeng.com/api/sales"
  alt=""
  onerror="fetch('https://berkah-kajeng.com/api/delete-all', {method: 'DELETE'})"
/>
```

**With CSRF protection**, requests are validated and rejected.

---

## Installation Steps

### Step 1: Install Required Packages

```bash
npm install csurf cookie-parser
npm install --save-dev @types/csurf @types/cookie-parser
```

### Step 2: Update server.ts

Add imports at the top of [server.ts](server.ts#L15):

```typescript
import cookieParser from "cookie-parser";
import csrf from "csurf";
```

Add middleware after CORS configuration (around line 120):

```typescript
// CSRF Protection Middleware
app.use(cookieParser());
const csrfProtection = csrf({
  cookie: true,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // HTTPS only in production
});
```

### Step 3: Add CSRF Token Endpoint

Add this endpoint to serve CSRF tokens to the frontend:

```typescript
// Get CSRF token for form submissions
apiRouter.get("/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
```

### Step 4: Protect State-Changing Endpoints

Add `csrfProtection` middleware to all POST, PUT, DELETE endpoints:

```typescript
// Example - Before:
apiRouter.post("/login", loginLimiter, async (req, res) => { ... });

// Example - After:
apiRouter.post("/login", loginLimiter, csrfProtection, async (req, res) => { ... });

// Apply to all these endpoints:
apiRouter.post("/wood-types", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.post("/sets", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.delete("/sets/:id", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.post("/sales", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.delete("/sales/:id", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.post("/suppliers", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.delete("/suppliers/:id", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.post("/customers", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.delete("/customers/:id", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.post("/expenses", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.put("/expenses/:id", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.delete("/expenses/:id", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.post("/users", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.put("/users/:id", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.delete("/users/:id", authenticateToken, apiLimiter, csrfProtection, ...);
apiRouter.put("/profile", authenticateToken, apiLimiter, csrfProtection, ...);
// ... and others
```

### Step 5: Update Frontend to Send CSRF Token

Modify `fetchWithAuth` in [src/App.tsx](src/App.tsx#L181):

```typescript
const fetchWithAuth = useCallback(
  async (url: string, options: RequestInit = {}) => {
    const token = auth.user?.token;

    // Get CSRF token if needed for state-changing requests
    let csrfToken = "";
    if (["POST", "PUT", "DELETE"].includes(options.method || "GET")) {
      try {
        const csrfRes = await fetch("/api/csrf-token");
        const csrfData = await csrfRes.json();
        csrfToken = csrfData.csrfToken;
      } catch (e) {
        console.warn("Failed to fetch CSRF token:", e);
      }
    }

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(csrfToken && { "X-CSRF-Token": csrfToken }),
    };

    // Timeout code from FIX #9...
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  },
  [auth.user?.token],
);
```

### Step 6: Error Handling for CSRF Failures

Add CSRF error handling:

```typescript
// In server.ts error handling:
app.use((err: any, req: any, res: any, next: any) => {
  if (err.code === "EBADCSRFTOKEN") {
    // CSRF token errors
    return res.status(403).json({ error: "CSRF token validation failed" });
  }
  // Other errors...
});
```

---

## Configuration Options

### Cookie Security Settings

```typescript
const csrfProtection = csrf({
  cookie: true,
  httpOnly: true, // Prevent XSS from reading cookie
  secure: process.env.NODE_ENV === "production", // HTTPS only
  sameSite: "strict", // Prevent cross-site requests
  maxAge: 3600000, // 1 hour
});
```

### Token in Response vs Cookie

**Current approach (RECOMMENDED):**

- Token sent in cookie (automatic)
- Frontend includes in header `X-CSRF-Token`

**Alternative approach:**

- Return token in JSON response
- Frontend stores and includes in headers

---

## Testing CSRF Protection

### Test Valid Request (Should Succeed)

```bash
# Get CSRF token
TOKEN=$(curl -s http://localhost:3000/api/csrf-token | jq -r '.csrfToken')

# Make request with token
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"category":"Transport","amount":50000,"date":"2024-05-22"}'
```

### Test Missing CSRF Token (Should Fail)

```bash
# Try without token - should get 403
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"category":"Transport","amount":50000,"date":"2024-05-22"}'
# Response: "CSRF token validation failed"
```

### Test Invalid CSRF Token (Should Fail)

```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-CSRF-Token: invalid-token-12345" \
  -d '{"category":"Transport","amount":50000,"date":"2024-05-22"}'
# Response: "CSRF token validation failed"
```

---

## Common Issues & Solutions

### Issue: CSRF token not matching

**Solution**: Ensure cookie is being sent and same token is used in header

### Issue: Cookie not being set

**Solution**: Check `secure` flag - set to `false` for HTTP (development), `true` for HTTPS (production)

### Issue: SameSite blocking requests

**Solution**: If needed for cross-domain, use `sameSite: 'lax'` instead of `strict`

### Issue: Token expiring too fast

**Solution**: Increase `maxAge` option in csrf configuration

---

## Files That Need Changes

When implementing CSRF:

1. **server.ts**
   - Add imports (cookieParser, csurf)
   - Add middleware
   - Create `/csrf-token` endpoint
   - Add `csrfProtection` to POST/PUT/DELETE endpoints
   - Add error handling

2. **src/App.tsx**
   - Update `fetchWithAuth` to fetch and include CSRF token
   - Add error handling for CSRF failures

3. **package.json**
   - Add csurf, cookie-parser, @types/csurf, @types/cookie-parser

---

## Before/After Code Example

### Before (Vulnerable)

```typescript
// server.ts
apiRouter.post("/expenses", authenticateToken, apiLimiter, async (req, res) => {
  // No CSRF check - vulnerable!
  const { id, category, amount, date } = req.body;
  // ... process ...
});
```

### After (Protected)

```typescript
// server.ts
import csrf from "csurf";
const csrfProtection = csrf({ cookie: true });

apiRouter.post(
  "/expenses",
  authenticateToken,
  apiLimiter,
  csrfProtection,
  async (req, res) => {
    // CSRF token is validated automatically
    // If invalid, returns 403 before reaching handler
    const { id, category, amount, date } = req.body;
    // ... process ...
  },
);
```

---

## Production Checklist

Before deploying to production:

- [ ] Packages installed: `npm install csurf cookie-parser`
- [ ] Imports added to server.ts
- [ ] Cookie parser middleware added
- [ ] CSRF middleware initialized
- [ ] `/csrf-token` endpoint created
- [ ] All POST/PUT/DELETE endpoints protected
- [ ] Frontend updated to fetch CSRF tokens
- [ ] Frontend includes CSRF token in headers
- [ ] Error handling for CSRF failures added
- [ ] Tested with valid token (should succeed)
- [ ] Tested without token (should fail 403)
- [ ] Tested with invalid token (should fail 403)
- [ ] `secure` flag set correctly (false for HTTP dev, true for HTTPS prod)
- [ ] `sameSite` configured appropriately
- [ ] HTTPS enabled in production (required for secure cookies)

---

## Security Best Practices with CSRF

✅ **DO:**

- Always regenerate tokens for sensitive operations
- Use `httpOnly` flag to prevent XSS attacks
- Use `secure` flag with HTTPS in production
- Use `sameSite=strict` for maximum security
- Implement short token expiration (1 hour)

❌ **DON'T:**

- Store CSRF token in localStorage (XSS vulnerable)
- Use CSRF tokens in GET requests
- Disable CSRF protection for "trusted" endpoints
- Reuse same token across multiple requests
- Disable HttpOnly flag for "convenience"

---

## References

- OWASP CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- csurf Documentation: https://www.npmjs.com/package/csurf
- SameSite Cookies: https://web.dev/samesite-cookies-explained/

---

**Last Updated:** May 22, 2026  
**Priority:** HIGH - Implement before production deployment
