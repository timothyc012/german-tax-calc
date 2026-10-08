/**
 * calculate_property_tax — 토지세 (Grundsteuer) 계산
 * 2025년 개혁 후 신규 모델 기반
 */

import { z } from "zod";
import { calculateGrundsteuer, getGrundsteuerMesszahl, type GrundsteuerType } from "../lib/tax-formulas.js";
import { formatCalculationMetadata } from "../lib/calculation-metadata.js";

export const propertyTaxSchema = z.object({
  grundsteuerwert: z.number().min(0).describe("부동산 평가액 (Grundsteuerwert, EUR). Finanzamt에서 통보받은 금액"),
  type: z.enum(["unbuilt", "residential", "non_residential"]).describe("부동산 유형: 'unbuilt'(비건축지), 'residential'(주거용), 'non_residential'(비주거용)"),
  hebesatz: z.number().min(0).max(1500).describe("지자체 Grundsteuer B Hebesatz (%, 예: Karlsruhe=270, Berlin=470, M\u00fcnchen=535)"),
});

export type PropertyTaxInput = z.infer<typeof propertyTaxSchema>;

export async function propertyTaxTool(input: PropertyTaxInput): Promise<string> {
  const { grundsteuerwert, type, hebesatz } = input;

  const messzahl = getGrundsteuerMesszahl(type as GrundsteuerType);
  const messbetrag = grundsteuerwert * messzahl;
  const tax = calculateGrundsteuer(grundsteuerwert, type as GrundsteuerType, hebesatz);
  const monthly = tax / 12;

  const typeLabel = type === "unbuilt" ? "Unbebautes Grundst\u00fcck (비건축지)"
    : type === "residential" ? "Wohngeb\u00e4ude (주거용, §249 Nr.1-4)"
    : "Nichtwohngeb\u00e4ude (비주거용, §249 Nr.5-8)";

  const lines = [
    `[토지세 (Grundsteuer) 계산 결과 — 2025년 개혁 모델]`,
    ``,
    `부동산 평가액:         ${fmt(grundsteuerwert)}`,
    `유형:                  ${typeLabel}`,
    ``,
    `Steuermesszahl:        ${(messzahl * 1000).toFixed(2)}\u2030  (GrStG §15)`,
    `Steuermessbetrag:      ${fmt(messbetrag)}`,
    `Hebesatz:              ${hebesatz}%`,
    ``,
    `연간 Grundsteuer:      ${fmt(tax)}`,
    `월간 환산:             ${fmt(monthly)}`,
    ``,
    `법적 근거: GrStG §15 (Steuermesszahl), GrStG §25 (Hebesatz)`,
    ``,
    `참고: 주거용 건물은 사회적 주거(Förderzusage) 시 25% 감면 가능 (GrStG §15 Abs.2)`,
    ``,
    formatCalculationMetadata({
      taxYear: 2026,
      legalBases: ["GrStG §15", "GrStG §25"],
    }),
  ];

  return lines.join("\n");
}

function fmt(n: number): string {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20AC";
}
