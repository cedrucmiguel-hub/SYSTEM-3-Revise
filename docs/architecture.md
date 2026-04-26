# System 3 Architecture

## Required Structure

```text
src/frontend -> Next.js React TypeScript UI
src/backend  -> NestJS TypeScript API
supabase     -> migrations and seeds
postman      -> backend API validation
```

## Runtime

```text
Browser
  -> Next.js frontend on port 3000
  -> NestJS backend on port 4000
  -> Supabase or backend local-runtime fallback
```

The frontend is UI-only. It does not own backend handlers, API route folders, server modules, or service-role database access.

The backend owns all API behavior through NestJS controllers, services, and modules.

## Backend Modules

- health
- points
- members
- tiers
- campaigns
- segments
- purchases
- tasks
- referrals
- communications
- partners
- rewards
- supabase
- local-runtime

## Data Modes

- Supabase mode uses service-role credentials on the backend only.
- Local demo mode uses backend local-runtime fallback data.
- Email and SMS default to demo providers unless real provider credentials are configured.
