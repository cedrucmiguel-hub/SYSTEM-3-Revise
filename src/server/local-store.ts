import { promises as fs } from "fs";
import path from "path";

export type StoredIdempotentResponse = {
  key: string;
  route: string;
  requestHash: string;
  statusCode: number;
  body: unknown;
  createdAt: string;
};

export type PartnerTransactionRecord = {
  id: string;
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  memberId: string;
  memberEmail: string | null;
  orderId: string;
  points: number;
  grossAmount: number;
  note: string;
  occurredAt: string;
  settlementId: string | null;
  settledAt: string | null;
};

export type PartnerSettlementRecord = {
  id: string;
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  month: string;
  totalTransactions: number;
  totalPoints: number;
  totalGrossAmount: number;
  commissionRate: number;
  commissionAmount: number;
  createdAt: string;
  status: "generated" | "paid";
  paidAt: string | null;
  transactionIds: string[];
};

export type LocalPointTransactionRecord = {
  id: string;
  type: string;
  points: number;
  reason: string;
  date: string;
  expiry_date: string | null;
  reference: string | null;
};

export type LocalPointMemberRecord = {
  memberId: string;
  email: string | null;
  pointsBalance: number;
  tier: string;
  history: LocalPointTransactionRecord[];
};

export type LocalCampaignRecord = Record<string, any> & {
  id: string;
  campaignCode: string;
  campaignName: string;
  status: string;
  budgetSpent?: number;
  createdAt: string;
  publishedAt?: string | null;
};

export type LocalSegmentRecord = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  logicMode?: "AND" | "OR";
  conditions?: Array<{
    id: string;
    field: "Tier" | "Last Activity" | "Points Balance";
    operator: string;
    value: string;
  }>;
  memberIds?: string[];
};

export type LocalNotificationRecord = {
  id: string;
  memberId: string | null;
  channel: "sms" | "email" | "push";
  subject: string;
  message: string;
  status: "pending" | "read";
  isPromotional: boolean;
  scheduledFor: string | null;
  createdAt: string;
};

export type LocalCommunicationPreferenceRecord = {
  sms: boolean;
  email: boolean;
  push: boolean;
  promotionalOptIn: boolean;
  frequency: "daily" | "weekly" | "never";
};

export type LocalMemberProfileRecord = {
  id: string;
  memberId: string;
  memberNumber: string;
  name: string;
  email: string;
  mobile: string;
  memberSince: string;
  tier: string;
  points: number;
  lifetimePoints: number;
  segment: string;
  status: "Active" | "Inactive";
  profileImage?: string | null;
  birthdate?: string | null;
  address?: string | null;
  surveysCompleted?: number;
};

export type LocalPurchaseRecord = {
  id: string;
  memberId: string;
  receiptReference: string;
  amount: number;
  date: string;
  category: string;
  notes: string | null;
  pointsAwarded: number;
  createdAt: string;
};

export type LocalTaskRecord = {
  id: string;
  title: string;
  description: string;
  type: "survey" | "task";
  status: "available" | "inactive";
  points: number;
  oncePerMember: boolean;
  requiredFields: string[];
};

export type LocalTaskProgressRecord = {
  taskId: string;
  memberId: string;
  status: "available" | "in_progress" | "completed" | "already_claimed";
  startedAt?: string | null;
  submittedAt?: string | null;
  answers?: Record<string, string>;
};

export type LocalReferralRecord = {
  id: string;
  memberId: string;
  referralCode: string;
  recipientEmail: string;
  referralLink: string;
  status: "pending" | "joined" | "duplicate";
  createdAt: string;
};

export type LocalTierRuleRecord = {
  tier_label: string;
  min_points: number;
  is_active: boolean;
};

export type LocalEarningRuleRecord = {
  tier_label: string;
  peso_per_point: number;
  multiplier: number;
  is_active: boolean;
};

export type LocalRewardRecord = {
  id: string;
  reward_id: string;
  name: string;
  description: string;
  points_cost: number;
  category: string;
  is_active: boolean;
};

type ApiState = {
  idempotency: Record<string, StoredIdempotentResponse>;
  partnerTransactions: PartnerTransactionRecord[];
  partnerSettlements: PartnerSettlementRecord[];
  pointMembers: Record<string, LocalPointMemberRecord>;
  members: Record<string, LocalMemberProfileRecord>;
  campaigns: Record<string, LocalCampaignRecord>;
  segments: Record<string, LocalSegmentRecord>;
  notifications: LocalNotificationRecord[];
  communicationPreferences: Record<string, LocalCommunicationPreferenceRecord>;
  purchases: LocalPurchaseRecord[];
  tasks: LocalTaskRecord[];
  taskProgress: LocalTaskProgressRecord[];
  referrals: LocalReferralRecord[];
  tierRules: LocalTierRuleRecord[];
  earningRules: LocalEarningRuleRecord[];
  rewards: LocalRewardRecord[];
};

const STORE_DIR = path.join(process.cwd(), ".runtime");
const STORE_PATH = path.join(STORE_DIR, "api-store.json");

const DEFAULT_STATE: ApiState = {
  idempotency: {},
  partnerTransactions: [],
  partnerSettlements: [],
  pointMembers: {},
  members: {
    "MEM-000011": {
      id: "MEM-000011",
      memberId: "MEM-000011",
      memberNumber: "MEM-000011",
      name: "Sound Wave",
      email: "soundwave@example.com",
      mobile: "+639195555786",
      memberSince: "2026-04-01T00:00:00.000Z",
      tier: "Silver",
      points: 625,
      lifetimePoints: 625,
      segment: "High Value",
      status: "Active",
      surveysCompleted: 0,
    },
    "MEM-000008": {
      id: "MEM-000008",
      memberId: "MEM-000008",
      memberNumber: "MEM-000008",
      name: "Test Three",
      email: "test3@gmail.com",
      mobile: "+639123412312",
      memberSince: "2026-04-03T00:00:00.000Z",
      tier: "Bronze",
      points: 200,
      lifetimePoints: 200,
      segment: "Active",
      status: "Active",
      surveysCompleted: 0,
    },
    "MEM-000007": {
      id: "MEM-000007",
      memberId: "MEM-000007",
      memberNumber: "MEM-000007",
      name: "Test Two",
      email: "test2@gmail.com",
      mobile: "+639123123123",
      memberSince: "2026-04-02T00:00:00.000Z",
      tier: "Silver",
      points: 300,
      lifetimePoints: 300,
      segment: "Active",
      status: "Active",
      surveysCompleted: 0,
    },
    "MEM-000009": {
      id: "MEM-000009",
      memberId: "MEM-000009",
      memberNumber: "MEM-000009",
      name: "Test Four",
      email: "test4@gmail.com",
      mobile: "+639123123124",
      memberSince: "2026-04-04T00:00:00.000Z",
      tier: "Silver",
      points: 605,
      lifetimePoints: 605,
      segment: "Active",
      status: "Active",
      surveysCompleted: 0,
    },
  },
  campaigns: {},
  segments: {},
  notifications: [],
  communicationPreferences: {},
  purchases: [],
  tasks: [
    {
      id: "survey-feedback",
      title: "Customer Experience Survey",
      description: "Answer the quick survey to unlock bonus points.",
      type: "survey",
      status: "available",
      points: 50,
      oncePerMember: true,
      requiredFields: ["rating", "feedback"],
    },
    {
      id: "app-profile-check",
      title: "Profile Review",
      description: "Review your profile details once per member account.",
      type: "task",
      status: "available",
      points: 25,
      oncePerMember: true,
      requiredFields: ["confirmation"],
    },
  ],
  taskProgress: [],
  referrals: [],
  tierRules: [
    { tier_label: "Platinum", min_points: 1500, is_active: true },
    { tier_label: "Gold", min_points: 750, is_active: true },
    { tier_label: "Silver", min_points: 250, is_active: true },
    { tier_label: "Bronze", min_points: 0, is_active: true },
  ],
  earningRules: [
    { tier_label: "Bronze", peso_per_point: 10, multiplier: 1, is_active: true },
    { tier_label: "Silver", peso_per_point: 10, multiplier: 1.25, is_active: true },
    { tier_label: "Gold", peso_per_point: 10, multiplier: 1.5, is_active: true },
    { tier_label: "Platinum", peso_per_point: 10, multiplier: 2, is_active: true },
  ],
  rewards: [
    {
      id: "REWARD-001",
      reward_id: "REWARD-001",
      name: "Free Pastry",
      description: "Choose from croissant, muffin, or danish.",
      points_cost: 150,
      category: "food",
      is_active: true,
    },
    {
      id: "REWARD-002",
      reward_id: "REWARD-002",
      name: "Free Regular Coffee",
      description: "Any regular-sized hot or iced coffee.",
      points_cost: 120,
      category: "beverage",
      is_active: true,
    },
    {
      id: "REWARD-003",
      reward_id: "REWARD-003",
      name: "Free Large Specialty Drink",
      description: "Any large-sized specialty beverage.",
      points_cost: 280,
      category: "beverage",
      is_active: true,
    },
  ],
};

let stateCache: ApiState | null = null;

function pruneApiState(state: ApiState) {
  for (const member of Object.values(state.pointMembers)) {
    member.history = member.history
      .slice()
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .slice(0, 300);
  }

  const idempotencyEntries = Object.entries(state.idempotency);
  if (idempotencyEntries.length > 800) {
    state.idempotency = Object.fromEntries(
      idempotencyEntries
        .sort(([, left], [, right]) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 800),
    );
  }
}

async function ensureStoreDir() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

export async function readApiState(): Promise<ApiState> {
  await ensureStoreDir();

  if (stateCache) return stateCache;

  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<ApiState>;
    stateCache = {
      idempotency: parsed.idempotency ?? {},
      partnerTransactions: parsed.partnerTransactions ?? [],
      partnerSettlements: (parsed.partnerSettlements ?? []).map((settlement) => ({
        ...settlement,
        month: settlement.month ?? String(settlement.createdAt ?? new Date().toISOString()).slice(0, 7),
        status: settlement.status ?? "generated",
        paidAt: settlement.paidAt ?? null,
      })),
      pointMembers: parsed.pointMembers ?? {},
      members: parsed.members ?? DEFAULT_STATE.members,
      campaigns: parsed.campaigns ?? {},
      segments: parsed.segments ?? {},
      notifications: parsed.notifications ?? [],
      communicationPreferences: parsed.communicationPreferences ?? {},
      purchases: parsed.purchases ?? [],
      tasks: parsed.tasks ?? DEFAULT_STATE.tasks,
      taskProgress: parsed.taskProgress ?? [],
      referrals: parsed.referrals ?? [],
      tierRules: parsed.tierRules ?? DEFAULT_STATE.tierRules,
      earningRules: parsed.earningRules ?? DEFAULT_STATE.earningRules,
      rewards: parsed.rewards ?? DEFAULT_STATE.rewards,
    };
    return stateCache;
  } catch {
    stateCache = {
      idempotency: {},
      partnerTransactions: [],
      partnerSettlements: [],
      pointMembers: {},
      members: DEFAULT_STATE.members,
      campaigns: {},
      segments: {},
      notifications: [],
      communicationPreferences: {},
      purchases: [],
      tasks: DEFAULT_STATE.tasks,
      taskProgress: [],
      referrals: [],
      tierRules: DEFAULT_STATE.tierRules,
      earningRules: DEFAULT_STATE.earningRules,
      rewards: DEFAULT_STATE.rewards,
    };
    return stateCache;
  }
}

async function writeApiState(state: ApiState) {
  await ensureStoreDir();
  pruneApiState(state);
  stateCache = state;
  await fs.writeFile(STORE_PATH, JSON.stringify(state), "utf8");
}

export async function updateApiState<T>(updater: (state: ApiState) => T | Promise<T>): Promise<T> {
  const state = await readApiState();
  const result = await updater(state);
  await writeApiState(state);
  return result;
}

export async function withApiState<T>(reader: (state: ApiState) => T | Promise<T>): Promise<T> {
  const state = await readApiState();
  return reader(state);
}
