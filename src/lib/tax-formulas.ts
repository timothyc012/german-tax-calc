/**
 * 독일 세금 계산 공식 — 법률 원문 기반
 *
 * 모든 공식은 Gesetze im Internet에서 직접 조회하여 구현.
 * 2026년 기준 (Veranlagungszeitraum 2026).
 */

// ══════════════════════════════════════════════════════════════
// 1. 소득세 (Einkommensteuer) — EStG §32a
// ══════════════════════════════════════════════════════════════

/** 2026년 기본공제 (Grundfreibetrag) */
const GRUNDFREIBETRAG = 12_348;

/**
 * 소득세 계산 — EStG §32a Abs.1 (2026년 기준)
 *
 * 구간별 공식:
 * 1. ~12,348€: 0
 * 2. 12,349~17,799€: (914.51·y + 1400)·y
 * 3. 17,800~69,878€: (173.10·z + 2397)·z + 1034.87
 * 4. 69,879~277,825€: 0.42·x - 11135.63
 * 5. 277,826€~: 0.45·x - 19470.38
 */
export function calculateIncomeTax(zvE: number): number {
  // zu versteuerndes Einkommen auf volle Euro abrunden
  const x = Math.floor(zvE);

  if (x <= 0) return 0;

  if (x <= GRUNDFREIBETRAG) {
    // Zone 1: Grundfreibetrag
    return 0;
  }

  if (x <= 17_799) {
    // Zone 2: Eingangssteuersatz 14% → 24%
    const y = (x - GRUNDFREIBETRAG) / 10_000;
    return Math.floor((914.51 * y + 1_400) * y);
  }

  if (x <= 69_878) {
    // Zone 3: Progressionszone 24% → 42%
    const z = (x - 17_799) / 10_000;
    return Math.floor((173.10 * z + 2_397) * z + 1_034.87);
  }

  if (x <= 277_825) {
    // Zone 4: Proportionalzone 42%
    return Math.floor(0.42 * x - 11_135.63);
  }

  // Zone 5: Reichensteuer 45%
  return Math.floor(0.45 * x - 19_470.38);
}

/**
 * Splitting-Verfahren (부부 합산 과세) — EStG §32a Abs.5
 * 합산 소득의 절반에 대한 세금을 구한 뒤 2배
 */
export function calculateSplittingTax(combinedZvE: number): number {
  return calculateIncomeTax(combinedZvE / 2) * 2;
}

// ══════════════════════════════════════════════════════════════
// 2. 연대부담금 (Solidaritätszuschlag) — SolZG §3, §4
// ══════════════════════════════════════════════════════════════

/** Freigrenze — SolZG §3 Abs.3 */
const SOLI_FREIGRENZE_SINGLE = 18_130; // 개인
const SOLI_FREIGRENZE_JOINT = 36_260;  // 부부 합산

/** Zuschlagsatz — SolZG §4 */
const SOLI_RATE = 0.055;

/** Milderungszone 최대율 — SolZG §4 S.2 */
const SOLI_MILDERUNG_RATE = 0.119;

/**
 * Solidaritätszuschlag 계산 — SolZG §4
 *
 * - Freigrenze 이하: 0
 * - Milderungszone: 최대 11.9% × (ESt - Freigrenze)
 * - 그 이상: 5.5% × ESt
 */
export function calculateSoli(incomeTax: number, isJoint: boolean = false): number {
  const freigrenze = isJoint ? SOLI_FREIGRENZE_JOINT : SOLI_FREIGRENZE_SINGLE;

  if (incomeTax <= freigrenze) return 0;

  const fullSoli = incomeTax * SOLI_RATE;
  const milderungSoli = (incomeTax - freigrenze) * SOLI_MILDERUNG_RATE;

  // Milderungszone: Soli는 11.9% × 초과분을 넘지 않음
  const soli = Math.min(fullSoli, milderungSoli);

  // Bruchteile eines Cents bleiben außer Ansatz
  return Math.floor(soli * 100) / 100;
}

// ══════════════════════════════════════════════════════════════
// 3. 교회세 (Kirchensteuer)
// ══════════════════════════════════════════════════════════════

/**
 * 교회세 계산
 * Bayern, Baden-Württemberg: 8%
 * 나머지 연방주: 9%
 */
export function calculateChurchTax(
  incomeTax: number,
  state: "bayern" | "bw" | "other" = "other",
): number {
  const rate = (state === "bayern" || state === "bw") ? 0.08 : 0.09;
  return Math.floor(incomeTax * rate * 100) / 100;
}

// ══════════════════════════════════════════════════════════════
// 4. 법인세 (Körperschaftsteuer) — KStG §23
// ══════════════════════════════════════════════════════════════

/**
 * 법인세율 — KStG §23 Abs.1
 *
 * 2026~2027: 15%
 * 2028: 14%
 * 2029: 13%
 * 2030: 12%
 * 2031: 11%
 * 2032~: 10%
 */
export function getCorporateTaxRate(year: number = 2026): number {
  if (year <= 2027) return 0.15;
  if (year === 2028) return 0.14;
  if (year === 2029) return 0.13;
  if (year === 2030) return 0.12;
  if (year === 2031) return 0.11;
  return 0.10;
}

export function calculateCorporateTax(
  taxableIncome: number,
  year: number = 2026,
): number {
  const rate = getCorporateTaxRate(year);
  return Math.floor(taxableIncome * rate * 100) / 100;
}

// ══════════════════════════════════════════════════════════════
// 5. 영업세 (Gewerbesteuer) — GewStG §11
// ══════════════════════════════════════════════════════════════

/** Steuermesszahl — GewStG §11 Abs.2 */
const GEWERBE_MESSZAHL = 0.035;

/** Freibetrag — GewStG §11 Abs.1 Nr.1 */
const GEWERBE_FREIBETRAG_PERSON = 24_500;
const GEWERBE_FREIBETRAG_PUBLIC = 5_000;

/**
 * 영업세 계산 — GewStG §11
 *
 * Gewerbesteuer = Gewerbeertrag × Steuermesszahl(3.5%) × Hebesatz
 *
 * @param gewerbeertrag 영업이익
 * @param hebesatz 지자체 Hebesatz (% 단위, 예: 490 = 490%)
 * @param isNatural 개인사업자/인적회사 여부 (true면 24,500€ 공제)
 */
export function calculateGewerbesteuer(
  gewerbeertrag: number,
  hebesatz: number,
  isNatural: boolean = false,
): number {
  // Freibetrag 적용
  const freibetrag = isNatural ? GEWERBE_FREIBETRAG_PERSON : 0;
  const taxable = Math.max(0, Math.floor(gewerbeertrag / 100) * 100 - freibetrag);

  // Steuermessbetrag
  const messbetrag = taxable * GEWERBE_MESSZAHL;

  // Gewerbesteuer = Messbetrag × Hebesatz / 100
  return Math.floor(messbetrag * hebesatz / 100 * 100) / 100;
}

// ══════════════════════════════════════════════════════════════
// 6. 토지세 (Grundsteuer) — GrStG §15
// ══════════════════════════════════════════════════════════════

/**
 * Grundsteuer Steuermesszahl — GrStG §15 (2025년 개혁 후)
 *
 * 비건축지: 0.34‰
 * 건축지 (주거용, §249 Abs.1 Nr.1-4): 0.31‰
 * 건축지 (비주거용, §249 Abs.1 Nr.5-8): 0.34‰
 */
export type GrundsteuerType = "unbuilt" | "residential" | "non_residential";

export function getGrundsteuerMesszahl(type: GrundsteuerType): number {
  switch (type) {
    case "unbuilt": return 0.00034;
    case "residential": return 0.00031;
    case "non_residential": return 0.00034;
  }
}

/**
 * Grundsteuer 계산
 *
 * Grundsteuer = Grundsteuerwert × Steuermesszahl × Hebesatz / 100
 *
 * @param grundsteuerwert 부동산 평가액 (Grundsteuerwert)
 * @param type 건물 유형
 * @param hebesatz 지자체 Hebesatz (% 단위, 예: 600 = 600%)
 */
export function calculateGrundsteuer(
  grundsteuerwert: number,
  type: GrundsteuerType,
  hebesatz: number,
): number {
  const messzahl = getGrundsteuerMesszahl(type);
  const messbetrag = grundsteuerwert * messzahl;
  return Math.floor(messbetrag * hebesatz / 100 * 100) / 100;
}

// ══════════════════════════════════════════════════════════════
// 7. 종합 세금 계산 (개인 + 법인)
// ══════════════════════════════════════════════════════════════

export interface PersonalTaxInput {
  /** 연간 총소득 (Bruttoeinkommen) */
  grossIncome: number;
  /** Werbungskosten (기본 1,230€ 미만이면 Pauschale 적용) */
  werbungskosten?: number;
  /** Sonderausgaben (기본 Pauschale 36€/72€) */
  sonderausgaben?: number;
  /** Steuerklasse (1~6) */
  taxClass?: 1 | 2 | 3 | 4 | 5 | 6;
  /** 교회세 납부 여부 */
  churchTax?: boolean;
  /** 연방주 (교회세율 구분) */
  state?: "bayern" | "bw" | "other";
  /** 자녀 수 (Kinderfreibetrag: 자녀당 6,612€, 2026) */
  children?: number;
}

export interface PersonalTaxResult {
  grossIncome: number;
  deductions: {
    werbungskosten: number;
    sonderausgaben: number;
    kinderfreibetrag: number;
  };
  zvE: number;
  incomeTax: number;
  soli: number;
  churchTax: number;
  totalTax: number;
  netIncome: number;
  effectiveRate: number;
  marginalRate: number;
}

/** Werbungskosten-Pauschbetrag — EStG §9a Nr.1 */
const WERBUNGSKOSTEN_PAUSCHALE = 1_230;
/** Sonderausgaben-Pauschbetrag — EStG §10c */
const SONDERAUSGABEN_PAUSCHALE = 36;
/** Kinderfreibetrag — EStG §32 Abs.6 (2026, 양부모 합산) */
const KINDERFREIBETRAG = 6_612;
/** BEA-Freibetrag — EStG §32 Abs.6 */
const BEA_FREIBETRAG = 2_928;

export function calculatePersonalTax(input: PersonalTaxInput): PersonalTaxResult {
  const gross = input.grossIncome;

  // 공제 계산
  const wk = Math.max(input.werbungskosten ?? 0, WERBUNGSKOSTEN_PAUSCHALE);
  const sa = Math.max(input.sonderausgaben ?? 0, SONDERAUSGABEN_PAUSCHALE);
  const children = input.children ?? 0;
  const kfb = children * (KINDERFREIBETRAG + BEA_FREIBETRAG);

  // zu versteuerndes Einkommen
  const zvE = Math.max(0, gross - wk - sa - kfb);

  // 소득세
  const isJoint = input.taxClass === 3;
  const est = isJoint ? calculateSplittingTax(zvE) : calculateIncomeTax(zvE);

  // 연대부담금
  const soli = calculateSoli(est, isJoint);

  // 교회세
  const kirchensteuer = input.churchTax
    ? calculateChurchTax(est, input.state ?? "other")
    : 0;

  const totalTax = est + soli + kirchensteuer;
  const net = gross - totalTax;

  // 한계세율 (1€ 추가 소득 시 세금 증가분)
  const marginalTax = calculateIncomeTax(zvE + 1) - calculateIncomeTax(zvE);

  return {
    grossIncome: gross,
    deductions: {
      werbungskosten: wk,
      sonderausgaben: sa,
      kinderfreibetrag: kfb,
    },
    zvE,
    incomeTax: est,
    soli,
    churchTax: kirchensteuer,
    totalTax,
    netIncome: net,
    effectiveRate: gross > 0 ? Math.round(totalTax / gross * 10000) / 100 : 0,
    marginalRate: Math.round(marginalTax * 10000) / 100,
  };
}

export interface CorporateTaxInput {
  /** 과세 소득 */
  taxableIncome: number;
  /** 영업이익 (Gewerbeertrag), 없으면 taxableIncome 사용 */
  gewerbeertrag?: number;
  /** 지자체 Hebesatz (%, 예: 490) */
  hebesatz: number;
  /** 과세 연도 */
  year?: number;
}

export interface CorporateTaxResult {
  taxableIncome: number;
  corporateTax: number;
  corporateTaxRate: number;
  soli: number;
  gewerbesteuer: number;
  gewerbeHebesatz: number;
  totalTax: number;
  effectiveRate: number;
}

export function calculateCorporateTaxTotal(input: CorporateTaxInput): CorporateTaxResult {
  const year = input.year ?? 2026;
  const income = input.taxableIncome;
  const gewerbeertrag = input.gewerbeertrag ?? income;

  // 법인세
  const kst = calculateCorporateTax(income, year);
  const kstRate = getCorporateTaxRate(year);

  // 연대부담금 (법인은 Freigrenze 없음)
  const soli = Math.floor(kst * SOLI_RATE * 100) / 100;

  // 영업세 (법인은 Freibetrag 없음)
  const gewst = calculateGewerbesteuer(gewerbeertrag, input.hebesatz, false);

  const total = kst + soli + gewst;

  return {
    taxableIncome: income,
    corporateTax: kst,
    corporateTaxRate: kstRate * 100,
    soli,
    gewerbesteuer: gewst,
    gewerbeHebesatz: input.hebesatz,
    totalTax: total,
    effectiveRate: income > 0 ? Math.round(total / income * 10000) / 100 : 0,
  };
}
