# Scaling Plan

## Current deployable units

1. `apps/frontend` - Next.js UI only
2. `services/backend-nest` - NestJS API backend

## Target production split

The current NestJS backend is already separated by domain module under `services/backend-nest`. The next production step is to extract modules behind internal service boundaries without changing external contracts.

Suggested service split:

1. `api-gateway`
2. `members-service`
3. `points-service`
4. `campaigns-service`
5. `communications-service`
6. `partners-service`
7. `rewards-service`
8. optional `worker`
9. optional `redis`

## Extraction order

1. Points
2. Campaigns + Segments
3. Communications
4. Partners
5. Rewards
6. Members + Tiers

This order keeps the highest-write workflows isolated first.

## Non-breaking migration rule

- Keep public HTTP contracts stable.
- Reuse DTOs and shared result/error types.
- Move adapters first, then persistence, then transport.
- Keep local runtime available for smoke tests and QA.

## Production dependencies

- Supabase or Postgres
- SMTP/SendGrid/Mailgun for email
- Twilio or equivalent for SMS
- Redis for cache and queues if traffic grows

## Health and readiness

Every extracted service should expose:

- `/health`
- `/ready`
- structured logs
- request timing
- deterministic fallback behavior in non-production only
