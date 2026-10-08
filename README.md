# german-tax-calc

독일 연방세 계산을 위한 MCP 서버입니다. 현재 다음 계산기를 제공합니다.

- Einkommensteuer + Solidaritätszuschlag + Kirchensteuer
- Körperschaftsteuer + Solidaritätszuschlag + Gewerbesteuer
- Gewerbesteuer
- Grundsteuer

## 실행

```sh
npm ci
npm test
npm run build
node dist/index.js
```

## 결과 계약

각 계산 결과에는 다음 메타데이터가 포함됩니다.

- 기준 과세연도
- 규칙셋 버전
- 적용한 법적 근거
- 전문가 검토 필요 여부
- 자동 세무 신고나 법률 자문을 대체하지 않는다는 경계

계산 결과는 의사결정 지원용입니다. 입력값과 결과를 고객 기록에 저장할 때는
사용한 과세연도, 규칙셋 버전, 입력값, 법적 근거를 함께 보존하세요.

## 범위

공식 신고서 제출, Finanzamt 전자신고, 개별 세무 자문, 지방자치단체별 예외
규칙의 완전한 자동화는 이 서버의 범위가 아닙니다. 계산 결과는 Steuerberater
또는 세무 담당자의 검토 후 사용해야 합니다.
