# SYSTEM-3-Revise

Local loyalty platform for System 3.

## Windows QA Setup From ZIP

This project can run locally without Supabase keys. When keys are missing, the app and services use the local/demo runtime store in `.runtime/api-store.json`.

Use PowerShell from the project root:

```powershell
npm run setup:local
npm run local
npm run qa
```

Open the app with:

```text
http://127.0.0.1:3000/admin/settings
```

Use `127.0.0.1`, not `localhost`, for local QA and Postman. If Chrome shows `chrome-error://chromewebdata`, the local server is not running yet. Run `npm run local` again and verify ports `3000`, `4000`, `4001`, and `4002` are listening.

Postman local gateway base URL:

```text
http://127.0.0.1:4000
```

Real Supabase persistence is optional for QA. To test against Supabase, copy `.env.example` to `.env.local` and fill in the real project values.
