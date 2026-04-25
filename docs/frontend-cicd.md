# Frontend CI/CD

The external CI/CD system should deploy only the frontend package.

## Working Directory

```text
apps/frontend
```

## Install and Build

```powershell
npm install
npm run build
```

## Start Command

```powershell
npm run start
```

## Required Environment

The frontend must know where the backend is deployed:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend.example.com
NEXT_PUBLIC_ENABLE_DEMO_AUTH=true
NEXT_PUBLIC_FORCE_CUSTOMER_DEMO_AUTH=false
```

Optional Supabase public values, if frontend auth requires them:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PROJECT_ID=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Backend Dependency

The frontend artifact does not include API route logic. Backend APIs are served by `services/backend-nest` and must be deployed separately for a fully connected environment.

Postman should test the backend directly:

```text
http://localhost:4000
```
