async function check(url) {
  const startedAt = Date.now();
  const response = await fetch(url);
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  return {
    url,
    status: response.status,
    durationMs: Date.now() - startedAt,
    body,
  };
}

const targets = ["http://localhost:4000/health"];

const results = [];
for (const target of targets) {
  try {
    results.push(await check(target));
  } catch (error) {
    results.push({
      url: target,
      status: 0,
      durationMs: 0,
      body: { ok: false, error: error instanceof Error ? error.message : String(error) },
    });
  }
}

console.log(JSON.stringify(results, null, 2));
