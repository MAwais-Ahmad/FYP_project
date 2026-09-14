# AITA — Recommendations System: Enhancement Plan

**Created:** 2026-07-31
**Verdict:** Keep the recommendation feature — it completes the "detect → act" loop and is a core differentiator. But the **current implementation is fragile** and needs the fixes below before it's "official / demo / buyer" grade.

---

## Current state (what's in the code today)
- Defined in **`src/utils/classifyLearner.ts`** → `LEARNER_CATEGORIES`.
- Each of the **8 categories** has: `description`, `pattern`, `solutionType`, `focusArea`, and **`youtubeVideos`** (a list of `{ title, url }`).
- **24 hardcoded YouTube links total** (3 per category).
- Rendered in **4 screens:** `CustomResultsScreen.tsx`, `GeneralResultsScreen.tsx`, `RecordDetail.tsx`, `ResultsScreen.tsx`.
- Advice is **generic per category** (same for everyone in that category).

---

## The problems (honest)
1. **🔴 Dead-link risk (biggest issue):** 24 fixed YouTube URLs. Videos get deleted / renamed / made private → **404s and wrong videos** will appear over time. A dead link in a demo in front of a buyer or examiner quietly kills credibility.
2. **🟡 Generic & shallow:** advice is identical for everyone in a category and is stuff teachers already know — not truly personalized.
3. **🟡 Not validated:** no evidence the recommendations improve outcomes → must not *claim* they do.
4. **🟡 Overclaimed wording:** calling a hardcoded category→content lookup an "Adaptive Content Recommendation Engine" is generous. Keep language honest (consistent with the rule-based-classifier framing in the research article).

---

## Fixes — tiered by priority & effort

### Fix 1 — De-risk the links (MUST DO, low effort) 🔴
Pick ONE approach (recommended: **A**):

- **A. Replace fixed video URLs with topic-based YouTube *search* links** (never 404):
  - Instead of `https://www.youtube.com/watch?v=Vmp2FAtHMrg`, use
    `https://www.youtube.com/results?search_query=how+to+avoid+careless+exam+mistakes`.
  - Store a **search topic string** per recommendation, build the URL from it. Always resolves to fresh, relevant results.
- **B. Small maintained curated set** — keep specific links but add a **link-checker script** (run periodically) that flags dead ones. Higher maintenance.
- **C. Show "suggested topics to study" as plain text/keywords** (no links at all) — zero rot, but less clickable value.

**Files:** `classifyLearner.ts` (change `youtubeVideos` → e.g. `resources: { title, searchTopic }`), then update the 4 result screens to build the search URL.

**Done when:** no fixed `watch?v=` URLs remain; every recommendation link always resolves to a valid page.

### Fix 2 — Honest framing (MUST DO, trivial) 🟡
- Relabel the section from anything implying validated intervention to **"Suggested Next Steps"** / **"Recommended Practice."**
- **Files:** the 4 result screens (heading/label text).
- Keep it consistent with the research article's honest tone.

### Fix 3 — Make advice metric-specific (MEDIUM, medium effort) 🟡
Instead of one generic block per category, tailor tips to the student's **actual weak metrics**:
- e.g., if `reflection_depth` is low → a reflection-specific tip; if `rushedDecisions` high → a slow-down tip.
- Simple rule-based mapping: metric threshold → targeted tip. No AI needed.
- **Files:** `classifyLearner.ts` (add a `tipsForWeakMetrics()` helper) + result screens to render the extra targeted tips.

### Fix 4 — AI-personalized recommendations (LATER / v2, has cost) 🔵
- At results time, call the LLM with the student's profile + weak areas + subject to generate **specific, personalized next steps**.
- Turns generic advice into real personalization.
- **Tradeoff:** per-result API cost + latency. Do this only after the pilot, and make it optional.

### Fix 5 — Teacher override (LATER / v2) 🔵
- Let a teacher add/edit recommended resources per class or subject (e.g., link their own material).
- Makes it subject-relevant and offloads link maintenance to the teacher.

---

## Suggested order of work
1. **Fix 1** (de-risk links) — before any demo/official use.
2. **Fix 2** (honest wording) — same pass, trivial.
3. **Fix 3** (metric-specific tips) — when polishing.
4. **Fix 4 / Fix 5** — v2, after the pilot.

## Honest guardrails
- **Never claim** the recommendations are proven to improve results — say "suggested."
- **No fixed external video URLs** in an official build — they rot.
- Keep it **maintainable** — the less hand-curated content, the fewer things break later.

## Acceptance criteria (for "official" grade)
- [ ] Zero hardcoded `watch?v=` links; all resource links resolve reliably.
- [ ] Section labeled as "Suggested Next Steps" (honest framing).
- [ ] (Optional) At least one **metric-specific** tip shown based on the student's actual weak area.
