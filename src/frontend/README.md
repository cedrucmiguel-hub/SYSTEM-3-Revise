# System 3 Frontend

This package is the Next.js UI only. It does not contain backend API routes.

## Run Locally

Start the backend first from the repository root:

```powershell
npm run build:backend
npm run dev:backend
```

Then start the frontend:

```powershell
cd src/frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

All app API requests go to `NEXT_PUBLIC_API_BASE_URL`.

## Build

```powershell
npm run build
```
