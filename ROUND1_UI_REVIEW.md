# Round 1 UI Review - ResultPage.tsx

## Priority 1 (Must Fix)

### 1.1 Infinite background animations drain GPU on mobile
- **行号**: L181-185
- **问题**: Two `rotate: 360` infinite animations (90s + 120s) with blur-[120px] and blur-[100px] run continuously. On mobile devices this causes jank, battery drain, and heat. The SVG noise texture overlay adds additional compositing cost.
- **建议**:
  1. Wrap both ambient glow divs with `prefers-reduced-motion` media query — disable or replace with static gradient when reduced motion is preferred.
  2. Consider using CSS `will-change: transform` on these elements or, better yet, make them static gradients that don't animate. The visual impact of a slowly rotating radial gradient is negligible vs. cost.
  3. Remove or simplify the SVG noise texture (L185) — `opacity-[0.02]` is nearly invisible but still forces a compositing layer.

### 1.2 actionableSteps rendered twice — redundant content
- **行号**: L246-257 (top "核心建议" card) + L424-446 ("行动指引" section)
- **问题**: The first 2 actionable steps appear inside the core advice card, then ALL steps appear again in the dedicated "行动指引" section below. Users see duplicated content, which harms credibility and wastes vertical space.
- **建议**: Remove the `actionableSteps` grid from the core advice card (L246-257). Keep only the "行动指引" full section (L424-446) as the single source. If you want a teaser in the top card, use a single summary sentence like "下方有 {n} 条行动建议" with an anchor link.

### 1.3 Meta pills repeated in two locations
- **行号**: L219-229 + L486-488
- **问题**: "补牌" and "深度" pills appear both below the mini card strip AND inside the "继续深挖" accordion header. This creates visual noise and doesn't add information.
- **建议**: Remove the meta pills from the top area (L219-229). The accordion header (L486-488) is a better location since those metrics are contextually relevant there. Keep only "牌阵" and "牌数" in the top if needed.

### 1.4 Stagger delays too granular — perceived as slowness
- **行号**: L189, 193, 197, 202-206, 219, 231, 263, 338, 425, 449, 460, 473, 650
- **问题**: The top section uses delays from 0.1 to 0.3 in ~0.02-0.04s increments. These micro-stagger differences are imperceptible to users — they just make the page feel slow to fully render (~0.5s before all top elements appear). Card blocks add `0.18 + idx * 0.08` which means 5 cards take ~0.7s to all appear.
- **建议**:
  1. Group elements into 2-3 visual "waves" instead of individual staggers: Wave 1 (badge + title + question, delay 0), Wave 2 (cards + advice, delay 0.15), Wave 3 (rest of page, delay 0.25).
  2. For card list, use `delay: Math.min(idx * 0.06, 0.2)` to cap the maximum stagger.
  3. Respect `prefers-reduced-motion` — disable all stagger delays when user prefers reduced motion.

### 1.5 Extremely small text fails readability
- **行号**: L84, 88 (SupplementaryCardBlock), L96, 103, 110
- **问题**: `text-[8px]` for orientation badges and keyword tags, `text-[9px]` for section labels. 8px text is below WCAG minimum readable size (typically 12px / 0.75rem). Even on high-DPI screens, this strains eyes.
- **建议**: Increase minimum text size to `text-[10px]` (ideally `text-xs` = 12px). For the orientation badges, use `text-[10px]` with tighter padding to keep the compact look.

---

## Priority 2 (Should Fix)

### 2.1 No `prefers-reduced-motion` support anywhere
- **行号**: Entire file (L1-660)
- **问题**: All Framer Motion animations (fade-in, slide-up, stagger, expand/collapse, infinite rotate) run regardless of user motion preferences. Users with vestibular disorders or motion sensitivity will find this page uncomfortable.
- **建议**: Add a `useReducedMotion()` hook from Framer Motion at the top of ResultPage. Pass `transition={{ duration: reducedMotion ? 0 : originalDuration }}` to all motion elements. For `AnimatePresence` expand/collapse sections, use instant transitions when reduced motion is on.

### 2.2 Collapsed card excerpt truncation is confusing
- **行号**: L368
- **问题**: Collapsed cards show `getCharacterExcerpt(interp.focusedMeaning, isExpanded ? 110 : 82)`. This means: collapsed = 82 chars, expanded button area = 110 chars, then full text below. The jump from 82 → 110 → full creates an odd intermediate state.
- **建议**: Simplify to two states: collapsed shows ~100 chars (single truncation), expanded shows full text. Remove the 110-char intermediate — just show `interp.focusedMeaning` directly when expanded (L397 already does this).

### 2.3 Card expand buttons lack focus-visible styling
- **行号**: L340-344, L283-289, L400-403, L475-479
- **问题**: The card expand `<button>` elements and portrait expand button have no `focus-visible:ring` or `focus-visible:outline` styles. Keyboard users cannot see which element is focused.
- **建议**: Add `focus-visible:ring-2 focus-visible:ring-[#C9A86A]/50 focus-visible:ring-offset-2` to all interactive buttons. For the card expand buttons specifically (L340), also add `focus-visible:rounded-3xl` to match the container shape.

### 2.4 Inconsistent spacing model — `space-y-0` with manual margins
- **行号**: L177 (`space-y-0`), then L188 (`mb-12`), L262 (`mb-8`), L324 (`mb-8 mt-8`), L424 (`mb-8`)
- **问题**: The outer container uses `space-y-0` which does nothing, then each section uses different `mb-*` values. The `mt-8` on L324 creates asymmetric spacing. This makes the vertical rhythm inconsistent.
- **建议**: Replace `space-y-0` with a consistent spacing approach. Either:
  - Use `space-y-8` on the outer container and remove all individual `mb-8` classes, OR
  - Use a consistent `mb-10` on each major section wrapper for uniform vertical rhythm.

### 2.5 Mobile mini-card strip may overflow
- **行号**: L206-217
- **问题**: Mini cards are fixed `w-[88px]` with `flex-wrap`. For a 10-card spread on a 375px screen, wrapping creates 2-3 rows of cards that dominate the viewport. No horizontal scroll fallback.
- **建议**: On mobile (`sm:` below), switch to horizontal scroll: `flex flex-nowrap overflow-x-auto sm:flex-wrap sm:overflow-visible`. Add `snap-x snap-mandatory` for nice scroll behavior. Consider hiding mini cards entirely on mobile since the card list section below provides the same information.

### 2.6 "继续深挖" accordion header layout breaks on mobile
- **行号**: L475-490
- **问题**: The header has a flex layout with title on left and 2 ResultMetaPill + chevron on right. On narrow screens (<375px), the pills will wrap or overflow because they have fixed padding and tracking.
- **建议**: Hide the pills on mobile: `<div className="hidden sm:flex items-center gap-2">`. On mobile, show only the chevron indicator. The pill info is already visible inside the accordion content.

---

## Priority 3 (Nice to Have)

### 3.1 Return button gradient may have contrast issues
- **行号**: L652
- **问题**: White text (`text-white`) on `bg-gradient-to-r from-[#C9A86A] to-[#E7D7B0]`. The lighter end (#E7D7B0) against white text yields a contrast ratio of approximately 1.8:1, well below WCAG AA minimum of 4.5:1.
- **建议**: Darken the gradient end: `to-[#C9A86A]` (same as from) or `to-[#B89A4A]`. Alternatively, use dark text: `text-[#3D352E]`.

### 3.2 SectionDivider animate-pulse runs indefinitely
- **行号**: L22
- **问题**: The Sparkles icon in SectionDivider uses `animate-pulse` which runs forever. Combined with the ambient background animations, this adds to overall animation noise. There are also other `animate-pulse` instances: L240, L270.
- **建议**: Remove `animate-pulse` from decorative dividers. Keep it only on the single most important interactive element (e.g., the "核心建议" Sparkles at L240) if at all.

### 3.3 Deep analysis grid could use `last:col-span-full` for odd count
- **行号**: L581-606
- **问题**: 7 dimension cards in a 2-column grid means the last card ("外部影响") sits alone in the left column with empty space on the right.
- **建议**: Add `last:sm:col-span-2` to the last grid item so it spans full width, or use a 3-column layout at `lg:` breakpoint: `sm:grid-cols-2 lg:grid-cols-3` with the remaining single card spanning full.

### 3.4 Supplementary action buttons lack tap feedback
- **行号**: L504-544 (4 action buttons in "继续深挖")
- **问题**: The main "返回保存记录" button (L651) uses `whileTap={{ scale: 0.95 }}` but none of the 4 action buttons (整体画像追问, 补抽一张牌, 生成深度分析, 生成神谕海报) have tap feedback.
- **建议**: Wrap each with `motion.button` and add `whileTap={{ scale: 0.97 }}` for consistent tactile feedback across all interactive elements.

### 3.5 Hardcoded color values should use CSS variables or Tailwind theme
- **行号**: Throughout (e.g., `#C9A86A`, `#5C5349`, `#3D352E`, `#E8E0D2`, `#F3EEE6`, `#FAF7F2`)
- **问题**: The same 6-7 brand colors are repeated via arbitrary values (`text-[#C9A86A]`, `border-[#E8E0D2]`, etc.) dozens of times. If the color palette changes, every instance must be updated manually.
- **建议**: Define these in `tailwind.config` as theme colors (e.g., `gold: '#C9A86A'`, `warm-gray: '#5C5349'`) and use semantic class names (`text-gold`, `border-warm-gray-light`). This is a larger refactor — flag for a future pass.

### 3.6 Long className strings hurt maintainability
- **行号**: L339 (~400 chars), L238, L182-184
- **问题**: Several elements have extremely long single-line className strings combining 15+ utility classes with conditional logic. These are hard to read, review, and modify.
- **建议**: Extract common patterns into helper variables or use `cn()` / `clsx()` utility (already have `utils.ts`). For the card block (L339), split the base classes and conditional classes:
  ```tsx
  const cardBase = "overflow-hidden rounded-3xl border transition-all duration-500";
  const cardExpanded = "border-[#C9A86A]/40 shadow-[0_12px_45px_rgb(201,168,106,0.12)] ...";
  const cardCollapsed = "border-white/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] ...";
  ```

---

## Summary

| Priority | Count | Key Theme |
|----------|-------|-----------|
| P1 (Must Fix) | 5 | Performance (GPU), content duplication, animation delays, text readability |
| P2 (Should Fix) | 6 | Reduced motion, keyboard a11y, responsive edge cases, spacing consistency |
| P3 (Nice to Have) | 6 | Contrast, maintainability, minor interaction polish |

**Top 3 highest-impact changes for developer:**
1. Remove duplicate actionableSteps + duplicate meta pills (P1.2 + P1.3) — instant cleanliness win
2. Simplify animation delays to 2-3 wave groups + add reduced-motion support (P1.4 + P2.1) — perceived performance boost
3. Kill or static-ify infinite background animations (P1.1) — real performance win on mobile
