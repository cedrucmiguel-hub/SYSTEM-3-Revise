# System 3 Loyalty Platform

System 3 is organized as a separated monorepo. The frontend is UI-only. All API and backend behavior lives in the NestJS backend.

## Repository Layout

```text
/
  apps/
    frontend/                 Next.js UI only
  services/
    backend-nest/             NestJS API backend
    gateway/                  Legacy Fastify gateway
    campaign-service/         Legacy campaign service
    points-engine/            Legacy points engine
  packages/
    shared/                   Shared types/utilities placeholder
  supabase/
    migrations/               Idempotent SQL migrations
    seeds/                    Seed SQL files
  scripts/                    Root QA and smoke-test scripts
  docs/                       Architecture and CI/CD docs
  docker/                     Optional production Docker files
  postman/                    Postman collection and environment
```

## Frontend

The frontend lives in `apps/frontend`. It does not contain Next.js API routes.

```powershell
cd apps/frontend
npm install
npm run dev
```

Set the backend URL:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Open:

```text
http://localhost:3000
```

## Backend

The NestJS backend lives in `services/backend-nest` and owns all APIs.

```powershell
npm run setup:backend
npm run build:backend
npm run dev:backend
```

Backend base URL:

```text
http://localhost:4000
```

## Root Commands

```powershell
npm run dev:frontend
npm run dev:backend
npm run build:frontend
npm run build:backend
npm run build:all
npm run health
npm run test:api
```

## Supabase

SQL migrations are in `supabase/migrations`. They are idempotent and safe to run manually in Supabase SQL Editor.

## Postman

Postman validates the backend directly:

```text
baseUrl = http://127.0.0.1:4000
```

## CI/CD

Frontend CI/CD should use `apps/frontend` as the working directory.

Backend CI/CD should use `services/backend-nest` as the working directory.

See `docs/frontend-cicd.md` for the frontend deployment contract.
