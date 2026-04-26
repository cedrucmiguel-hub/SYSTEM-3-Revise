import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import { TiersService } from "./tiers.service";

@Controller("tiers")
export class TiersController {
  constructor(private readonly tiers: TiersService) {}

  @Get()
  async list() {
    return { ok: true, tiers: await this.tiers.listTiers() };
  }

  @Get("rules")
  async rules() {
    return { ok: true, ...(await this.tiers.getRules()) };
  }

  @Patch("rules")
  async saveRules(@Body() body: Record<string, unknown>) {
    return { ok: true, ...(await this.tiers.saveRules(body as never)) };
  }

  @Post("recalculate")
  async recalculate() {
    return { ok: true, ...(await this.tiers.recalculateMembers()) };
  }
}
