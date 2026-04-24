import { z } from "zod";
import { createApiHandler } from "./route-utils";
import { HttpError } from "./http-error";
import { awardLocalPoints } from "./local-points";
import { listLocalNotifications, queueLocalMemberNotification } from "./local-notifications";
import { listLocalSegments } from "./local-segments";
import { listLocalCampaigns } from "./local-campaigns";
import { updateApiState, withApiState } from "./local-store";
import { loadPartnerSettlement, markPartnerSettlementPaid } from "./partner-service";
import { buildSimplePdf } from "./pdf";

const booleanFromString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return value;
}, z.boolean());

const purchaseSchema = z.object({
  memberId: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).optional(),
  receiptReference: z.string().trim().min(1).max(120),
  amount: z.coerce.number().min(0.01).max(10_000_000),
  date: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(80),
  notes: z.string().trim().max(500).optional(),
}).strict();

const segmentPatchSchema = z.object({
  segment: z.string().trim().min(1).max(80),
}).strict();

const tierRulesSchema = z.object({
  tiers: z.array(z.object({
    tier_label: z.string().trim().min(1).max(80),
    min_points: z.coerce.number().min(0).max(1_000_000),
    is_active: booleanFromString.optional(),
  }).strict()).optional(),
  earningRules: z.array(z.object({
    tier_label: z.string().trim().min(1).max(80),
    peso_per_point: z.coerce.number().min(0.01).max(10_000),
    multiplier: z.coerce.number().min(0.01).max(20),
    is_active: booleanFromString.optional(),
  }).strict()).optional(),
}).strict();

const taskStartSchema = z.object({
  memberId: z.string().trim().min(1).max(80),
}).strict();

const taskSubmitSchema = z.object({
  memberId: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254).optional(),
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(300).optional(),
  type: z.enum(["survey", "task"]).optional(),
  points: z.coerce.number().int().min(1).max(10_000).optional(),
  requiredFields: z.array(z.string().trim().min(1).max(80)).optional(),
  answers: z.record(z.string(), z.string()).default({}),
}).strict();

const referralSchema = z.object({
  memberId: z.string().trim().min(1).max(80),
  recipientEmail: z.string().trim().email().max(254),
  referralLink: z.string().trim().max(500).optional(),
}).strict();

function nowIso() {
  return new Date().toISOString();
}

function memberIdFromReq(req: { query: Record<string, unknown> }) {
  const raw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const memberId = String(raw || "").trim();
  if (!memberId) throw new HttpError(400, "Member ID is required.");
  return memberId;
}

function rewardIdFromReq(req: { query: Record<string, unknown> }) {
  const raw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const rewardId = String(raw || "").trim();
  if (!rewardId) throw new HttpError(400, "Reward ID is required.");
  return rewardId;
}

function taskIdFromReq(req: { query: Record<string, unknown> }) {
  const raw = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const taskId = String(raw || "").trim();
  if (!taskId) throw new HttpError(400, "Task ID is required.");
  return taskId;
}

function resolveTier(points: number, rules: Array<{ tier_label: string; min_points: number; is_active: boolean }>) {
  const ordered = [...rules]
    .filter((rule) => rule.is_active !== false)
    .sort((left, right) => Number(right.min_points || 0) - Number(left.min_points || 0));
  return ordered.find((rule) => points >= Number(rule.min_points || 0))?.tier_label || "Bronze";
}

function loyaltyMode() {
  return process.env.USE_EMBEDDED_BACKEND !== "false" ? "embedded" : "proxy";
}

export const embeddedHealthHandler = createApiHandler({
  route: "/api/health",
  methods: ["GET"] as const,
  handler: async () => ({
    ok: true as const,
    service: "next-embedded-api",
    mode: loyaltyMode(),
    backendUrl:
      process.env.USE_EMBEDDED_BACKEND === "false"
        ? process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.GATEWAY_URL || null
        : null,
    timestamp: nowIso(),
  }),
});

export const embeddedMembersHandler = createApiHandler({
  route: "/api/members",
  methods: ["GET"] as const,
  handler: async () => {
    const state = await withApiState((value) => value);
    const segments = await listLocalSegments();
    const members = Object.values(state.members)
      .map((member) => {
        const pointState = state.pointMembers[member.memberId];
        const segment = segments.find((row) => (row.memberIds || []).includes(member.memberId));
        return {
          ...member,
          email: member.email || pointState?.email || "Not provided",
          mobile: member.mobile || "Not provided",
          memberSince: member.memberSince || nowIso(),
          tier: pointState?.tier || member.tier || "Bronze",
          points: Number(pointState?.pointsBalance ?? member.points ?? 0),
          lifetimePoints: Number(member.lifetimePoints ?? pointState?.pointsBalance ?? 0),
          segment: segment?.name || member.segment || "Active",
        };
      })
      .sort((left, right) => left.memberNumber.localeCompare(right.memberNumber));

    return {
      ok: true as const,
      members,
      count: members.length,
      mode: "embedded",
    };
  },
});

export const embeddedMemberSegmentHandler = createApiHandler({
  route: "/api/members/:id/segment",
  methods: ["PATCH"] as const,
  schema: segmentPatchSchema,
  handler: async ({ body, req }) => {
    const memberId = memberIdFromReq(req);
    return updateApiState((state) => {
      const member = state.members[memberId];
      if (!member) throw new HttpError(404, "Member not found.");
      member.segment = body.segment;
      return {
        ok: true as const,
        memberId,
        segment: body.segment,
        mode: "embedded",
      };
    });
  },
});

export const embeddedTierRulesHandler = createApiHandler({
  route: "/api/tiers/rules",
  methods: ["GET", "PATCH"] as const,
  schema: tierRulesSchema.optional(),
  handler: async ({ req, body }) => {
    if ((req.method || "GET").toUpperCase() === "GET") {
      const state = await withApiState((value) => value);
      return {
        ok: true as const,
        tiers: state.tierRules,
        earningRules: state.earningRules,
        mode: "embedded",
      };
    }

    return updateApiState((state) => {
      if (body?.tiers?.length) {
        state.tierRules = [...body.tiers]
          .map((rule) => ({
            tier_label: String(rule.tier_label),
            min_points: Math.max(0, Math.floor(Number(rule.min_points || 0))),
            is_active: rule.is_active !== false,
          }))
          .sort((left, right) => right.min_points - left.min_points);
      }

      if (body?.earningRules?.length) {
        state.earningRules = body.earningRules.map((rule) => ({
          tier_label: String(rule.tier_label),
          peso_per_point: Math.max(0.01, Number(rule.peso_per_point || 10)),
          multiplier: Math.max(0.01, Number(rule.multiplier || 1)),
          is_active: rule.is_active !== false,
        }));
      }

      return {
        ok: true as const,
        tiers: state.tierRules,
        earningRules: state.earningRules,
        mode: "embedded",
      };
    });
  },
});

export const embeddedTierRecalculateHandler = createApiHandler({
  route: "/api/tiers/recalculate",
  methods: ["POST"] as const,
  handler: async () =>
    updateApiState((state) => {
      let updatedMembers = 0;
      for (const [memberId, member] of Object.entries(state.members)) {
        const pointState = state.pointMembers[memberId];
        const points = Number(pointState?.pointsBalance ?? member.points ?? 0);
        const tier = resolveTier(points, state.tierRules);
        member.tier = tier;
        member.points = points;
        member.segment = member.segment || (points >= 500 ? "High Value" : "Active");
        if (pointState) {
          pointState.tier = tier;
          pointState.pointsBalance = points;
        }
        updatedMembers += 1;
      }
      return { ok: true as const, updatedMembers, mode: "embedded" };
    }),
});

export const embeddedPurchasesHandler = createApiHandler({
  route: "/api/purchases",
  methods: ["GET", "POST"] as const,
  schema: purchaseSchema.optional(),
  parseBodyFromQuery: true,
  handler: async ({ req, body }) => {
    if ((req.method || "GET").toUpperCase() === "GET") {
      const memberId = typeof req.query.memberId === "string" ? req.query.memberId.trim() : "";
      const purchases = await withApiState((state) =>
        state.purchases
          .filter((purchase) => !memberId || purchase.memberId === memberId)
          .sort((left, right) => String(right.date).localeCompare(String(left.date))),
      );
      return { ok: true as const, purchases, mode: "embedded" };
    }

    if (!body) throw new HttpError(400, "Purchase payload is required.");
    const duplicatePurchase = await withApiState((state) =>
      state.purchases.find(
        (purchase) =>
          purchase.memberId === body.memberId &&
          purchase.receiptReference.toLowerCase() === body.receiptReference.toLowerCase(),
      ) || null,
    );
    if (duplicatePurchase) throw new HttpError(409, "Purchase reference already recorded.");

    const award = await awardLocalPoints(
      {
        memberIdentifier: body.memberId,
        fallbackEmail: body.email,
        points: 0,
        transactionType: "PURCHASE",
        reason: `Recorded purchase ${body.receiptReference}`,
        amountSpent: Number(body.amount),
        productCategory: body.category,
      },
      body.receiptReference,
    );

    return updateApiState((state) => {
      const duplicate = state.purchases.find(
        (purchase) =>
          purchase.memberId === body.memberId &&
          purchase.receiptReference.toLowerCase() === body.receiptReference.toLowerCase(),
      );
      if (duplicate) throw new HttpError(409, "Purchase reference already recorded.");

      const purchase = {
        id: `purchase-${Date.now()}`,
        memberId: body.memberId,
        receiptReference: body.receiptReference,
        amount: Number(body.amount),
        date: body.date,
        category: body.category,
        notes: body.notes || null,
        pointsAwarded: award.pointsAwarded,
        createdAt: nowIso(),
      };
      state.purchases.unshift(purchase);
      return { ok: true as const, purchase, award, mode: "embedded" };
    });
  },
});

export const embeddedTasksHandler = createApiHandler({
  route: "/api/tasks",
  methods: ["GET"] as const,
  handler: async ({ req }) => {
    const memberId = typeof req.query.memberId === "string" ? req.query.memberId.trim() : "";
    const tasks = await withApiState((state) =>
      state.tasks.map((task) => {
        const progress = state.taskProgress.find((row) => row.taskId === task.id && row.memberId === memberId);
        return {
          ...task,
          memberStatus: progress?.status || "available",
        };
      }),
    );
    return { ok: true as const, tasks, mode: "embedded" };
  },
});

export const embeddedTaskStartHandler = createApiHandler({
  route: "/api/tasks/:id/start",
  methods: ["POST"] as const,
  schema: taskStartSchema,
  parseBodyFromQuery: true,
  handler: async ({ req, body }) =>
    updateApiState((state) => {
      const taskId = taskIdFromReq(req);
      const task = state.tasks.find((row) => row.id === taskId);
      if (!task) throw new HttpError(404, "Task not found.");
      const existing = state.taskProgress.find((row) => row.taskId === taskId && row.memberId === body.memberId);
      if (existing?.status === "completed" || existing?.status === "already_claimed") {
        return { ok: true as const, taskId, memberId: body.memberId, status: "already_claimed", mode: "embedded" };
      }
      if (existing) {
        existing.status = "in_progress";
        existing.startedAt = existing.startedAt || nowIso();
      } else {
        state.taskProgress.push({
          taskId,
          memberId: body.memberId,
          status: "in_progress",
          startedAt: nowIso(),
        });
      }
      return { ok: true as const, taskId, memberId: body.memberId, status: "in_progress", mode: "embedded" };
    }),
});

export const embeddedTaskSubmitHandler = createApiHandler({
  route: "/api/tasks/:id/submit",
  methods: ["POST"] as const,
  schema: taskSubmitSchema,
  parseBodyFromQuery: true,
  handler: async ({ req, body }) => {
    const taskId = taskIdFromReq(req);
    const taskSnapshot = await withApiState((state) => state.tasks.find((row) => row.id === taskId) || null);
    const taskTemplate = taskSnapshot || {
      id: taskId,
      title: body.title || "Task",
      description: body.description || "Dynamic embedded task",
      type: body.type || "survey",
      status: "available" as const,
      points: Number(body.points || 50),
      oncePerMember: true,
      requiredFields: body.requiredFields || ["rating", "feedback"],
    };

    for (const field of taskTemplate.requiredFields) {
      if (!String(body.answers?.[field] || "").trim()) {
        throw new HttpError(400, `Missing required field: ${field}`);
      }
    }

    const existingProgress = await withApiState((state) =>
      state.taskProgress.find((row) => row.taskId === taskId && row.memberId === body.memberId) || null,
    );
    if (taskTemplate.oncePerMember && (existingProgress?.status === "completed" || existingProgress?.status === "already_claimed")) {
      throw new HttpError(409, "Task already claimed.");
    }

    const award = await awardLocalPoints(
      {
        memberIdentifier: body.memberId,
        fallbackEmail: body.email,
        points: taskTemplate.points,
        transactionType: "EARN",
        reason: `Task completed (${taskTemplate.id}): ${taskTemplate.title}`,
      },
      `task-${taskTemplate.id}-${body.memberId}`,
    );

    return updateApiState((state) => {
      const taskId = taskIdFromReq(req);
      let task = state.tasks.find((row) => row.id === taskId);
      if (!task) {
        task = {
          id: taskId,
          title: body.title || "Task",
          description: body.description || "Dynamic embedded task",
          type: body.type || "survey",
          status: "available",
          points: Number(body.points || 50),
          oncePerMember: true,
          requiredFields: body.requiredFields || ["rating", "feedback"],
        };
        state.tasks.push(task);
      }
      const existing = state.taskProgress.find((row) => row.taskId === taskId && row.memberId === body.memberId);

      if (existing) {
        existing.status = "completed";
        existing.answers = body.answers;
        existing.submittedAt = nowIso();
      } else {
        state.taskProgress.push({
          taskId,
          memberId: body.memberId,
          status: "completed",
          startedAt: nowIso(),
          submittedAt: nowIso(),
          answers: body.answers,
        });
      }

      if (task.type === "survey" && state.members[body.memberId]) {
        state.members[body.memberId].surveysCompleted = Number(state.members[body.memberId].surveysCompleted || 0) + 1;
      }

      return { ok: true as const, taskId, memberId: body.memberId, status: "completed", award, mode: "embedded" };
    });
  },
});

export const embeddedReferralsHandler = createApiHandler({
  route: "/api/referrals",
  methods: ["GET", "POST"] as const,
  schema: referralSchema.optional(),
  parseBodyFromQuery: true,
  handler: async ({ req, body }) => {
    if ((req.method || "GET").toUpperCase() === "GET") {
      const memberId = typeof req.query.memberId === "string" ? req.query.memberId.trim() : "";
      const referrals = await withApiState((state) =>
        state.referrals
          .filter((item) => !memberId || item.memberId === memberId)
          .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))),
      );
      return { ok: true as const, referrals, mode: "embedded" };
    }

    if (!body) throw new HttpError(400, "Referral payload is required.");
    const existingReferral = await withApiState((state) =>
      state.referrals.find(
        (row) =>
          row.memberId === body.memberId &&
          row.recipientEmail.toLowerCase() === body.recipientEmail.toLowerCase(),
      ) || null,
    );
    if (existingReferral) throw new HttpError(409, "Referral already created for this email.");
    const referralCode = `${body.memberId.replace(/[^A-Z0-9]/gi, "").slice(-6)}-${Date.now().toString().slice(-4)}`.toUpperCase();
    const referral = {
      id: `ref-${Date.now()}`,
      memberId: body.memberId,
      referralCode,
      recipientEmail: body.recipientEmail,
      referralLink: body.referralLink || `/register?ref=${encodeURIComponent(referralCode)}`,
      status: "pending" as const,
      createdAt: nowIso(),
    };

    await queueLocalMemberNotification({
      memberId: body.memberId,
      channel: "email",
      subject: "Referral invitation",
      message: `Referral prepared for ${body.recipientEmail}: ${referral.referralLink}`,
      isTransactional: false,
    });

    return updateApiState((state) => {
      const duplicate = state.referrals.find(
        (row) =>
          row.memberId === body.memberId &&
          row.recipientEmail.toLowerCase() === body.recipientEmail.toLowerCase(),
      );
      if (duplicate) throw new HttpError(409, "Referral already created for this email.");
      state.referrals.unshift(referral);
      return { ok: true as const, referral, mode: "demo" };
    });
  },
});

export const embeddedCommunicationsOutboxHandler = createApiHandler({
  route: "/api/communications/outbox",
  methods: ["GET"] as const,
  handler: async ({ req }) => {
    const limit = typeof req.query.limit === "string" ? Math.min(100, Math.max(1, Number(req.query.limit) || 50)) : 50;
    const outbox = await withApiState((state) =>
      state.notifications
        .slice()
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, limit),
    );
    return {
      ok: true as const,
      outbox: outbox.map((item) => ({
        id: item.id,
        type: item.channel === "email" ? "email" : item.channel === "sms" ? "sms" : "notification",
        channel: item.channel,
        recipient: item.memberId,
        subject: item.subject || null,
        message: item.message,
        status: item.status,
        mode: "demo",
        createdAt: item.createdAt,
      })),
      mode: "demo",
    };
  },
});

export const embeddedRewardsHandler = createApiHandler({
  route: "/api/rewards",
  methods: ["GET"] as const,
  handler: async () => {
    const rewards = await withApiState((state) => state.rewards.filter((reward) => reward.is_active !== false));
    return { ok: true as const, rewards, mode: "embedded" };
  },
});

export const embeddedRewardByIdHandler = createApiHandler({
  route: "/api/rewards/:id",
  methods: ["GET"] as const,
  handler: async ({ req }) => {
    const rewardId = rewardIdFromReq(req);
    const reward = await withApiState((state) =>
      state.rewards.find((item) => item.id === rewardId || item.reward_id === rewardId) || null,
    );
    if (!reward) throw new HttpError(404, "Reward not found.");
    return { ok: true as const, reward, mode: "embedded" };
  },
});

export const embeddedPartnerSettlementPaidByIdHandler = createApiHandler({
  route: "/api/partners/settlements/:id/paid",
  methods: ["PATCH"] as const,
  handler: async ({ req }) => {
    const settlementId = rewardIdFromReq(req);
    const settlement = await loadPartnerSettlement(settlementId);
    if (!settlement) throw new HttpError(404, "Settlement not found.");
    return {
      ok: true as const,
      settlement: await markPartnerSettlementPaid({
        partnerId: settlement.partnerId,
        month: settlement.month,
      }),
      mode: "embedded",
    };
  },
});

export const embeddedPartnerSettlementPdfByIdHandler = createApiHandler({
  route: "/api/partners/settlements/:id/pdf",
  methods: ["GET"] as const,
  handler: async ({ req, res }) => {
    const settlementId = rewardIdFromReq(req);
    const settlement = await loadPartnerSettlement(settlementId);
    if (!settlement) throw new HttpError(404, "Settlement not found.");
    const pdf = buildSimplePdf([
      "System 3 Partner Settlement",
      `Settlement ID: ${settlement.id}`,
      `Partner: ${settlement.partnerName} (${settlement.partnerCode})`,
      `Month: ${settlement.month}`,
      `Status: ${settlement.status}`,
      `Transactions: ${settlement.totalTransactions}`,
      `Points: ${settlement.totalPoints}`,
      `Gross Amount: PHP ${settlement.totalGrossAmount.toFixed(2)}`,
      `Commission: PHP ${settlement.commissionAmount.toFixed(2)}`,
    ]);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"partner-settlement-${settlement.id}.pdf\"`);
    res.status(200).send(pdf);
  },
});

export const embeddedSnapshotHandler = createApiHandler({
  route: "/api/internal/embedded-snapshot",
  methods: ["GET"] as const,
  handler: async () => {
    const [segments, campaigns, notifications, state] = await Promise.all([
      listLocalSegments(),
      listLocalCampaigns(),
      listLocalNotifications({ limit: 20 }),
      withApiState((value) => value),
    ]);
    return {
      ok: true as const,
      members: Object.values(state.members).length,
      segments: segments.length,
      campaigns: campaigns.length,
      notifications: notifications.length,
      mode: "embedded",
    };
  },
});
