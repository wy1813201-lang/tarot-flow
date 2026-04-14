# Round 2 Code Review: ResultPage.tsx

**Reviewer:** code-reviewer
**File:** `src/components/TarotFlow/ResultPage.tsx`
**Scope:** 10 Round 2 changes (content dedup, performance, a11y, responsive)

---

## Verification of Round 2 Changes

| # | Change | Status | Notes |
|---|--------|--------|-------|
| 1 | Remove duplicate actionableSteps from core advice card | PASS | Core advice card (L232-243) only renders `reading.finalAdvice`. Steps live separately at L415-437. |
| 2 | Trim meta pills to "牌阵" + "牌数" only | PASS | L223-224: exactly two pills. |
| 3 | Staticify background animations | PASS | L181-183: plain `<div>`, no `motion.div`, no SVG noise. |
| 4 | useReducedMotion on all motion elements | PARTIAL | See Issue 1 below. |
| 5 | text-[8px]/text-[9px] -> text-[10px] | PASS | Zero matches for `text-[8px]` or `text-[9px]` in file. |
| 6 | focus-visible:ring-2 on 5 interactive buttons | PASS | Confirmed on 5 buttons: L270, L329, L392, L471, L647. |
| 7 | Return button gradient to-[#B89A4A] | PASS | L647: `from-[#C9A86A] to-[#B89A4A]`. |
| 8 | aria-controls + id on accordion | PASS | L470: `aria-controls="advanced-panel"`, L489: `id="advanced-panel"`. Card accordions also correctly paired (L328/L369). |
| 9 | Mini card strip: flex-nowrap/snap-x mobile, wrap desktop | PASS | L204: `flex-nowrap overflow-x-auto sm:flex-wrap sm:overflow-visible snap-x snap-mandatory`. L207: `snap-center shrink-0`. |
| 10 | Hidden sm:flex on accordion header pills | PASS | L478: `hidden sm:flex`. |

---

## Issues Found

### Issue 1 — SupplementaryCardBlock ignores reducedMotion (MEDIUM)

**Location:** `SupplementaryCardBlock` L58-61, also deep analysis cards L586-590

`useReducedMotion()` is called in `ResultPage` (L159) but never passed to `SupplementaryCardBlock`. That component's `motion.div` always animates:

```tsx
// L58-61 — always animates regardless of user preference
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.45, delay: index * 0.08 }}
```

Similarly, the deep analysis dimension cards (L586-590) use `motion.div` with `initial/animate` without checking `reducedMotion`.

**Fix:** Pass `reducedMotion` as prop to `SupplementaryCardBlock`, or call `useReducedMotion()` inside it. For the deep analysis cards, apply the same `reducedMotion ? false : {...}` pattern used elsewhere.

### Issue 2 — CSS animate-pulse not gated by reduced motion (LOW)

**Location:** L22, L236, L254

Three `<Sparkles>` icons use `animate-pulse` (a CSS animation). Tailwind's `animate-pulse` does not automatically respect `prefers-reduced-motion`. Framer Motion's `useReducedMotion` only controls JS-driven motion.

**Fix:** Add `motion-reduce:animate-none` alongside `animate-pulse`, or conditionally apply based on `reducedMotion`.

### Issue 3 — whileTap on return button not gated (LOW)

**Location:** L646

```tsx
<motion.button whileTap={{ scale: 0.95 }} ...>
```

This tap scale animation runs even when the user prefers reduced motion. All other motion elements in the file respect `reducedMotion`.

**Fix:** `whileTap={reducedMotion ? undefined : { scale: 0.95 }}`

### Issue 4 — Advanced panel action buttons missing focus-visible (LOW)

**Location:** L499-539 (4 buttons: overall追问, general补牌, deep analysis, export poster)

These interactive buttons inside the accordion panel lack `focus-visible:ring-2`. While the requirement specified 5 buttons (all accounted for), keyboard users navigating the accordion content hit these 4 buttons with no visible focus indicator.

**Fix:** Add `focus-visible:ring-2 focus-visible:ring-[#C9A86A]/50 focus-visible:ring-offset-2` (or matching border color) to each.

---

## No Regressions Found

- Content dedup is clean — no duplicate actionableSteps rendering
- ARIA attributes are correctly paired (aria-controls/id)
- Snap scroll implementation is sound (snap-mandatory + snap-center)
- Desktop layout correctly overrides mobile scroll with `sm:flex-wrap sm:overflow-visible`
- No broken imports or unused variables introduced

## Summary

**9/10 changes verified correct.** One partial issue: `useReducedMotion` coverage has gaps in `SupplementaryCardBlock` and the deep analysis motion cards (Issue 1, MEDIUM). Three additional LOW-severity polish items around CSS animations and focus indicators. No regressions detected.
