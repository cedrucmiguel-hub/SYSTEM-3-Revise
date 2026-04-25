# System 3 Architecture

## Development

The frontend and backend are separated.

```text
apps/frontend (:3000)
  -> HTTP via NEXT_PUBLIC_API_BASE_URL
services/backend-nest (:4000)
  -> domain modules
  -> Supabase or local_runtime fallback
```

The frontend is UI-only. It must not contain a Next API route folder or backend handler modules.

## Backend Modules

The NestJS backend owns these domains:

- health
- points
- members
- tiers
- campaigns
- segments
- purchases
- tasks
- communications
- referrals
- partners
- rewards

## Legacy Services

These remain for compatibility while NestJS is the primary backend:

- `services/gateway`
- `services/campaign-service`
- `services/points-engine`

## Data Modes

- `local_runtime`: deterministic file-backed data for local/demo use
- `demo`: fake email/SMS delivery logged to outbox
- `supabase`: real persistence when configured

## API Bases

- Frontend: `http://localhost:3000`
- Backend/Postman: `http://localhost:4000`
