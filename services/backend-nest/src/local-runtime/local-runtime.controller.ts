import { Controller, Get } from "@nestjs/common";
import { LocalRuntimeService } from "./local-runtime.service";

@Controller("local-runtime")
export class LocalRuntimeController {
  constructor(private readonly runtime: LocalRuntimeService) {}

  @Get("points")
  async pointsSnapshot() {
    const state = await this.runtime.read();
    return {
      ok: true,
      snapshot: {
        members: Object.values(state.pointMembers || {}).filter(
          (member) => !member.memberId.includes("{{") && !member.memberId.includes("}}"),
        ),
      },
      source: "local_runtime",
    };
  }
}
