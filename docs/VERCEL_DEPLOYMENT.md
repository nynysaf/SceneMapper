# Vercel Deployment

Scene Mapper is structured for deployment on Vercel. Next.js runs as the framework; API routes under `app/api/` are deployed as serverless functions.

## Structure

```
app/
├── api/                    # Serverless API (Vercel serverless functions)
│   ├── maps/
│   │   ├── route.ts        # GET /api/maps, POST /api/maps
│   │   └── [slug]/
│   │       ├── route.ts    # GET /api/maps/:slug
│   │       └── nodes/
│   │           └── route.ts # GET/PUT /api/maps/:slug/nodes
│   ├── users/
│   │   └── route.ts        # GET/POST /api/users
│   └── auth/
│       ├── session/
│       │   └── route.ts    # GET /api/auth/session
│       ├── login/
│       │   └── route.ts    # POST /api/auth/login
│       └── logout/
│           └── route.ts    # POST /api/auth/logout
├── dashboard/
├── maps/
├── layout.tsx
├── page.tsx
└── globals.css
```

- Each `route.ts` file exports HTTP method handlers (`GET`, `POST`, `PUT`, etc.). Vercel turns these into serverless functions.
- Dynamic segments use `[slug]` folders; params are available via `context.params` (Promise in Next.js 15+).

## Deploy

1. **Connect repo**
   - In [Vercel](https://vercel.com), import your Git repository.
   - Vercel will detect Next.js and use the default build settings.

2. **Environment variables**
   - Add any required env vars in the Vercel project (e.g. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` when you add the backend).
   - Optional: `NEXT_PUBLIC_APP_URL` for the deployed app URL.

3. **Deploy**
   - Push to the connected branch or use the Vercel CLI:
   ```bash
   npx vercel
   ```

## API routes (current state)

The routes under `app/api/` are **stubs**: they return empty or placeholder JSON so the contract is fixed. The app currently uses the client-side data layer (localStorage) and does not call these APIs.

When you add a backend (e.g. Supabase):

1. Implement each route to read/write from the database.
2. Switch the data layer (`lib/data.ts`) to call these APIs when `NEXT_PUBLIC_USE_BACKEND=true` (or always in production).

## Optional: `vercel.json`

A minimal `vercel.json` is included to set `framework: "nextjs"` and build/install commands. You can remove it; Vercel will still detect Next.js from `package.json` and the `app/` directory.
