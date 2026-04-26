import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { PartnersService } from "./partners.service";
import { PartnerSettlementDto, PartnerTransactionDto } from "./dto";

function merge(body: object | undefined, request: Request) {
  const query = Object.fromEntries(new URLSearchParams(String(request.originalUrl || request.url || "").split("?")[1] || ""));
  const payload = { ...query, ...(request.query || {}) } as Record<string, unknown>;
  for (const [key, value] of Object.entries(body || {})) {
    if (value !== undefined && value !== null && value !== "") payload[key] = value;
  }
  return payload;
}

@Controller("partners")
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Post("transactions")
  async transaction(@Body() body: PartnerTransactionDto, @Req() request: Request) {
    return { ok: true, transaction: await this.partners.createTransaction(merge(body, request)) };
  }

  @Get("dashboard")
  async dashboard(@Query("partnerId") partnerId?: string) {
    return { ok: true, dashboard: await this.partners.dashboard(partnerId) };
  }

  @Get(":id/dashboard")
  async dashboardById(@Param("id") id: string) {
    return { ok: true, dashboard: await this.partners.dashboard(id) };
  }

  @Post("settlements")
  async settlement(@Body() body: PartnerSettlementDto, @Req() request: Request) {
    return { ok: true, settlement: await this.partners.createSettlement(merge(body, request)) };
  }

  @Post(":id/settlement")
  async monthlySettlement(@Param("id") id: string, @Query("month") month?: string) {
    return { ok: true, settlement: await this.partners.createSettlement({ partnerId: id, month }) };
  }

  @Get("settlements/:id/pdf")
  async pdf(@Param("id") id: string, @Res() response: Response) {
    const pdf = await this.partners.settlementPdf(id);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename="${id}.pdf"`);
    response.send(pdf);
  }

  @Patch("settlements/:id/paid")
  async paid(@Param("id") id: string) {
    return { ok: true, settlement: await this.partners.markPaid(id) };
  }

  @Get(":id/settlement/:month/pdf")
  async monthlyPdf(@Param("id") id: string, @Param("month") month: string, @Res() response: Response) {
    const pdf = await this.partners.monthlySettlementPdf(id, month);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename="${id}-${month}.pdf"`);
    response.send(pdf);
  }

  @Patch(":id/settlement/:month/paid")
  async monthlyPaid(@Param("id") id: string, @Param("month") month: string) {
    return { ok: true, settlement: await this.partners.markMonthlyPaid(id, month) };
  }
}
