# System 3 Loyalty Platform

System 3 is a separated frontend/backend TypeScript monorepo.

## Tech Stack

Frontend:
- Language: React / TypeScript
- Framework: Next.js

Backend:
- Language: TypeScript
- Framework: NestJS
- JavaScript backend runtime files are not used

## Repository Layout

```text
/
  postman/
    System3.postman_collection.json
    System3.postman_environment.json
  src/
    backend/      NestJS API backend
    frontend/     Next.js UI frontend
  supabase/
    migrations/
    seeds/
  Dockerfile.backend
  Dockerfile.frontend
  docker-compose.yml
```

## Local Development

Install dependencies:

```powershell
npm install
```

Build both apps:

```powershell
npm run build:backend
npm run build:frontend
```

Run backend:

```powershell
npm run dev:backend
```

Run frontend in another terminal:

```powershell
npm run dev:frontend
```

Open:

```text
http://localhost:3000
```

Backend API:

```text
http://localhost:4000
```

## Environment

Frontend uses:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Backend uses:

```env
PORT=4000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EMAIL_PROVIDER=demo
SMS_PROVIDER=demo
```

## API Validation

Postman validates the NestJS backend directly:

```text
baseUrl=http://localhost:4000
```

Do not use `http://localhost:3000/api`.
