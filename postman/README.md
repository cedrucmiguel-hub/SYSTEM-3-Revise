# System 3 Postman Setup

Import these two files into Postman:

1. `system-3-local.postman_environment.json`
2. `system-3-api.postman_collection.json`

Select the `System 3 Loyalty Local` environment in the top-right environment dropdown.

For local testing, keep:

```text
baseUrl = http://localhost:3000
```

For deployed testing, replace `baseUrl` with the deployed Next app domain, for example:

```text
baseUrl = https://your-loyalty-app.vercel.app
```

Do not use the Supabase project URL as `baseUrl`. Supabase is only the database/auth backend; these API routes live in the Next app.

Start the app before testing:

```powershell
npm run dev
```

Then run `00 Health / Health Check` first. If it returns `ok: true`, continue with `01 Points Service / Award Points - No Body Params`.

`Award Points - No Body Params` and `Transaction Completed Event` generate a fresh `transactionRef` before every send. This is required because duplicate POS references are intentionally ignored by the API.
