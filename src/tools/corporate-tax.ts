/**
 * calculate_corporate_tax — 법인 세금 종합 계산
 * (법인세 + 연대부담금 + 영업세)
 */

import { z } from "zod";
import { calculateCorporateTaxTotal, type CorporateTaxResult } from "../lib/tax-formulas.js";

export const corporateTaxSchema = z.object({
  taxableIncome: z.number().min(0).describe("과세 소득 (zu versteuerndes Einkommen, EUR)"),
  hebesatz: z.number().min(200).max(900).describe("지자체 영업세 Hebesatz (%, 예: Karlsruhe=430, Berlin=410, M\u00fcnchen=490, Frankfurt=460)"),
  gewerbeertrag: z.number().min(0).optional().describe("영업이익 (Gewerbeertrag). 미입력 시 과세소득과 동일하게 적용"),
  year: z.number().int().min(2024).max(2035).optional().default(2026).describe("과세 연도 (법인세율 변경 반영)"),
});

export type CorporateTaxInput = z.infer<typeof corporateTaxSchema>;

function formatResult(r: CorporateTaxResult): string {
  const lines: string[] = [
    `[법인 세금 계산 결과 — ${r.corporateTaxRate < 15 ? "KStG §23 단계적 인하 적용" : "2026년 기준"}]`,
    ``,
    `과세소득:                ${fmt(r.taxableIncome)}`,
    ``,
    `── 세금 ──`,
    `  법인세 (KSt):          ${fmt(r.corporateTax)}   (KStG §23, ${r.corporateTaxRate}%)`,
    `  연대부담금 (Soli):     ${fmt(r.soli)}   (SolZG §4, 5.5%)`,
    `  영업세 (GewSt):        ${fmt(r.gewerbesteuer)}   (GewStG §11, Messzahl 3.5% \u00d7 Hebesatz ${r.gewerbeHebesatz}%)`,
    ``,
    `총 세금:                 ${fmt(r.totalTax)}`,
    `실효세율:                ${r.effectiveRate}%`,
    ``,
    `── 참고 ──`,
    `  법인세율 경로: 2026-27: 15% \u2192 2028: 14% \u2192 2029: 13% \u2192 2030: 12% \u2192 2031: 11% \u2192 2032~: 10%`,
    `  영업세는 법인세에서 공제 가능 (EStG §35 유사 규정)`,
    ``,
    `법적 근거: KStG §23 (법인세율), SolZG §4 (연대부담금),`,
    `          GewStG §11 (영업세 Steuermesszahl)`,
  ];

  return lines.join("\n");
}

function fmt(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20AC";
}

export async function corporateTaxTool(input: CorporateTaxInput): Promise<string> {
  try {
    const result = calculateCorporateTaxTotal({
      taxableIncome: input.taxableIncome,
      gewerbeertrag: input.gewerbeertrag,
      hebesatz: input.hebesatz,
      year: input.year,
    });
    return formatResult(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return `[계산 오류] ${msg}`;
  }
}
