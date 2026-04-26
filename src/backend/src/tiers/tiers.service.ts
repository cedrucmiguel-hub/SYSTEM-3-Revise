import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { LocalRuntimeService, type EarningRuleRecord, type TierRuleRecord } from "../local-runtime/local-runtime.service";

export type TierRule = {
  tier_label: string;
  min_points: number;
  is_active: boolean;
};

export const DEFAULT_TIERS: TierRule[] = [
  { tier_label: "Platinum", min_points: 1500, is_active: true },
  { tier_label: "Gold", min_points: 750, is_active: true },
  { tier_label: "Silver", min_points: 250, is_active: true },
  { tier_label: "Bronze", min_points: 0, is_active: true },
];

export const DEFAULT_EARNING_RULES: EarningRuleRecord[] = [
  { tier_label: "Bronze", peso_per_point: 10, multiplier: 1, is_active: true },
  { tier_label: "Silver", peso_per_point: 10, multiplier: 1.25, is_active: true },
  { tier_label: "Gold", peso_per_point: 10, multiplier: 1.5, is_active: true },
  { tier_label: "Platinum", peso_per_point: 10, multiplier: 2, is_active: true },
];

@Injectable()
export class TiersService {
  private cache: { loadedAt: number; value: TierRule[] } | null = null;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly runtime: LocalRuntimeService,
  ) {}

  async listTiers() {
    if (this.cache && Date.now() - this.cache.loadedAt < 30_000) return this.cache.value;
    const state = await this.runtime.read();
    if (state.tierRules?.length) {
      const value = [...state.tierRules].sort((left, right) => right.min_points - left.min_points);
      this.cache = { loadedAt: Date.now(), value };
      return value;
    }
    const client = this.supabase.admin;
    if (!client) return DEFAULT_TIERS;

    const { data, error } = await client
      .from("points_tiers")
      .select("tier_label,min_points,is_active")
      .eq("is_active", true)
      .order("min_points", { ascending: false });

    if (error || !data?.length) return DEFAULT_TIERS;
    const value = data.map((row) => ({
      tier_label: String(row.tier_label || "Bronze"),
      min_points: Number(row.min_points || 0),
      is_active: Boolean(row.is_active ?? true),
    }));
    this.cache = { loadedAt: Date.now(), value };
    return value;
  }

  async resolveTier(points: number) {
    const tiers = await this.listTiers();
    const active = tiers
      .filter((tier) => tier.is_active)
      .sort((left, right) => right.min_points - left.min_points);
    return active.find((tier) => points >= tier.min_points)?.tier_label || "Bronze";
  }

  async getRules() {
    const state = await this.runtime.read();
    return {
      tiers: state.tierRules?.length ? state.tierRules : DEFAULT_TIERS,
      earningRules: state.earningRules?.length ? state.earningRules : DEFAULT_EARNING_RULES,
      mode: "local_runtime",
    };
  }

  async saveRules(input: {
    tiers?: Array<Partial<TierRuleRecord>>;
    earningRules?: Array<Partial<EarningRuleRecord>>;
  }) {
    return this.runtime.update((state) => {
      if (Array.isArray(input.tiers) && input.tiers.length > 0) {
        state.tierRules = input.tiers
          .map((rule) => ({
            tier_label: String(rule.tier_label || "Bronze"),
            min_points: Math.max(0, Math.floor(Number(rule.min_points || 0))),
            is_active: rule.is_active !== false,
          }))
          .sort((left, right) => right.min_points - left.min_points);
      }

      if (Array.isArray(input.earningRules) && input.earningRules.length > 0) {
        state.earningRules = input.earningRules.map((rule) => ({
          tier_label: String(rule.tier_label || "Bronze"),
          peso_per_point: Math.max(0.01, Number(rule.peso_per_point || 10)),
          multiplier: Math.max(0.01, Number(rule.multiplier || 1)),
          is_active: rule.is_active !== false,
        }));
      }

      this.cache = null;
      return {
        tiers: state.tierRules,
        earningRules: state.earningRules,
        mode: "local_runtime",
      };
    });
  }

  async recalculateMembers() {
    return this.runtime.update(async (state) => {
      let updated = 0;
      for (const member of Object.values(state.pointMembers)) {
        const tier = await this.resolveTier(Number(member.pointsBalance || 0));
        member.tier = tier;
        const profile = state.members[member.memberId];
        if (profile) {
          profile.tier = tier;
          profile.points = member.pointsBalance;
          profile.lifetimePoints = (member.history || [])
            .filter((item) => Number(item.points || 0) > 0)
            .reduce((sum, item) => sum + Number(item.points || 0), 0);
          profile.segment = profile.segment || (member.pointsBalance >= 500 ? "High Value" : "Active");
          updated += 1;
        }
      }
      this.cache = null;
      return { updatedMembers: updated, mode: "local_runtime" };
    });
  }
}
