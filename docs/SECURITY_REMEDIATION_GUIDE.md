# Security Remediation Guide

## Priority 1: Immediate Actions (Today)

### Step 1: Rotate Supabase Credentials

1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project (zqtmzbcfzozgzspslccp)
3. Navigate to Settings → API Keys
4. Click "Reset" on the Anon Key
5. Copy new key
6. Update `.env` file (local only, don't commit)

### Step 2: Remove .env from Git History

```bash
# 1. Stop tracking the file
git rm --cached .env

# 2. Add to .gitignore
echo ".env" >> .gitignore

# 3. Commit the change
git add .gitignore
git commit -m "chore: add .env to gitignore"

# 4. CRITICAL: Purge from Git history using BFG
# Install BFG: https://rtyley.github.io/bfg-repo-cleaner/
bfg --replace-text passwords.txt

# 5. Force push (after BFG)
git push --force
```

### Step 3: Update src/lib/supabase.ts

**BEFORE:**
```typescript
const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_URL) || 'https://zqtmzbcfzozgzspslccp.supabase.co';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**AFTER:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'CRITICAL: Missing Supabase credentials.\n' +
    'Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env file\n' +
    'See .env.example for template.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Step 4: Create Secure .env.example

```bash
# .env.example (SAFE - commit to git)

# Public Supabase Configuration (safe to expose)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server-only Supabase Configuration (NEVER expose)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Deployment Environment
NODE_ENV=production
```

---

## Priority 2: Security Headers (This Week)

### Add Security Headers via Vercel

Create `vercel.json`:
```json
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
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://zqtmzbcfzozgzspslccp.supabase.co"
        }
      ]
    }
  ]
}
```

Or add to `astro.config.mjs` if using middleware:
```typescript
export const onRequest = defineMiddleware((context, next) => {
  const response = next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000');

  return response;
});
```

---

## Priority 3: Authentication on Admin Endpoints

### Create Auth Utility

Create `src/lib/apiAuth.ts`:
```typescript
import type { APIContext } from 'astro';
import { supabase } from './supabase';

export async function verifyAdminAuth(context: APIContext): Promise<boolean> {
  try {
    // Get auth header
    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.slice(7);

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return false;
    }

    // Verify admin role (optional - customize based on your auth setup)
    // const isAdmin = user.user_metadata?.role === 'admin';
    // if (!isAdmin) return false;

    return true;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return false;
  }
}

export function unauthorizedResponse(message: string = 'Unauthorized') {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function forbiddenResponse(message: string = 'Forbidden') {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Update API Endpoints

Example: `src/pages/api/products/index.ts`

```typescript
import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { verifyAdminAuth, unauthorizedResponse } from '../../../lib/apiAuth';

export const prerender = false;

export const GET: APIRoute = async () => {
  // GET is public - no auth needed
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

// PROTECTED: Admin only
export const POST: APIRoute = async (context) => {
  // Verify authentication
  const isAuthorized = await verifyAdminAuth(context);
  if (!isAuthorized) {
    return unauthorizedResponse('Admin authentication required');
  }

  const body = await context.request.json();
  const { id, name, slug, description, ...rest } = body;

  if (!id || !name) {
    return new Response(JSON.stringify({ error: 'id and name are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { data, error } = await supabase
    .from('products')
    .upsert([{
      id,
      name,
      slug: slug || null,
      description: description || '',
      ...rest,
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

Repeat this pattern for:
- `/api/settings.ts` (POST only)
- `/api/upload.ts` (POST only)
- `/api/news/**` (POST, PUT, DELETE)
- `/api/products/**` (POST, PUT, DELETE)
- `/api/faq/**` (POST, PUT, DELETE)
- All other admin endpoints

---

## Priority 4: Database Row Level Security (RLS)

### Enable RLS on All Tables

Run in Supabase SQL Editor:

```sql
-- Enable RLS on critical tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

-- Example: Products (admins only for updates)
CREATE POLICY "Anyone can view products"
  ON products
  FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage products"
  ON products
  FOR ALL
  USING (
    (auth.jwt() ->> 'role' = 'authenticated') AND
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  );

-- Site Settings (admins only)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON site_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can modify settings"
  ON site_settings
  FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'role' = 'authenticated') AND
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  );

CREATE POLICY "Admins can update settings"
  ON site_settings
  FOR UPDATE
  USING (
    (auth.jwt() ->> 'role' = 'authenticated') AND
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role' = 'authenticated') AND
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  );
```

---

## Priority 5: File Upload Validation

### Update `src/pages/api/upload.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { APIRoute } from 'astro';
import { verifyAdminAuth, unauthorizedResponse } from '../../../lib/apiAuth';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Allowed MIME types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

function validateMimeType(mimeType: string): boolean {
  return ALLOWED_TYPES.includes(mimeType);
}

function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

export const POST: APIRoute = async (context) => {
  // Verify authentication
  const isAuthorized = await verifyAdminAuth(context);
  if (!isAuthorized) {
    return unauthorizedResponse();
  }

  try {
    const formData = await context.request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'uploads';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // SECURITY: Validate file type (don't trust client)
    if (!validateMimeType(file.type)) {
      return new Response(
        JSON.stringify({
          error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate file size
    if (!validateFileSize(file.size)) {
      return new Response(
        JSON.stringify({
          error: `File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate safe filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${timestamp}-${randomStr}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { data, error } = await supabaseAdmin.storage
      .from('images')
      .upload(fileName, uint8Array, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      return new Response(JSON.stringify({ error: 'Upload failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('images')
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        success: true,
        url: urlData.publicUrl,
        path: fileName
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

---

## Priority 6: Remove Console Statements

Search and remove all console.log/error/warn:

```bash
# Find all console statements
grep -r "console\." src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"

# Development-only logging
if (import.meta.env.DEV) {
  console.error('Error:', error);
}
```

---

## Testing Checklist

After applying fixes:

- [ ] Build succeeds: `pnpm build`
- [ ] Lint passes: `pnpm lint`
- [ ] No console errors in production build
- [ ] Authentication required for admin endpoints
- [ ] File upload validates file types
- [ ] No hardcoded credentials in source
- [ ] .env not in git history
- [ ] Security headers present in response
- [ ] RLS policies working in Supabase
- [ ] Manual testing of admin features

---

## Verification Commands

```bash
# Check for hardcoded credentials
grep -r "eyJhbGciOi" src/

# Check for console statements
grep -r "console\." src/ | grep -v "if (import.meta.env.DEV)"

# Check for exposed env variables
grep -r "PUBLIC_" src/ | grep -v "import.meta.env"

# Verify no .env in git
git ls-files | grep ".env"

# Check for authentication in API routes
grep -r "verifyAdminAuth" src/pages/api/
```

---

## Deployment Verification

Before deploying to production:

1. Rotate Supabase credentials
2. Deploy code with security fixes
3. Verify environment variables set in Vercel
4. Test authentication on admin endpoints
5. Check Vercel response headers
6. Monitor logs for errors

---

## Ongoing Security

1. Enable Vercel Security Monitoring
2. Set up Dependabot for dependency updates
3. Schedule monthly security audits
4. Monitor Supabase audit logs
5. Keep dependencies updated
6. Review production logs weekly

