/**
 * calculate_trade_tax — 영업세 (Gewerbesteuer) 단독 계산
 */

import { z } from "zod";
import { calculateGewerbesteuer } from "../lib/tax-formulas.js";
import { formatCalculationMetadata } from "../lib/calculation-metadata.js";

export const tradeTaxSchema = z.object({
  gewerbeertrag: z.number().min(0).describe("영업이익 (Gewerbeertrag, EUR)"),
  hebesatz: z.number().min(200).max(900).describe("지자체 Hebesatz (%, 예: Karlsruhe=430, Berlin=410, M\u00fcnchen=490)"),
  isNatural: z.boolean().optional().default(false).describe("개인사업자/인적회사 여부 (true면 24,500\u20AC Freibetrag 적용)"),
});

export type TradeTaxInput = z.infer<typeof tradeTaxSchema>;

export async function tradeTaxTool(input: TradeTaxInput): Promise<string> {
  const { gewerbeertrag, hebesatz, isNatural } = input;

  const freibetrag = isNatural ? 24_500 : 0;
  const taxable = Math.max(0, Math.floor(gewerbeertrag / 100) * 100 - freibetrag);
  const messbetrag = taxable * 0.035;
  const gewst = calculateGewerbesteuer(gewerbeertrag, hebesatz, isNatural);

  const lines = [
    `[영업세 (Gewerbesteuer) 계산 결과]`,
    ``,
    `영업이익:              ${fmt(gewerbeertrag)}`,
  ];

  if (isNatural) {
    lines.push(`Freibetrag:            -${fmt(freibetrag)}  (GewStG §11 Abs.1 Nr.1)`);
  }

  lines.push(
    `과세 영업이익:         ${fmt(taxable)}`,
    ``,
    `Steuermesszahl:        3.5%  (GewStG §11 Abs.2)`,
    `Steuermessbetrag:      ${fmt(messbetrag)}`,
    `Hebesatz:              ${hebesatz}%`,
    ``,
    `영업세:                ${fmt(gewst)}`,
    `실효세율:              ${gewerbeertrag > 0 ? (gewst / gewerbeertrag * 100).toFixed(2) : "0.00"}%`,
    ``,
    `법적 근거: GewStG §11 (Steuermesszahl 3.5%), §16 (Hebesatz)`,
    ``,
    formatCalculationMetadata({
      taxYear: 2026,
      legalBases: ["GewStG §11", "GewStG §16"],
    }),
  );

  return lines.join("\n");
}

function fmt(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20AC";
}
