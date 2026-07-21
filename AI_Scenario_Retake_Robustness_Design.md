# 🔁 Design: Retake Robustness & Longitudinal Profiling — General AI Scenario Flow

> **Scope.** This design applies **only** to the *General AI Scenario* assessment (the "Existing Flow" card):
> `startQuiz() → loadScenario() → /api/generate-scenario → completeScenario() → /api/evaluate-scenario → classifyLearner.ts → Record`.
> It does **not** touch the custom teacher-exam flow (`/api/generate-exam`, `/api/grade-exam`) or classroom Sessions.

---

## 1. Problem statement

The scenario flow is designed to profile *how* a user thinks. But the profile is only trustworthy on a user's **first** exposure. On repeat attempts it degrades for two independent reasons:

| Threat | What happens | Currently handled? |
| :-- | :-- | :-- |
| **A. Content memorization** | User recognises a scenario/answer they've seen before → accuracy inflates artificially. | ✅ **Mostly solved.** Every scenario is generated fresh by `gpt-4o-mini` (`server.cjs:1586`) with a random seed (`SCENARIO_SEEDS`, `server.cjs:1574`) and shuffled phase order (`buildPhaseOrder`, `server.cjs:1575`). These are always "parallel forms," never "identical forms." |
| **B. Process / interface familiarity & gaming** | User learns the UI (timing drops for non-cognitive reasons), learns what the cognitive scorer rewards (pads reflection text), and — because `classifyLearner.ts` is a **deterministic** rule engine — can reproduce a target label at will. | ❌ **Not handled.** This is what makes a profile "stop being predictive." |

**Psychometric grounding.** A single retest inflates scores by ~0.25 SD, and the effect is ~2× larger for *identical* forms than *parallel* forms (only identical forms allow item memory). Fresh AI content keeps us in the parallel-form regime, structurally halving the practice effect. The residual is process familiarity — which must be **normalized out**, not ignored. Robust adaptive-testing systems solve the analogous problem with **item-exposure tracking** and **aberrant-response detection**; we adapt scaled-down versions of both.

---

## 2. Design principle

> **Treat a retake as signal, not noise.** A single snapshot is noisy and gameable. A *trajectory across attempts* is robust, hard to fake, and becomes a sellable feature ("track your cognitive growth"). We move from emitting **one label per test** to emitting **a normalized label + a trend**.

Four coordinated fixes, all buildable on the current stack (React/Vite PWA + Express `server.cjs` + Prisma/Postgres) with **no new AI APIs**:

1. **Exposure & attempt tracking** (DB foundation)
2. **Practice-effect normalization** (cancel interface-learning from timing)
3. **Longitudinal trajectory profiling** (trend over snapshot)
4. **Gaming / consistency detection** (flag rather than trust)

---

## 3. Fix 1 — Exposure & attempt tracking (foundation)

### 3.1 Schema changes (`prisma/schema.prisma`)

Add an explicit attempt chain and a per-user exposure ledger. `Record` stays as-is (backward compatible); we add nullable columns + one new model.

```prisma
model Record {
  // ... existing fields unchanged ...

  // --- NEW: attempt linkage ---
  attemptNumber     Int      @default(1)   // 1 = first ever scenario run for this user
  isFirstAttempt    Boolean  @default(true) // convenience flag for weighting
  rawFeatures       Json?                   // the 17-feature vector BEFORE normalization
  normFeatures      Json?                   // features AFTER practice-effect normalization
  genuineness       Float?                  // 0..1 gaming/consistency confidence (Fix 4)
  flags             Json?                   // string[] of detected anomalies (Fix 4)

  @@index([userId, attemptNumber])
}

// --- NEW: what themes/seeds/archetypes a user has already been shown ---
model ScenarioExposure {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  attemptNumber Int
  scenarioTitle String                       // e.g. "🎓 The Hostel Budget Crisis"
  seedKey       String?                      // which SCENARIO_SEEDS entry inspired it
  formatKey     String?                      // which scenarioFormats entry was used
  themeTokens   String[]                     // extracted keywords (industry/setting/context)
  createdAt     DateTime @default(now())

  @@index([userId, createdAt])
}
```

> Add `exposures ScenarioExposure[]` to the `User` model relations.

### 3.2 Cross-session `previousThemes` (fixes the real leak)

Today `previousThemes` is `scenarioResults.map(r => r.scenarioTitle)` (`useQuizState.ts:286`) — **only the current session**. Change the source so it also pulls the user's **persisted** exposure history:

- New endpoint `GET /api/exposure-history` → returns last *N* (e.g. 20) `themeTokens` + `scenarioTitle`s for `userId`.
- `loadScenario()` merges `[...sessionThemes, ...persistedThemes]` before calling `apiGenerateScenario`.
- `/api/generate-scenario` already threads `previousThemes` into the `diversityPrompt` (`server.cjs:1582`) — no prompt change needed, just a richer input list.
- On each scenario generation, **write** a `ScenarioExposure` row (extract `themeTokens` from the generated `scenario.title` + `context_details`).

**Result:** the diversity rule now spans a user's entire history, not just one sitting. Zero extra AI cost — it only enriches an existing prompt field.

---

## 4. Fix 2 — Practice-effect normalization

Interface-learning makes timing features drift downward on retakes independent of cognition. We normalize each attempt's timing features against the **user's own baseline**, using an exponential familiarity-decay model (steep early, flat later).

### 4.1 Model

For a timing feature `f` (e.g. `avgResponseTime`, `avgTimeToStart`) on attempt `n`:

```
familiarityFactor(n) = 1 - k * (1 - e^(-λ * (n-1)))     // n=1 → 1.0 (no correction)
normalized_f = raw_f / familiarityFactor(n)
```

- `k` = max fraction of speedup attributable to familiarity (start ~0.20, i.e. cap correction at 20%).
- `λ` = decay rate (start ~0.9, so most of the effect is absorbed by attempts 2–3).
- Constants live in one config block (e.g. `src/utils/normalization.ts`) so they can be re-tuned from pilot data without touching logic.

Only **timing** features are normalized. Accuracy and cognitive scores are already protected by fresh content (Fix content-novelty), so they are **not** rescaled.

### 4.2 Wiring

- Compute in `completeScenario()` (`useQuizState.ts:149`) *after* `overallMetrics` are known, or server-side in `/api/evaluate-scenario` (cleaner — keeps logic off the client). **Recommendation: server-side**, so the client can't tamper with `attemptNumber`.
- `classifyLearner.ts` (`scoreCategory` at `:468`) consumes **`normFeatures`**; `rawFeatures` is stored for audit/retraining.

---

## 5. Fix 3 — Longitudinal trajectory profiling

Instead of returning a single archetype, compute a **trajectory** across the user's `Record` chain.

### 5.1 Trajectory object (persisted on latest `Record` or computed on read)

```jsonc
{
  "currentCategory": "steady_achiever",
  "trend": "improving",              // improving | stable | declining | volatile
  "trajectory": ["concept_struggler", "steady_achiever", "steady_achiever"],
  "confidenceDelta": +0.8,           // vs previous attempt (on the 1..10 confidence)
  "accuracyDelta": +0.12,
  "stabilityIndex": 0.74,            // how consistent the last k attempts are (0..1)
  "attemptsConsidered": 3
}
```

### 5.2 Rules

- **`trend`**: derived from the slope of `performanceScore` / `confidence` over the last *k* attempts (k=3–5). High variance across attempts → `volatile` (ties into Fix 4).
- **`stabilityIndex`**: inverse of category-churn + feature variance across attempts. A high stability index = a *robust* profile you can trust; low = "still settling, keep taking assessments."
- **Diagnostic weighting**: the **first attempt** carries the highest diagnostic weight (novel content, zero familiarity). Later attempts refine the trend but a repeat with recycled themes contributes less (weight scales with `stabilityIndex` and inverse exposure overlap).

### 5.3 UI

- Add a small **trajectory strip** on `ResultsScreen.tsx` (the hexagonal radar chart stays for the current snapshot).
- New endpoint `GET /api/trajectory?userId=…` → returns the object above from the `Record` chain. Dashboard shows the trend line.

**This is the single most defensible addition for the FYP viva** — it converts "the retake became predictable" into "we track cognitive development longitudinally, and we report reliability."

---

## 6. Fix 4 — Gaming / consistency detection

Cheap heuristic flags computed at `completeScenario` / evaluate time. Output a `genuineness` score (0..1) and a `flags[]` array; **low genuineness lowers `primaryConfidence`** rather than being hidden.

| Flag | Heuristic | Signals |
| :-- | :-- | :-- |
| `too_fast_too_perfect` | `avgResponseTime` implausibly low **and** `accuracyScore > 0.9` | Memorized/collaborated/automated. |
| `padded_reflection` | high `totalResponseLength` but low LLM `reflection_depth` | Gaming the text scorer with filler. |
| `implausible_swing` | feature vector jumps beyond `stabilityIndex` band vs prior attempts | Deliberate label-shopping across retakes. |
| `rapid_retake` | new attempt within a short window of a prior one | Trial-and-error against the classifier. |
| `low_engagement` | `skippedQuestions` high / near-zero `avgTimeToStart` throughout | Rushing (already partly in `ignorant_avoider`). |

- Phase 1: pure heuristics (no API).
- Phase 2 (optional): have `/api/evaluate-scenario` return a boolean `genuine` from the LLM alongside cognitive features (marginal token cost).

---

## 7. API contract summary

| Endpoint | Change |
| :-- | :-- |
| `GET /api/exposure-history` | **NEW.** Returns persisted `themeTokens`/titles for cross-session diversity. |
| `GET /api/trajectory` | **NEW.** Returns the longitudinal trajectory object. |
| `POST /api/generate-scenario` | Unchanged signature; now receives a **richer** `previousThemes`. On success, server writes a `ScenarioExposure` row. |
| `POST /api/evaluate-scenario` | Now also computes `normFeatures`, `genuineness`, `flags` (server-side normalization + gaming detection). Requires `attemptNumber` in the request (server derives it from the user's `Record` count — do **not** trust a client value). |
| Record create (`server.cjs:~1959`) | Persist `attemptNumber`, `isFirstAttempt`, `rawFeatures`, `normFeatures`, `genuineness`, `flags`. |

---

## 8. Rollout plan

1. **Migration** — add nullable `Record` columns + `ScenarioExposure` model; `prisma migrate`. Existing records default to `attemptNumber = 1`, `isFirstAttempt = true`. Backward compatible.
2. **Exposure tracking (Fix 1)** — write `ScenarioExposure` on generation; wire `GET /api/exposure-history` into `loadScenario`. *Immediately closes the cross-session theme leak.*
3. **Normalization (Fix 2)** — server-side timing normalization; classifier consumes `normFeatures`.
4. **Gaming flags (Fix 4)** — heuristic pass; feed into `primaryConfidence`.
5. **Trajectory (Fix 3)** — `GET /api/trajectory` + Results/Dashboard UI.
6. **Pilot & tune** — collect real attempts, tune `k`, `λ`, thresholds, and *report test-retest reliability* (a real FYP result).

---

## 9. Explicitly out of scope

- Retraining the classifier / reviving the shelved RandomForest (blocked on **real** labeled data — the current model is trained on synthetic data; ship heuristics first, collect data, then retrain).
- Custom teacher-exam flow and classroom Sessions.
- Urdu/bilingual generation (separate localization effort).
- Payment/monetization rails.

---

## 10. Definition of done

- A user retaking the assessment **never** sees a recycled theme across sessions (exposure ledger enforced).
- Timing features are normalized against the user's own history; raw + normalized both stored.
- Results show a **trajectory + trend + stability index**, not just a one-shot label.
- Gaming attempts are flagged and depress reported confidence.
- The pipeline can emit a **test-retest reliability** figure from real data.

*Once shipped, the "retake predictability" concern for the General AI Scenario flow is structurally closed and should not need to be revisited.*
