async function requestJson(url, init) {
  const startedAt = Date.now();
  const response = await fetch(url, init);
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
    ok: response.ok,
    body,
  };
}

const baseUrl = process.env.BASE_URL || "http://localhost:4000";
const memberId = process.env.MEMBER_ID || "MEM-000011";
const referralEmail = process.env.REFERRAL_EMAIL || "qa-referral@example.com";

const results = [];
results.push(await requestJson(`${baseUrl}/health`));
results.push(await requestJson(`${baseUrl}/segments`));
results.push(await requestJson(`${baseUrl}/members`));
results.push(await requestJson(`${baseUrl}/campaigns`));
results.push(await requestJson(`${baseUrl}/rewards`));
results.push(await requestJson(`${baseUrl}/partners/dashboard`));
results.push(await requestJson(`${baseUrl}/communications/analytics`));
results.push(
  await requestJson(`${baseUrl}/purchases`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": `smoke-purchase-${Date.now()}` },
    body: JSON.stringify({
      memberId,
      email: "soundwave@example.com",
      receiptReference: `SMOKE-${Date.now()}`,
      amount: 245,
      date: new Date().toISOString(),
      category: "Beverage",
      notes: "Smoke test purchase",
    }),
  }),
);
results.push(await requestJson(`${baseUrl}/tasks?memberId=${encodeURIComponent(memberId)}`));
results.push(
  await requestJson(`${baseUrl}/tasks/survey-feedback/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId }),
  }),
);
results.push(
  await requestJson(`${baseUrl}/tasks/survey-feedback/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": `smoke-task-${memberId}` },
    body: JSON.stringify({
      memberId,
      email: "soundwave@example.com",
      answers: {
        rating: "5",
        feedback: "Smoke test feedback",
      },
    }),
  }),
);
results.push(
  await requestJson(`${baseUrl}/tasks/survey-feedback/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": `smoke-task-${memberId}` },
    body: JSON.stringify({
      memberId,
      email: "soundwave@example.com",
      answers: {
        rating: "5",
        feedback: "Duplicate smoke test feedback",
      },
    }),
  }),
);
results.push(
  await requestJson(`${baseUrl}/referrals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      memberId,
      recipientEmail: referralEmail,
    }),
  }),
);
results.push(await requestJson(`${baseUrl}/communications/outbox`));

console.log(JSON.stringify(results, null, 2));
