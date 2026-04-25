import { Injectable } from "@nestjs/common";
import { PointsService } from "../points/points.service";
import { LocalRuntimeService } from "../local-runtime/local-runtime.service";

@Injectable()
export class MembersService {
  constructor(
    private readonly points: PointsService,
    private readonly runtime: LocalRuntimeService,
  ) {}

  async profile(memberId: string, email?: string) {
    const activity = await this.points.activity(memberId, email);
    const profile = activity.profile as Record<string, unknown>;
    const fullName = `${String(profile.first_name || "").trim()} ${String(profile.last_name || "").trim()}`.trim();
    return {
      id: String(profile.member_number || profile.member_id || memberId),
      name: fullName || "Demo Member",
      email: String(profile.email || email || ""),
      mobile: String(profile.mobile || profile.phone || ""),
      memberSince: String(profile.member_since || profile.enrollment_date || ""),
      tier: String(profile.tier || "Bronze"),
      points: Number(profile.points_balance || 0),
      lifetimePoints: Number(profile.lifetime_points || 0),
      segment: String(profile.segment || "Active"),
      surveysCompleted: Number(profile.surveys_completed || 0),
      status: String(profile.status || "Active"),
      birthdate: profile.birthdate || null,
      address: profile.address || null,
    };
  }

  async tier(memberId: string, email?: string) {
    const activity = await this.points.activity(memberId, email);
    return activity.balance.tier;
  }

  async notifications(memberId: string, limit = 20) {
    const state = await this.runtime.read();
    return (state.notifications || [])
      .filter((row) => !row.memberId || row.memberId === memberId)
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
      .slice(0, limit);
  }

  async preferences(memberId: string, patch: Record<string, unknown>) {
    return this.runtime.update((state) => {
      const current = state.communicationPreferences[memberId] || {
        sms: true,
        email: true,
        push: true,
        promotionalOptIn: true,
        frequency: "weekly",
      };
      const preference = { ...current, ...patch };
      state.communicationPreferences[memberId] = preference;
      return preference;
    });
  }

  async list() {
    const state = await this.runtime.read();
    return Object.values(state.members)
      .map((member) => ({
        id: member.memberId,
        memberNumber: member.memberNumber,
        name: member.name,
        email: member.email,
        mobile: member.mobile,
        memberSince: member.memberSince,
        tier: member.tier,
        points: member.points,
        lifetimePoints: member.lifetimePoints,
        segment: member.segment,
        status: member.status,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async updateSegment(memberId: string, segment: string) {
    return this.runtime.update((state) => {
      const member = state.members[memberId];
      if (!member) {
        state.members[memberId] = {
          id: memberId,
          memberId,
          memberNumber: memberId,
          name: "Demo Member",
          email: `${memberId.toLowerCase()}@example.com`,
          mobile: "",
          memberSince: new Date().toISOString(),
          tier: state.pointMembers[memberId]?.tier || "Bronze",
          points: state.pointMembers[memberId]?.pointsBalance || 0,
          lifetimePoints: state.pointMembers[memberId]?.history?.filter((item) => Number(item.points || 0) > 0).reduce((sum, item) => sum + Number(item.points || 0), 0) || 0,
          segment,
          status: "Active",
          surveysCompleted: 0,
        };
      } else {
        member.segment = segment;
      }
      return state.members[memberId];
    });
  }
}
