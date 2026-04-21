import { updateApiState } from "./local-store";

function hasUnresolvedVariable(value: unknown) {
  return typeof value === "string" && (value.includes("{{") || value.includes("}}"));
}

function generatedCampaignId() {
  return `CAMP-${Date.now()}`;
}

function normalizeCampaign(input: any) {
  const rawId = hasUnresolvedVariable(input.id) ? "" : String(input.id || "").trim();
  const rawCode = hasUnresolvedVariable(input.campaignCode) ? "" : String(input.campaignCode || "").trim();
  const id = rawId || rawCode || generatedCampaignId();
  return {
    ...input,
    id,
    campaignCode: rawCode || id,
    campaignName: hasUnresolvedVariable(input.campaignName)
      ? "Campaign"
      : String(input.campaignName || input.name || "Campaign"),
    status: String(input.status || "draft"),
    budgetSpent: Number(input.budgetSpent ?? input.budget_spent ?? 0),
    createdAt: input.createdAt || new Date().toISOString(),
    publishedAt: input.publishedAt ?? null,
  };
}

export async function saveLocalCampaign(input: any) {
  return updateApiState((state) => {
    const campaign = normalizeCampaign(input);
    state.campaigns[campaign.id] = campaign;
    return campaign;
  });
}

export async function listLocalCampaigns() {
  return updateApiState((state) =>
    Object.values(state.campaigns).filter((campaign) => !hasUnresolvedVariable(campaign.id)),
  );
}

export async function getLocalCampaign(id: string) {
  if (hasUnresolvedVariable(id)) return getLatestLocalCampaign();
  return updateApiState((state) => state.campaigns[id] ?? null);
}

export async function getLatestLocalCampaign() {
  return updateApiState((state) => {
    const campaigns = Object.values(state.campaigns)
      .filter((campaign) => !hasUnresolvedVariable(campaign.id))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    return campaigns[0] ?? null;
  });
}

export async function publishLocalCampaign(id: string) {
  return updateApiState((state) => {
    const resolvedId = hasUnresolvedVariable(id)
      ? Object.values(state.campaigns)
          .filter((campaign) => !hasUnresolvedVariable(campaign.id))
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0]?.id
      : id;
    if (!resolvedId) return null;
    const existing = state.campaigns[resolvedId];
    if (!existing) return null;
    const campaign = {
      ...existing,
      status: "active",
      publishedAt: new Date().toISOString(),
    };
    state.campaigns[resolvedId] = campaign;
    return campaign;
  });
}

export function buildLocalBudgetStatus(campaign: any) {
  const budgetLimitRaw = campaign.budgetLimit ?? campaign.budget_limit ?? null;
  const budgetLimit = budgetLimitRaw === null || budgetLimitRaw === undefined ? null : Number(budgetLimitRaw);
  const budgetSpent = Number(campaign.budgetSpent ?? campaign.budget_spent ?? 0);
  return {
    campaignId: campaign.id,
    campaignName: campaign.campaignName,
    status: campaign.status,
    active: campaign.status === "active",
    budgetLimit,
    budgetSpent,
    budgetRemaining: budgetLimit === null ? null : Math.max(0, budgetLimit - budgetSpent),
    utilizationPercent: budgetLimit && budgetLimit > 0 ? Number(Math.min(100, (budgetSpent / budgetLimit) * 100).toFixed(1)) : 0,
    trackedTransactions: 0,
    pointsAwarded: budgetSpent,
    notificationsSent: 0,
    redemptionCount: 0,
    quantityLimit: campaign.flashSaleQuantityLimit ?? null,
    quantityClaimed: 0,
    sellThrough: null,
  };
}
