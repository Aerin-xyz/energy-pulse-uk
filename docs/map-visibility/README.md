# Automatic atlas and viewport sizing — 26 October 2026

Based on production release a1fb667. No production changes.

## Confirmed baseline
Real Chromium production inspection at 390px: SVG 374 × 598px inside a 374 × 462px clipped canvas. At 1366px: SVG 406 × 650px inside a 770 × 422px canvas. The sizing and fullscreen selectors still required the removed `.cc-grid` ancestor.

## Fix
- Automatically mount the interactive atlas; retain code splitting and the national summary.
- Scope map shell, SVG sizing and fullscreen rules to the atlas, independent of page layout.
- Remove the conflicting 650px SVG cap.
- Preserve existing camera URLs, layers, controls, evidence and data schedules.

## Verification
Production baseline and local Chromium screenshots captured. Eight widths: 320, 360, 390, 430, 768, 1024, 1366, 1920. Assert SVG equals its canvas, no document overflow, fullscreen fills viewport and Escape restores embedded mode. Search and Back/Forward checked separately. Initial-content tests, build and TypeScript pass.

Screenshots are in `screens/`. Physical iOS/Android testing is not available. Automatic map loading intentionally increases initial dataset loading versus the previous opt-in design. No data calculations or refresh jobs changed.
