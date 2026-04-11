#!/usr/bin/env node

/**
 * German Tax Calculator MCP Server
 *
 * 독일 세금 계산 — 소득세, 법인세, 영업세, 토지세, 연대부담금
 * 모든 공식은 법률 원문(EStG, KStG, GewStG, SolZG, GrStG)에서 직접 추출.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { personalTaxSchema, personalTaxTool } from "./tools/personal-tax.js";
import { corporateTaxSchema, corporateTaxTool } from "./tools/corporate-tax.js";
import { tradeTaxSchema, tradeTaxTool } from "./tools/trade-tax.js";
import { propertyTaxSchema, propertyTaxTool } from "./tools/property-tax.js";

const server = new McpServer({
  name: "german-tax-calc",
  version: "0.1.0",
  description: "German tax calculator — income, corporate, trade, property taxes based on federal law formulas",
});

server.tool(
  "calculate_personal_tax",
  "Calculate German personal income tax (Einkommensteuer) including solidarity surcharge and church tax. Uses the exact EStG §32a formula for 2026. Supports all tax classes (Steuerklasse 1-6), child allowances, and deductions.",
  personalTaxSchema.shape,
  async (params) => {
    const input = personalTaxSchema.parse(params);
    const result = await personalTaxTool(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "calculate_corporate_tax",
  "Calculate total German corporate tax burden: Körperschaftsteuer (KStG §23) + Solidaritätszuschlag + Gewerbesteuer (GewStG §11). Reflects the KStG §23 rate reduction schedule (15% in 2026 down to 10% by 2032).",
  corporateTaxSchema.shape,
  async (params) => {
    const input = corporateTaxSchema.parse(params);
    const result = await corporateTaxTool(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "calculate_trade_tax",
  "Calculate German trade tax (Gewerbesteuer) standalone. Uses GewStG §11 formula: Gewerbeertrag × Steuermesszahl (3.5%) × municipal Hebesatz. Applies 24,500€ Freibetrag for sole proprietors and partnerships.",
  tradeTaxSchema.shape,
  async (params) => {
    const input = tradeTaxSchema.parse(params);
    const result = await tradeTaxTool(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "calculate_property_tax",
  "Calculate German property tax (Grundsteuer) under the 2025 reform model. Uses GrStG §15 Steuermesszahl rates: 0.31‰ (residential) or 0.34‰ (non-residential/unbuilt) × municipal Hebesatz.",
  propertyTaxSchema.shape,
  async (params) => {
    const input = propertyTaxSchema.parse(params);
    const result = await propertyTaxTool(input);
    return { content: [{ type: "text", text: result }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
