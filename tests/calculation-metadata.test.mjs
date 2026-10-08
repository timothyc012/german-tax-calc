import assert from "node:assert/strict";
import test from "node:test";
import { formatCalculationMetadata } from "../dist/lib/calculation-metadata.js";

test("calculation metadata is explicit and review-gated", () => {
  const text = formatCalculationMetadata({
    taxYear: 2026,
    legalBases: ["EStG §32a", "SolZG §4"],
  });

  assert.match(text, /기준 연도:\s+2026/);
  assert.match(text, /법적 근거:\s+EStG §32a, SolZG §4/);
  assert.match(text, /전문가 검토 필요:\s+예/);
});

test("personal tax output carries the audit boundary", async () => {
  const { personalTaxTool } = await import("../dist/tools/personal-tax.js");
  const text = await personalTaxTool({ grossIncome: 50_000, taxClass: 1, churchTax: false, state: "other", children: 0 });

  assert.match(text, /규칙셋 버전:\s+2026\.1/);
  assert.match(text, /전문가 검토 필요:\s+예/);
});
