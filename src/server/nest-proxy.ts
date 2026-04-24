import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import {
  embeddedCommunicationsOutboxHandler,
  embeddedHealthHandler,
  embeddedMemberSegmentHandler,
  embeddedMembersHandler,
  embeddedPartnerSettlementPaidByIdHandler,
  embeddedPartnerSettlementPdfByIdHandler,
  embeddedPurchasesHandler,
  embeddedReferralsHandler,
  embeddedRewardByIdHandler,
  embeddedRewardsHandler,
  embeddedTaskStartHandler,
  embeddedTaskSubmitHandler,
  embeddedTasksHandler,
  embeddedTierRecalculateHandler,
  embeddedTierRulesHandler,
} from "./embedded-api";
import {
  campaignsHandler,
  campaignsListHandler,
  campaignByIdHandler,
  campaignBudgetStatusHandler,
  campaignPerformanceHandler,
  activeCampaignsHandler,
  publishCampaignHandler,
} from "./campaign-api";
import { communicationsAnalyticsHandler, communicationsEmailHandler, unsubscribeHandler } from "./communication-api";
import {
  memberNotificationsHandler,
  memberPointsHandler,
  memberPointsHistoryHandler,
  memberPreferencesHandler,
  memberProfileHandler,
  memberTierHandler,
} from "./member-api";
import { notificationsHandler, triggerSmsHandler, markNotificationReadHandler } from "./notification-api";
import {
  partnerDashboardByIdHandler,
  partnerDashboardHandler,
  partnerMonthlySettlementHandler,
  partnerMonthlySettlementPdfHandler,
  partnerSettlementPaidHandler,
  partnerSettlementPdfHandler,
  partnerSettlementsHandler,
  partnerTransactionsHandler,
} from "./partner-api";
import { awardPointsHandler, redeemPointsHandler, pointsTiersHandler, transactionCompletedHandler } from "./points-api";
import { segmentsHandler, previewSegmentHandler } from "./segment-api";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function backendBaseUrl() {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.GATEWAY_URL ||
    process.env.NEXT_PUBLIC_GATEWAY_URL ||
    "http://localhost:4000"
  ).replace(/\/+$/, "");
}

function useEmbeddedBackend() {
  return process.env.USE_EMBEDDED_BACKEND !== "false";
}

function querySuffix(req: NextApiRequest) {
  const raw = String(req.url || "");
  const queryIndex = raw.indexOf("?");
  return queryIndex >= 0 ? raw.slice(queryIndex) : "";
}

function requestBody(req: NextApiRequest): BodyInit | undefined {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  if (req.body === undefined || req.body === null) return undefined;
  if (typeof req.body === "string" || Buffer.isBuffer(req.body)) return req.body as BodyInit;
  return JSON.stringify(req.body);
}

function requestHeaders(req: NextApiRequest) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || HOP_BY_HOP_HEADERS.has(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  if (!headers.has("content-type") && req.body && req.method !== "GET" && req.method !== "HEAD") {
    headers.set("content-type", "application/json");
  }
  return headers;
}

async function proxyToNest(
  req: NextApiRequest,
  res: NextApiResponse,
  targetPath: string,
  options?: { binary?: boolean },
) {
  if (useEmbeddedBackend()) {
    const handler = resolveEmbeddedHandler(req, targetPath);
    if (handler) {
      await handler(req, res);
      return;
    }

    res.status(501).json({
      ok: false,
      error: `Embedded backend route is not implemented for ${targetPath}.`,
      mode: "embedded",
    });
    return;
  }

  const target = `${backendBaseUrl()}${targetPath}${querySuffix(req)}`;
  try {
    const upstream = await fetch(target, {
      method: req.method || "GET",
      headers: requestHeaders(req),
      body: requestBody(req),
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
      res.setHeader(key, value);
    });

    if (options?.binary) {
      res.send(Buffer.from(await upstream.arrayBuffer()));
      return;
    }

    res.send(await upstream.text());
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to reach backend service.",
      target,
    });
  }
}

function resolveEmbeddedHandler(req: NextApiRequest, targetPath: string): NextApiHandler | null {
  if (targetPath === "/health") return embeddedHealthHandler;
  if (targetPath === "/points/award") return awardPointsHandler;
  if (targetPath === "/points/redeem") return redeemPointsHandler;
  if (targetPath === "/points/tiers") return pointsTiersHandler;
  if (targetPath === "/events/transaction-completed") return transactionCompletedHandler;
  if (targetPath === "/members") return embeddedMembersHandler;
  if (targetPath === "/tiers/rules") return embeddedTierRulesHandler;
  if (targetPath === "/tiers/recalculate") return embeddedTierRecalculateHandler;
  if (targetPath === "/campaigns") {
    return String(req.method || "GET").toUpperCase() === "POST" ? campaignsHandler : campaignsListHandler;
  }
  if (targetPath === "/campaigns/active") return activeCampaignsHandler;
  if (targetPath === "/campaigns/performance") return campaignPerformanceHandler;
  if (targetPath === "/segments") return segmentsHandler;
  if (targetPath === "/segments/preview") return previewSegmentHandler;
  if (targetPath === "/purchases") return embeddedPurchasesHandler;
  if (targetPath === "/tasks") return embeddedTasksHandler;
  if (targetPath === "/communications/email") return communicationsEmailHandler;
  if (targetPath === "/communications/analytics") return communicationsAnalyticsHandler;
  if (targetPath === "/communications/outbox") return embeddedCommunicationsOutboxHandler;
  if (targetPath === "/notifications") return notificationsHandler;
  if (targetPath === "/notifications/sms") return triggerSmsHandler;
  if (targetPath === "/unsubscribe") return unsubscribeHandler;
  if (targetPath === "/partners/dashboard") return partnerDashboardHandler;
  if (targetPath === "/partners/transactions") return partnerTransactionsHandler;
  if (targetPath === "/partners/settlements") return partnerSettlementsHandler;
  if (targetPath === "/rewards") return embeddedRewardsHandler;
  if (targetPath === "/referrals") return embeddedReferralsHandler;

  let match = targetPath.match(/^\/campaigns\/([^/]+)$/);
  if (match) return campaignByIdHandler;
  match = targetPath.match(/^\/campaigns\/([^/]+)\/publish$/);
  if (match) return publishCampaignHandler;
  match = targetPath.match(/^\/campaigns\/([^/]+)\/budget-status$/);
  if (match) return campaignBudgetStatusHandler;
  match = targetPath.match(/^\/members\/([^/]+)\/points$/);
  if (match) return memberPointsHandler;
  match = targetPath.match(/^\/members\/([^/]+)\/points-history$/);
  if (match) return memberPointsHistoryHandler;
  match = targetPath.match(/^\/members\/([^/]+)\/tier$/);
  if (match) return memberTierHandler;
  match = targetPath.match(/^\/members\/([^/]+)\/profile$/);
  if (match) return memberProfileHandler;
  match = targetPath.match(/^\/members\/([^/]+)\/notifications$/);
  if (match) return memberNotificationsHandler;
  match = targetPath.match(/^\/members\/([^/]+)\/preferences$/);
  if (match) return memberPreferencesHandler;
  match = targetPath.match(/^\/members\/([^/]+)\/segment$/);
  if (match) return embeddedMemberSegmentHandler;
  match = targetPath.match(/^\/tasks\/([^/]+)\/start$/);
  if (match) return embeddedTaskStartHandler;
  match = targetPath.match(/^\/tasks\/([^/]+)\/submit$/);
  if (match) return embeddedTaskSubmitHandler;
  match = targetPath.match(/^\/notifications\/([^/]+)\/read$/);
  if (match) return markNotificationReadHandler;
  match = targetPath.match(/^\/partners\/([^/]+)\/dashboard$/);
  if (match) return partnerDashboardByIdHandler;
  match = targetPath.match(/^\/partners\/([^/]+)\/settlement$/);
  if (match) return partnerMonthlySettlementHandler;
  match = targetPath.match(/^\/partners\/([^/]+)\/settlement\/([^/]+)\/pdf$/);
  if (match) return partnerMonthlySettlementPdfHandler;
  match = targetPath.match(/^\/partners\/([^/]+)\/settlement\/([^/]+)\/paid$/);
  if (match) return partnerSettlementPaidHandler;
  match = targetPath.match(/^\/partners\/settlements\/([^/]+)\/pdf$/);
  if (match) return embeddedPartnerSettlementPdfByIdHandler;
  match = targetPath.match(/^\/partners\/settlements\/([^/]+)\/paid$/);
  if (match) return embeddedPartnerSettlementPaidByIdHandler;
  match = targetPath.match(/^\/rewards\/([^/]+)$/);
  if (match) return embeddedRewardByIdHandler;

  return null;
}

export function createNestProxyHandler(
  pathOrResolver: string | ((req: NextApiRequest) => string),
  options?: { binary?: boolean },
): NextApiHandler {
  return async (req, res) => {
    const path = typeof pathOrResolver === "function" ? pathOrResolver(req) : pathOrResolver;
    await proxyToNest(req, res, path, options);
  };
}
