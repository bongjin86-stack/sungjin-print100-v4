# Zero Script QA - Security Audit Report
## Astro 5 SSR + React 19 Print Ordering System

**Report Date:** 2026-02-07
**Auditor:** Claude Code QA Security Agent
**Status:** FINDINGS DETECTED - Immediate Action Required

---

## Executive Summary

Security audit of the sungjin-print100-nagi codebase identified **5 CRITICAL security vulnerabilities**, **6 HIGH risk issues**, and **4 MEDIUM concerns** that require immediate remediation before production deployment.

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 5 | Immediate fix required |
| HIGH | 6 | Urgent remediation needed |
| MEDIUM | 4 | Address before production |
| LOW | 3 | Monitor, address in future releases |
| **TOTAL** | **18** | **Action items identified** |

---

## Critical Findings (Immediate Action Required)

### CRITICAL-001: Hardcoded Supabase Anon Key in Source Code

**Location:** `src/lib/supabase.ts:4`

**Severity:** CRITICAL (Exposed Database Credentials)

**Issue:**
```typescript
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdG16YmNmem96Z3pzcHNsY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzM2NjAsImV4cCI6MjA4NTI0OTY2MH0.H7w5s_8sSm-_-oU8Ft9fZah6i4NjC6GqQ-GoR3_8MVo';
```

**Risk:**
- JWT token hardcoded as fallback value
- Valid Supabase project credentials exposed in Git history
- Anyone with access to repository can access Supabase database with anon role
- Attackers can perform unauthorized database operations within anon role permissions
- Credentials will be visible in built bundle if environment variable is missing

**Impact:**
- Database breach
- Unauthorized data access (all public data)
- Data manipulation within anon role scope
- Potential for denial of service attacks on database

**Recommendation:**
- IMMEDIATE: Regenerate Supabase anon key in production project
- Remove hardcoded key from source code
- Use only environment variable: `import.meta.env?.PUBLIC_SUPABASE_ANON_KEY`
- Add validation to throw error if environment variable is missing in build
- Review Git history: `git log -S "eyJhbGciOi..." --oneline`

**Verification Code:**
```typescript
// REQUIRED: Modify src/lib/supabase.ts
const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Critical: Missing Supabase environment variables. ' +
    'Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

### CRITICAL-002: Hardcoded Supabase URL in Source Code

**Location:** `src/lib/supabase.ts:3`

**Severity:** CRITICAL (Information Disclosure)

**Issue:**
```typescript
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_URL) || 'https://zqtmzbcfzozgzspslccp.supabase.co';
```

**Risk:**
- Supabase project URL hardcoded as fallback
- Reveals internal project identifier
- Combined with anon key, provides complete database endpoint information
- Visible in compiled bundle

**Impact:**
- Database endpoint discovery
- Targets attackers to specific Supabase instance
- Information gathering for social engineering

**Recommendation:**
- Same as CRITICAL-001: Use only environment variables
- Remove fallback hardcoded URL

---

### CRITICAL-003: Hardcoded Credentials in .env File

**Location:** `.env` (Repository Root)

**Severity:** CRITICAL (Credentials in Version Control)

**Issue:**
```
VITE_SUPABASE_URL=https://zqtmzbcfzozgzspslccp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxdG16YmNmem96Z3pzcHNsY2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzM2NjAsImV4cCI6MjA4NTI0OTY2MH0.H7w5s_8sSm-_-oU8Ft9fZah6i4NjC6GqQ-GoR3_8MVo
```

**Risk:**
- .env file should NEVER be committed to version control
- Currently committed with valid production credentials
- Git history contains credentials permanently (even if deleted)
- Shared with anyone who clones repository

**Impact:**
- Permanent credential exposure
- Database compromise
- Data breach risk

**Recommendation:**
- IMMEDIATE: Add .env to .gitignore
- Rotate Supabase credentials immediately
- Use GitHub secret scanning to detect exposure
- Use BFG Repo-Cleaner to purge from Git history: `bfg --replace-text passwords.txt`
- Create .env.example with placeholder values (already exists)
- Document environment setup in README

**Action Steps:**
```bash
# 1. Add to .gitignore
echo ".env" >> .gitignore

# 2. Remove from Git history
git rm --cached .env
git commit -m "chore: remove .env from version control"

# 3. Rotate credentials in Supabase dashboard
# 4. Push changes and notify team
```

---

### CRITICAL-004: Missing Authentication on Admin API Endpoints

**Location:** `src/pages/api/products/index.ts` (and all other admin endpoints)

**Severity:** CRITICAL (Unauthorized Database Access)

**Issue:**
```typescript
export const POST: APIRoute = async ({ request }) => {
  // NO AUTHENTICATION CHECK
  const body = await request.json();

  // Directly modifies database
  const { data, error } = await supabase
    .from('products')
    .upsert([{ id, name, slug, ...body }]);
```

**Risk:**
- All API endpoints accept requests without authentication
- Anyone can POST to `/api/products`, `/api/settings`, `/api/upload`, etc.
- Database modifications possible without user verification
- No rate limiting on write operations
- File uploads without authentication (critical)

**Affected Endpoints:**
- `/api/products/index.ts` - POST creates/modifies products
- `/api/products/[id].ts` - DELETE removes products
- `/api/settings.ts` - POST modifies site settings
- `/api/upload.ts` - POST uploads files to storage
- `/api/news/index.ts` - All write operations
- `/api/faq/[id].ts` - All write operations
- And all other admin endpoints

**Impact:**
- Unauthorized product modifications
- Malicious file uploads
- Database tampering
- Settings manipulation
- Data loss

**Recommendation:**
- Add authentication check to ALL admin endpoints
- Verify Supabase session or JWT token
- Implement role-based access control
- Add rate limiting on write operations

**Reference Implementation:**
```typescript
import { verifyAuthHeader } from '@/lib/authService';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verify authentication
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify token validity
  try {
    const user = await supabase.auth.getUser(token);
    if (!user.data.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    });
  }

  // Continue with authenticated operation...
};
```

---

### CRITICAL-005: Service Role Key Not Protected in Backend

**Location:** `src/pages/api/upload.ts:5`

**Severity:** CRITICAL (Privileged Database Access)

**Issue:**
```typescript
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

// Used without additional protection
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

**Risk:**
- Service role key (admin credentials) used on frontend API route
- Service key should NEVER be exposed to client-side code
- Astro API routes run on server, but accessible via HTTP
- If exposed, grants unrestricted database access

**Impact:**
- Complete database access without RLS (Row Level Security) restrictions
- Ability to bypass all security policies
- Full read/write/delete access to all data

**Recommendation:**
- Service role key should ONLY be used in private backend services
- API routes should use public client (anon key) with RLS policies
- If file uploads require elevated permissions, use separate secure backend service
- Implement temporary signed URLs instead of direct storage access

---

## High Severity Issues

### HIGH-001: Missing CORS and CSP Headers

**Location:** Global - Not configured in astro.config.mjs or middleware

**Severity:** HIGH (XSS and CSRF Vulnerabilities)

**Issue:**
- No Content Security Policy (CSP) headers configured
- No X-Frame-Options header
- No X-Content-Type-Options header
- CORS not explicitly configured

**Risk:**
- Cross-Site Scripting (XSS) attacks possible
- Clickjacking vulnerabilities
- MIME type sniffing attacks
- Unauthorized cross-origin requests

**Recommendation:**
Add security headers via Vercel deployment or middleware. Create a headers configuration:

```typescript
// Add to astro.config.mjs or create _headers file
vite: {
  ssr: {
    noExternal: ['@toast-ui/editor', '@toast-ui/react-editor']
  }
},
// Add headers function for Vercel
```

**Implementation:**
```typescript
// src/middleware.ts - Enhanced version
export const onRequest = defineMiddleware((context, next) => {
  const response = next();

  // Set security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
});
```

---

### HIGH-002: Console.log Statements Leaking Sensitive Data

**Location:** Multiple files

**Severity:** HIGH (Information Disclosure)

**Issue:**
```typescript
// src/pages/api/upload.ts:46, 68
console.error('Upload error:', error);
console.error('Upload error:', err);

// src/pages/api/settings.ts:25, 67, 75, 106
console.error('Single setting save error:', error);
console.error('Batch settings save error:', batchError);
console.error('Settings save error:', error);
console.error('Settings fetch error:', error);

// src/components/product/ProductView.jsx:49
console.error('Failed to load paper data:', err);
```

**Risk:**
- Console output visible in production browser console
- Error details leak database structure and API internals
- User can inspect network requests and console
- Stack traces expose code paths

**Affected Files:**
- `src/pages/api/upload.ts` - Line 46, 68
- `src/pages/api/settings.ts` - Line 25, 67, 75, 106
- `src/components/product/ProductView.jsx` - Line 49
- `src/lib/emailService.ts` - Potential console statements
- And other files (41 files contain console.log/error/warn)

**Recommendation:**
- Remove ALL console.log/error statements in production
- Use proper logging service (Sentry, LogRocket, etc.)
- Environment-specific logging only in development

```typescript
// Development only logging
if (import.meta.env.DEV) {
  console.error('Settings save error:', error);
}

// Production logging to service
else {
  logToService('settings-save-error', error);
}
```

---

### HIGH-003: Unvalidated Input in Checkout/Order System

**Location:** `src/components/order/Checkout.jsx`, `src/components/order/CheckoutSections.jsx`

**Severity:** HIGH (Data Injection / NoSQL Injection Risk)

**Issue:**
```typescript
// sessionStorage stores user input without validation
sessionStorage.setItem('checkoutProduct', JSON.stringify({
  // User-provided data stored directly
}));

// Retrieved and used without sanitization
const currentProduct = JSON.parse(sessionStorage.getItem('checkoutProduct') || '{}');
```

**Risk:**
- sessionStorage data can be manipulated by JavaScript
- No validation of order data format
- Malformed data could cause application crashes
- Potential for data manipulation before submission

**Recommendation:**
- Validate all order data before storage
- Use TypeScript strict checking
- Implement data schema validation (Zod, io-ts)

```typescript
// Use validation schema
import { z } from 'zod';

const CheckoutDataSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  size: z.enum(['A4', 'A3', ...]),
  // ... other fields
});

const validated = CheckoutDataSchema.parse(JSON.parse(sessionStorage.getItem('checkoutProduct')));
```

---

### HIGH-004: Missing Row Level Security (RLS) in Database

**Location:** Supabase Database Tables

**Severity:** HIGH (Unauthorized Data Access)

**Issue:**
- Anon key has direct access to database tables
- No RLS policies to restrict row-level access
- Any client with anon key can query/modify any row
- Users can access orders and data of other users

**Risk:**
- Order information disclosure
- Customer data exposure (addresses, phone numbers)
- Payment information visibility
- Ability to modify other users' orders

**Recommendation:**
- Enable RLS on all tables in Supabase
- Create policies for each operation:
  - SELECT: Only own orders/settings
  - INSERT: Only allowed for authenticated users
  - UPDATE: Only own records
  - DELETE: Restricted to admin only

```sql
-- Example RLS Policy for orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can insert own orders"
  ON orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

### HIGH-005: File Upload Without MIME Type Validation

**Location:** `src/pages/api/upload.ts:40-43`

**Severity:** HIGH (Malicious File Upload)

**Issue:**
```typescript
const { data, error } = await supabaseAdmin.storage
  .from('images')
  .upload(fileName, uint8Array, {
    contentType: file.type,  // Client-provided, not validated
    upsert: false
  });
```

**Risk:**
- MIME type comes from client (can be spoofed)
- No file type validation on backend
- Executable files could be uploaded as images
- No file size limit validation
- Storage space exhaustion attack

**Recommendation:**
- Validate file type on backend
- Implement maximum file size limits
- Use whitelist of allowed MIME types
- Check file magic bytes, not just extension

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

if (!ALLOWED_TYPES.includes(file.type)) {
  return new Response(JSON.stringify({ error: 'Invalid file type' }), {
    status: 400
  });
}

if (file.size > MAX_SIZE) {
  return new Response(JSON.stringify({ error: 'File too large' }), {
    status: 413
  });
}

// Validate magic bytes
const buffer = await file.arrayBuffer();
const bytes = new Uint8Array(buffer);
if (!isValidImageFile(bytes)) {
  return new Response(JSON.stringify({ error: 'Invalid file content' }), {
    status: 400
  });
}
```

---

### HIGH-006: Session Storage Used for Sensitive Data

**Location:** Multiple files in `/src/components/order/`

**Severity:** HIGH (Session Data Exposure)

**Issue:**
```typescript
// src/components/product/ProductView.jsx:296
sessionStorage.setItem('checkoutProduct', JSON.stringify({
  // Contains product details, pricing, user selections
}));

// src/components/order/OrderComplete.jsx:13
const saved = sessionStorage.getItem('orderComplete');
```

**Risk:**
- sessionStorage is accessible to ANY JavaScript on the page
- Vulnerable to XSS attacks
- Data persists during browser session
- Accessible by browser extensions
- Not encrypted

**Recommendation:**
- Use secure HTTP-only session cookies instead
- Validate data on server-side
- Don't store sensitive data in sessionStorage
- Use backend session management

```typescript
// Instead of sessionStorage, use server-side sessions
// Create session on server, store session ID in HTTP-only cookie
// Retrieve full data from server using session ID
```

---

## Medium Severity Issues

### MEDIUM-001: Missing Input Validation on Search

**Location:** `src/lib/orderService.ts:271-274`

**Severity:** MEDIUM (Partial Injection Protection)

**Issue:**
```typescript
if (search) {
  const sanitized = search.replace(/[,.()"'\\]/g, '');
  query = query.or(
    `order_number.ilike.%${sanitized}%,recipient.ilike.%${sanitized}%,customer_phone.ilike.%${sanitized}%`
  );
}
```

**Risk:**
- Regex sanitization is insufficient
- Can still contain SQL/ILIKE injection characters
- Supabase PostgRES queries vulnerable to operator injection
- Limited character filtering doesn't cover all attack vectors

**Recommendation:**
- Use parameterized queries or Supabase filters
- Implement proper input validation schema

```typescript
// Better approach using Supabase filters
if (search) {
  const trimmed = search.trim();
  if (trimmed.length > 0 && trimmed.length < 100) {
    query = query.or(
      `order_number.ilike.%${trimmed}%,recipient.ilike.%${trimmed}%`
    );
  }
}
```

---

### MEDIUM-002: Missing Error Boundary in Admin Components

**Location:** `src/components/admin/` (multiple files)

**Severity:** MEDIUM (Incomplete Error Handling)

**Issue:**
- Admin components lack comprehensive error boundaries
- Failures in ProductBuilder or other admin tools expose details
- No graceful fallback on errors

**Recommendation:**
- Wrap all admin components with Error Boundaries
- Implement proper error logging

---

### MEDIUM-003: No CSRF Protection on State-Changing Operations

**Location:** All POST/DELETE endpoints

**Severity:** MEDIUM (Cross-Site Request Forgery)

**Issue:**
- API endpoints don't require CSRF tokens
- POST requests from other domains could modify data

**Recommendation:**
- Implement CSRF token validation
- Use SameSite cookie attribute

```typescript
// Verify CSRF token
const csrfToken = request.headers.get('X-CSRF-Token');
if (!csrfToken || csrfToken !== session.csrfToken) {
  return new Response(JSON.stringify({ error: 'CSRF validation failed' }), {
    status: 403
  });
}
```

---

### MEDIUM-004: Build Configuration Missing Source Map Disabling

**Location:** `astro.config.mjs`

**Severity:** MEDIUM (Information Disclosure in Production)

**Issue:**
- No explicit source map configuration for production
- Built JavaScript may include source maps
- Reveals source code structure to attackers

**Recommendation:**
Add to build configuration:

```typescript
// astro.config.mjs
export default defineConfig({
  vite: {
    build: {
      sourcemap: process.env.NODE_ENV === 'production' ? false : true,
      minify: 'terser',
    }
  }
});
```

---

## Low Severity Issues

### LOW-001: Missing Helmet Security Headers

**Severity:** LOW (Defense in Depth)

**Issue:**
- Vercel doesn't enforce security headers by default
- Missing HSTS, Referrer-Policy, etc.

**Recommendation:**
```json
// vercel.json (create new file)
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

---

### LOW-002: Missing Dependency Security Scanning

**Severity:** LOW (Ongoing Risk Management)

**Issue:**
- No automated dependency vulnerability scanning
- pnpm packages not regularly audited

**Recommendation:**
- Add GitHub Dependabot
- Run `pnpm audit` in CI/CD pipeline
- Review peer dependencies of @blocknote and Mantine

---

### LOW-003: DOMPurify Configuration Not Explicitly Set

**Severity:** LOW (Best Practice)

**Issue:**
```typescript
// src/components/product/ProductView.jsx:367
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.featuresHtml) }}
```

While DOMPurify is used, configuration could be more explicit.

**Recommendation:**
```typescript
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  KEEP_CONTENT: true
};

dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(content.featuresHtml, DOMPURIFY_CONFIG)
}}
```

---

## Environment Variable Issues

### Missing Environment Variables

**File:** `.env.example` incomplete

**Current:**
```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Should Include:**
```
# Public (safe to expose)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-only (never expose)
SUPABASE_SERVICE_KEY=your-service-key

# Optional features
NODE_ENV=production
LOG_LEVEL=error
SENTRY_DSN=https://...
```

---

## Deployment Checklist

Before deploying to production, complete these security fixes:

- [ ] **CRITICAL:** Rotate Supabase anon key immediately
- [ ] **CRITICAL:** Remove hardcoded credentials from src/lib/supabase.ts
- [ ] **CRITICAL:** Remove .env file from Git history
- [ ] **CRITICAL:** Add authentication to all admin API endpoints
- [ ] **CRITICAL:** Protect SUPABASE_SERVICE_KEY - move to secure backend
- [ ] **HIGH:** Add Content Security Policy headers
- [ ] **HIGH:** Remove console.log statements from production build
- [ ] **HIGH:** Implement Row Level Security (RLS) on all database tables
- [ ] **HIGH:** Add MIME type validation on file uploads
- [ ] **HIGH:** Replace sessionStorage with secure server-side sessions
- [ ] **MEDIUM:** Validate and sanitize all user inputs
- [ ] **MEDIUM:** Disable source maps in production build
- [ ] **MEDIUM:** Add CSRF protection to state-changing operations
- [ ] **LOW:** Configure Vercel headers for security
- [ ] **LOW:** Set up dependency scanning (Dependabot)

---

## Post-Deployment Monitoring

1. Enable Vercel Security Monitoring
2. Set up error tracking (Sentry)
3. Monitor API logs for unauthorized access attempts
4. Review Supabase audit logs for suspicious queries
5. Implement rate limiting on critical endpoints
6. Regular security audits (monthly)
7. Keep dependencies updated

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Astro Security Documentation](https://docs.astro.build/en/guides/security/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/security)
- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [Vercel KV Security](https://vercel.com/docs/storage/vercel-kv/security)

---

## Next Steps

1. **Immediate (Today):** Rotate Supabase credentials
2. **This Week:** Implement critical fixes and re-deploy
3. **Next Sprint:** Implement high-priority fixes
4. **Ongoing:** Address medium/low issues and implement monitoring

---

**Report Generated:** 2026-02-07
**Security Agent:** Claude Code QA
**Status:** REQUIRES REMEDIATION BEFORE PRODUCTION DEPLOYMENT
