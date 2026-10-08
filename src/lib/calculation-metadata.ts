export interface CalculationMetadataInput {
  taxYear: number;
  legalBases: string[];
  rulesetVersion?: string;
}

export const TAX_RULESET_VERSION = "2026.1";

/**
 * Every calculator result carries a reproducibility and review boundary.
 * The calculators are decision support, not an automatic tax filing.
 */
export function formatCalculationMetadata({
  taxYear,
  legalBases,
  rulesetVersion = TAX_RULESET_VERSION,
}: CalculationMetadataInput): string {
  return [
    "── 계산 메타데이터 ──",
    `기준 연도:              ${taxYear}`,
    `규칙셋 버전:            ${rulesetVersion}`,
    `법적 근거:              ${legalBases.join(", ")}`,
    "전문가 검토 필요:       예",
    "주의: 이 결과는 세무 신고나 법적 자문을 자동 대체하지 않습니다.",
  ].join("\n");
}
