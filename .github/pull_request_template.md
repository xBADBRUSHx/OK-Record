## Summary

- 

## Owner Path

- UXP:
- Native:
- Shared contract:
- Packaging/docs:

## Verification

- [ ] `node tests/recorder-contract.test.js`
- [ ] `.\tools\verify-local.ps1 -HybridSdkPath $env:UXP_HYBRID_SDK`
- [ ] `bash tools/verify-local-mac.sh --hybrid-sdk "$UXP_HYBRID_SDK"`
- [ ] `.\tools\open-source-audit.ps1`

## Notes

- No Adobe SDKs, generated `.uxpaddon`, `.ccx`, release archives, PSD/PSB files, captures, exports, or local logs are included.
