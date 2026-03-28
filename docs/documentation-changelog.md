# Documentation changelog

This document summarizes the recent documentation remediation work carried out
to align `docs/` and `README.md` with the implementation in `src/`. It is meant
as a review aid for maintainers and contributors who want a compact view of what
changed and why.

## March 29, 2026

The documentation set was expanded and corrected to improve technical fidelity,
cross-document consistency, and architectural depth.

### Corrected implementation mismatches

The update fixed several source-of-truth issues that could mislead package
users.

- corrected the constraint score contract to consistently document
  `1 = satisfied` and `0 = violated`
- corrected `Solution`, `Violation`, `ProgressStats`, and `OnProgressCallback`
  semantics to match the exported TypeScript types
- corrected configuration defaults such as `tabuSearchEnabled`,
  `intensificationIterations`, `logging.logInterval`, and `onProgressMode`
- corrected phase behavior, aspiration rules, reheating rules, and state
  signature behavior to match the current solver implementation
- corrected error-model documentation, including constructor validation and
  callback failure semantics

### Rewritten core technical documents

The following documents were substantially rewritten for accuracy and depth.

- `docs/api-reference.md`
- `docs/advanced-features.md`
- `docs/architecture.md`
- `docs/configuration.md`
- `docs/troubleshooting.md`
- `docs/testing-guide.md`

### Polished supporting documents

The following documents were refined to improve structure, flow, and consistency
with the rewritten reference material.

- `docs/introduction.md`
- `docs/installation.md`
- `docs/quickstart.md`
- `docs/core-concepts.md`
- `docs/examples.md`
- `docs/migration-guide.md`
- `docs/README.md`

### Repository landing page improvements

The root `README.md` was redesigned to better resemble a mature package
repository landing page.

- added package-style badges
- strengthened the project value proposition
- reorganized the quick-start and documentation navigation
- exposed the full documentation map from the repository root
- improved package presentation for external users and npm visitors

### Documentation quality outcomes

The documentation set now aims to function in three roles simultaneously:

- onboarding material for first-time users,
- reference material for advanced integrators,
- architecture-level material for maintainers and researchers.

## Next steps

Recommended future maintenance tasks:

1. keep `README.md` and `docs/api-reference.md` synchronized with exported types,
2. update documentation whenever solver defaults or phase rules change,
3. add benchmark-linked tuning examples as empirical guidance evolves.
