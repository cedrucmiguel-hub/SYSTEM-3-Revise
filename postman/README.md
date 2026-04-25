# System 3 Postman Setup

Import these two files into Postman:

1. `system-3-local.postman_environment.json`
2. `system-3-api.postman_collection.json`

Select the `System 3 Loyalty Local` environment in the top-right environment dropdown.

Use the NestJS backend as the API base:

```text
baseUrl = http://127.0.0.1:4000
```

Do not use the frontend URL or Supabase project URL as `baseUrl`. The frontend is UI-only, and Supabase is only the database/auth platform.

Start the backend before testing:

```powershell
npm run build:backend
npm run dev:backend
```

Then run `00 Health / Health Check` first. If it returns `ok: true`, continue with the rest of the collection.

`Award Points - No Body Params` and `Transaction Completed Event` generate a fresh `transactionRef` before every send. This is required because duplicate POS references are intentionally ignored by the API.
