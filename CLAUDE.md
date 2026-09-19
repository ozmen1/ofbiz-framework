# Claude Code Instructions for Apache OFBiz & React SPA

@AGENTS.md

## Claude Code Quick Operational Guidelines
- **Working Directories:**
  - Frontend: `plugins/react-app/frontend` (run `npm run build` here)
  - OFBiz Backend: `/home/admin/Documents/ofbiz` (run `./gradlew ...` here)
- **Primary Configuration & Invariants:**
  - Follow all Golden Invariants defined in `@AGENTS.md`.
  - Always update both `controller.xml` files when adding API endpoints.
  - Never use `backdrop-blur-*` on modal/drawer overlays; use `bg-black/80` or `.ds-overlay`.
  - Always wrap 50+ item `<select>` options in `useMemo`.
  - Never use emoji flags; use SVG components (`TrFlag`, `GbFlag`).
  - Keep full localization in `src/i18n/`.
