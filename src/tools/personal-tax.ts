/**
 * calculate_personal_tax — 개인 소득세 종합 계산
 */

import { z } from "zod";
import { calculatePersonalTax, type PersonalTaxResult } from "../lib/tax-formulas.js";
import { formatCalculationMetadata } from "../lib/calculation-metadata.js";

export const personalTaxSchema = z.object({
  grossIncome: z.number().min(0).describe("연간 총소득 (Bruttoeinkommen, EUR)"),
  werbungskosten: z.number().min(0).optional().describe("업무 관련 경비 (Werbungskosten). 미입력 시 Pauschale 1,230€ 적용"),
  taxClass: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]).optional().default(1).describe("과세등급 (Steuerklasse 1~6). 기본: 1"),
  churchTax: z.boolean().optional().default(false).describe("교회세 납부 여부 (Kirchensteuer)"),
  state: z.enum(["bayern", "bw", "other"]).optional().default("other").describe("연방주 (교회세율: Bayern/BW 8%, 기타 9%)"),
  children: z.number().int().min(0).optional().default(0).describe("자녀 수 (Kinderfreibetrag 적용)"),
});

export type PersonalTaxInput = z.infer<typeof personalTaxSchema>;

function formatResult(r: PersonalTaxResult): string {
  const lines: string[] = [
    `[개인 소득세 계산 결과 — 2026년 기준]`,
    ``,
    `총소득 (Brutto):         ${fmt(r.grossIncome)}`,
    ``,
    `── 공제 ──`,
    `  Werbungskosten:        -${fmt(r.deductions.werbungskosten)}`,
    `  Sonderausgaben:        -${fmt(r.deductions.sonderausgaben)}`,
  ];

  if (r.deductions.kinderfreibetrag > 0) {
    lines.push(`  Kinderfreibetrag:      -${fmt(r.deductions.kinderfreibetrag)}`);
  }

  lines.push(
    ``,
    `과세소득 (zvE):          ${fmt(r.zvE)}`,
    ``,
    `── 세금 ──`,
    `  소득세 (ESt):          ${fmt(r.incomeTax)}   (EStG §32a)`,
    `  연대부담금 (Soli):     ${fmt(r.soli)}   (SolZG §4, 5.5%)`,
  );

  if (r.churchTax > 0) {
    lines.push(`  교회세 (KiSt):         ${fmt(r.churchTax)}`);
  }

  lines.push(
    ``,
    `총 세금:                 ${fmt(r.totalTax)}`,
    `순소득 (Netto):          ${fmt(r.netIncome)}`,
    ``,
    `실효세율:                ${r.effectiveRate}%`,
    `한계세율:                ${r.marginalRate}%`,
    ``,
    `법적 근거: EStG §32a (소득세율), SolZG §4 (연대부담금),`,
    `          EStG §9a (Werbungskosten-Pauschale),`,
    `          EStG §32 Abs.6 (Kinderfreibetrag)`,
    ``,
    formatCalculationMetadata({
      taxYear: 2026,
      legalBases: ["EStG §32a", "SolZG §4", "EStG §9a", "EStG §32 Abs.6"],
    }),
  );

  return lines.join("\n");
}

function fmt(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20AC";
}

export async function personalTaxTool(input: PersonalTaxInput): Promise<string> {
  try {
    const result = calculatePersonalTax({
      grossIncome: input.grossIncome,
      werbungskosten: input.werbungskosten,
      taxClass: input.taxClass,
      churchTax: input.churchTax,
      state: input.state,
      children: input.children,
    });
    return formatResult(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return `[계산 오류] ${msg}`;
  }
}
