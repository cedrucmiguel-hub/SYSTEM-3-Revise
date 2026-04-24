import { updateApiState, withApiState } from "./local-store";

type AwardInput = {
  memberIdentifier: string;
  fallbackEmail?: string;
  points: number;
  transactionType: "PURCHASE" | "MANUAL_AWARD" | "EARN";
  reason: string;
  amountSpent?: number;
  productCode?: string;
  productCategory?: string;
};

type RedeemInput = {
  memberIdentifier: string;
  fallbackEmail?: string;
  points: number;
  reason: string;
  transactionType?: "REDEEM" | "GIFT";
  rewardCatalogId?: string | number;
  promotionCampaignId?: string | null;
};

function resolveTier(points: number, rules?: Array<{ tier_label: string; min_points: number; is_active: boolean }>) {
  const activeRules = (rules || [])
    .filter((rule) => rule.is_active !== false)
    .sort((left, right) => Number(right.min_points || 0) - Number(left.min_points || 0));
  for (const rule of activeRules) {
    if (points >= Number(rule.min_points || 0)) {
      return String(rule.tier_label || "Bronze");
    }
  }
  if (points >= 1500) return "Platinum";
  if (points >= 750) return "Gold";
  if (points >= 250) return "Silver";
  return "Bronze";
}

function awardPoints(
  input: AwardInput,
  memberTier: string,
  earningRules?: Array<{ tier_label: string; peso_per_point: number; multiplier: number; is_active: boolean }>,
) {
  if (input.points > 0) return input.points;
  if (input.amountSpent && input.amountSpent > 0) {
    const tierRule =
      earningRules?.find(
        (rule) => rule.is_active !== false && String(rule.tier_label).toLowerCase() === String(memberTier).toLowerCase(),
      ) || null;
    const pesoPerPoint = Math.max(0.01, Number(tierRule?.peso_per_point || 10));
    const multiplier = Math.max(0.01, Number(tierRule?.multiplier || 1));
    return Math.max(1, Math.floor((input.amountSpent / pesoPerPoint) * multiplier));
  }
  return 0;
}

function buildLocalMemberActivityResponse(
  memberId: string,
  existing: {
    memberId: string;
    email: string | null;
    pointsBalance: number;
    tier: string;
    history: Array<{
      id: string;
      type: string;
      points: number;
      reason: string;
      date: string;
      expiry_date: string | null;
      reference: string | null;
    }>;
  },
  memberProfile?: {
    name?: string;
    mobile?: string;
    memberSince?: string;
    birthdate?: string | null;
    address?: string | null;
    surveysCompleted?: number;
    segment?: string;
    status?: "Active" | "Inactive";
  } | null,
  fallbackEmail?: string,
) {
  const [firstName = "Demo", ...lastParts] = String(memberProfile?.name || "Demo Member").trim().split(/\s+/);
  return {
    balance: {
      member_id: memberId,
      points_balance: existing.pointsBalance,
      tier: existing.tier,
    },
    history: existing.history,
    profile: {
      id: memberId,
      member_id: memberId,
      member_number: memberId,
      first_name: firstName,
      last_name: lastParts.join(" ") || "Member",
      email: fallbackEmail ?? existing.email ?? "demo@example.com",
      phone: memberProfile?.mobile ?? null,
      birthdate: memberProfile?.birthdate ?? null,
      points_balance: existing.pointsBalance,
      tier: existing.tier,
      enrollment_date: memberProfile?.memberSince ?? new Date().toISOString(),
      address: memberProfile?.address ?? null,
      surveys_completed: Number(memberProfile?.surveysCompleted || 0),
      effective_segment: memberProfile?.segment ?? "Active",
      status: memberProfile?.status ?? "Active",
    },
  };
}

export async function awardLocalPoints(input: AwardInput, reference?: string) {
  return updateApiState((state) => {
    const memberId = input.memberIdentifier;
    const existing = state.pointMembers[memberId] ?? {
      memberId,
      email: input.fallbackEmail ?? null,
      pointsBalance: 0,
      tier: "Bronze",
      history: [],
    };
    const memberProfile = state.members[memberId];
    const currentTier = memberProfile?.tier || existing.tier || "Bronze";
    const points = awardPoints(input, currentTier, state.earningRules);
    const nextBalance = existing.pointsBalance + points;
    const tx = {
      id: reference || `award-${Date.now()}`,
      type: input.transactionType,
      points,
      reason: input.reason,
      date: new Date().toISOString(),
      expiry_date: null,
      reference: reference ?? null,
      receipt_id: reference ?? null,
      amount_spent: input.amountSpent ?? null,
      product_category: input.productCategory ?? null,
      product_code: input.productCode ?? null,
    };
    const nextTier = resolveTier(nextBalance, state.tierRules);

    state.pointMembers[memberId] = {
      ...existing,
      email: input.fallbackEmail ?? existing.email,
      pointsBalance: nextBalance,
      tier: nextTier,
      history: [tx, ...existing.history],
    };
    state.members[memberId] = {
      id: memberId,
      memberId,
      memberNumber: memberId,
      name: memberProfile?.name || "Demo Member",
      email: input.fallbackEmail ?? memberProfile?.email ?? existing.email ?? "demo@example.com",
      mobile: memberProfile?.mobile || "Not provided",
      memberSince: memberProfile?.memberSince || new Date().toISOString(),
      tier: nextTier,
      points: nextBalance,
      lifetimePoints: Math.max(
        Number(memberProfile?.lifetimePoints || 0),
        Number(memberProfile?.lifetimePoints || 0) + Math.max(points, 0),
      ),
      segment: memberProfile?.segment || (nextBalance >= 500 ? "High Value" : "Active"),
      status: memberProfile?.status || "Active",
      profileImage: memberProfile?.profileImage ?? null,
      birthdate: memberProfile?.birthdate ?? null,
      address: memberProfile?.address ?? null,
      surveysCompleted: Number(memberProfile?.surveysCompleted || 0),
    };

    return {
      memberId,
      pointsAwarded: points,
      newBalance: nextBalance,
      tier: nextTier,
      transaction: tx,
      source: "local_runtime",
    };
  });
}

export async function redeemLocalPoints(input: RedeemInput) {
  return updateApiState((state) => {
    const memberId = input.memberIdentifier;
    const existing = state.pointMembers[memberId] ?? {
      memberId,
      email: input.fallbackEmail ?? null,
      pointsBalance: 0,
      tier: "Bronze",
      history: [],
    };

    if (existing.pointsBalance < input.points) {
      throw new Error("Insufficient points balance.");
    }

    const nextBalance = existing.pointsBalance - input.points;
    const tx = {
      id: `redeem-${Date.now()}`,
      type: input.transactionType ?? "REDEEM",
      points: -Math.abs(input.points),
      reason: input.reason,
      date: new Date().toISOString(),
      expiry_date: null,
      reference: input.rewardCatalogId === undefined ? null : String(input.rewardCatalogId),
    };
    const nextTier = resolveTier(nextBalance, state.tierRules);

    state.pointMembers[memberId] = {
      ...existing,
      email: input.fallbackEmail ?? existing.email,
      pointsBalance: nextBalance,
      tier: nextTier,
      history: [tx, ...existing.history],
    };
    const memberProfile = state.members[memberId];
    if (memberProfile) {
      memberProfile.points = nextBalance;
      memberProfile.tier = nextTier;
    }

    return {
      memberId,
      pointsRedeemed: input.points,
      newBalance: nextBalance,
      tier: nextTier,
      transaction: tx,
      source: "local_runtime",
    };
  });
}

export async function loadLocalMemberActivity(memberId: string, fallbackEmail?: string) {
  const existingMember = await withApiState((state) => ({
    points: state.pointMembers[memberId] ?? null,
    profile: state.members[memberId] ?? null,
  }));
  if (existingMember.points && (!fallbackEmail || existingMember.points.email === fallbackEmail)) {
    return buildLocalMemberActivityResponse(memberId, existingMember.points, existingMember.profile, fallbackEmail);
  }

  return updateApiState((state) => {
    const existing = state.pointMembers[memberId] ?? {
      memberId,
      email: fallbackEmail ?? null,
      pointsBalance: 0,
      tier: "Bronze",
      history: [],
    };

    state.pointMembers[memberId] = {
      ...existing,
      email: fallbackEmail ?? existing.email,
    };

    if (!state.members[memberId]) {
      state.members[memberId] = {
        id: memberId,
        memberId,
        memberNumber: memberId,
        name: "Demo Member",
        email: fallbackEmail ?? existing.email ?? "demo@example.com",
        mobile: "Not provided",
        memberSince: new Date().toISOString(),
        tier: existing.tier,
        points: existing.pointsBalance,
        lifetimePoints: Math.max(existing.pointsBalance, 0),
        segment: existing.pointsBalance >= 500 ? "High Value" : "Active",
        status: "Active",
        surveysCompleted: 0,
      };
    }

    return buildLocalMemberActivityResponse(memberId, existing, state.members[memberId], fallbackEmail);
  });
}

export async function loadLocalPointsSnapshot() {
  return withApiState((state) => ({
    members: Object.values(state.pointMembers)
      .filter((member) => !member.memberId.includes("{{") && !member.memberId.includes("}}"))
      .map((member) => ({
        memberId: member.memberId,
        email: member.email?.includes("{{") || member.email?.includes("}}") ? null : member.email,
        pointsBalance: member.pointsBalance,
        tier: member.tier,
        history: member.history,
      })),
  }));
}
