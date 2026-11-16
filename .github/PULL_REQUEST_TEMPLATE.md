## Summary
<!-- Describe what this change accomplishes and link any related issue. -->

## Hardware & Protocol Checklist
- [ ] Preserves `B1_PRINTHEAD_PX = 384`, `LABEL_HEIGHT_PX = 400`, and `LabelType.WithGaps` default
- [ ] Preserves dynamic WebSerial enumeration (no hardcoded COM ports) and `20 ms` Windows BLE GATT pacing
- [ ] Guarantees `task.printEnd()` cleanup in `finally`

## Security, Tokens & i18n Checklist
- [ ] Zero `innerHTML`, `outerHTML`, `eval()`, `any`, inline `style=`, or `.style.*` mutations
- [ ] All new CSS styles use `var(--nb-*)` tokens defined in `src/tokens.css`
- [ ] Both `en` and `pt-BR` keys & placeholders updated in `src/i18n/translations.ts`
- [ ] `localStorage` keys use the `niimbot-label-studio:` prefix
- [ ] Zero private IPs, tokens, or SSH host strings included

## Verification Output
<!-- Paste results of: npm audit && npm run check && npm run build -->
- [ ] `npm audit` exits `0`
- [ ] `npm run check` (`biome` + `tsc` + `verify-guardrails` + `node --test`) exits `0`
- [ ] `npm run build` exits `0`
