# Scaling Plan

Current deployable units:

1. `src/frontend` - Next.js frontend
2. `src/backend` - NestJS backend

Future backend module extraction can split the NestJS API by domain:

1. API gateway
2. Members and tiers
3. Points
4. Campaigns and segments
5. Communications
6. Partners
7. Rewards

Public HTTP contracts should stay stable while internal modules are extracted.
