# Frontend CI/CD

The frontend deployment unit is:

```text
src/frontend
```

## Build

```powershell
cd src/frontend
npm install
npm run build
```

## Start

```powershell
npm run start
```

## Required Environment

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend-host.example.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PROJECT_ID=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

The backend is deployed separately from `src/backend`.
