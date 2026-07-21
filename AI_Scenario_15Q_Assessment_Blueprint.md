# 🎯 15-Question Assessment Blueprint — General AI Scenario Flow

> **Goal.** A fixed 15-question skeleton (random *content*, fixed *structure*) that implements the Trojan-Horse / 3-tier framework so that **all 17 telemetry features have a reliable source** and **all 8 learner categories are provably separable** — with the flaws of the current 12-question random-shuffle design closed.

---

## 1. Why the current design is flawed

The running builder `buildPhaseOrder()` (`server/server.cjs:844`) shuffles `INTERACTIVE_TYPES` (duplicated ×2) and slices 12. Consequences:

| Flaw | Effect |
| :-- | :-- |
| **No controlled 3-tier transfer** | Master doc's core mechanism (Direct → Near Transfer → Far Transfer) is not implemented. A **Superficial Mimic** (correct at L1, collapses at L2) is indistinguishable from a **Fast Learner**. This is the single biggest hole. |
| **Random type mix per run** | `timeVariance` is measured across heterogeneous types (MCQ ~40s vs slider ~45s vs ranking ~60s), so its value is dominated by *which types were drawn*, not the user's pacing. Non-comparable across runs → breaks retake normalization too. |
| **`multi-text` missing from `COGNITIVE_PHASES`** | `creativity_score` has no dedicated question — only weak inference. |
| **No `learning_orientation` probe** | Nothing explicitly rewards info-seeking vs guessing → the feature is guessed, not measured. |
| **Single reflection, thin metacognition** | `reflection_depth`, `self_awareness`, `learning_orientation` all lean on one reflection question. |

**Design fix principle:** *Fixed skeleton, fresh skin.* The **position, type, and tier** of every question is fixed (parallel-forms psychometrics). Only the **story/content** is AI-randomized. This keeps every run comparable (reliable `timeVariance`, valid transfer measurement) while staying non-repetitive across retakes.

---

## 2. Why exactly 15 (coverage math, no waste)

| Bucket | Qs | Purpose |
| :-- | :-: | :-- |
| Step A — Calibration baseline | 1 | Speed multiplier (reading-speed normalization) |
| Comprehension anchor | 1 | Establish the scenario + core tension |
| **3-Tier Rule Spine** (2 per level) | 6 | The diagnostic engine (L1 direct / L2 near / L3 far) |
| Learning-orientation probe | 1 | `learning_orientation` source |
| Creativity / divergent | 2 | `creativity_score` source |
| Collaboration | 1 | Communication + text volume |
| Consistency re-probe | 1 | Late-test item → phase accuracy/pacing variance |
| Self-awareness / risk recognition | 1 | `self_awareness` source |
| Reflection (unlimited) | 1 | `reflection_depth` (+ self-awareness, orientation) |
| **Total** | **15** | |

12 is too few to hold a 2-item-per-level spine **and** dedicated cognitive probes. 15 is the minimum that does. More than 15 adds fatigue without new coverage.

---

## 3. The fixed blueprint (positions are ordered; order matters)

| # | Step / Tier | phaseName | type | timeLimit | Scored? | Primary features it feeds |
| :-: | :-- | :-- | :-- | :-: | :-: | :-- |
| 1 | **A — Baseline** | Interaction Calibration | `tap` (unscored) | ~10s | ❌ (calibration only) | *Speed multiplier* → normalizes `avgResponseTime`, `avgTimeToStart` |
| 2 | Comprehension | Understanding | `text` | 60s | partial | `totalResponseLength`, `reflection_depth` |
| 3 | **C — Level 1 (Direct)** | Information Filtering | `mcq` | 40s | ✅ | `accuracyScore(L1)`, timing, `decisionStyle` |
| 4 | **C — Level 1 (Direct)** | Planning | `ranking` | 60s | ✅ | `accuracyScore(L1)`, `totalAnswerChanges` |
| 5 | **C — Level 2 (Near Transfer)** | Risk Mitigation | `mcq` | 40s | ✅ | `accuracyScore(L2)` ← **Mimic collapse point** |
| 6 | **C — Level 2 (Near Transfer)** | Resource Allocation | `slider` | 45s | ✅ | `accuracyScore(L2)`, `totalAnswerChanges` |
| 7 | **C — Level 3 (Far Transfer)** | Execution Twist | `mcq-urgent` | 30s | ✅ | `accuracyScore(L3)`, `self_awareness`, `rushedDecisions` |
| 8 | **C — Level 3 (Far Transfer)** | Complex Dilemma | `mcq` | 50s | ✅ | `accuracyScore(L3)` ← **Strategic vs Ignorer**, `avgTimeToStart` spike |
| 9 | Orientation probe | Information Seeking | `mcq` | 40s | orientation | `learning_orientation` (one option = gather data/test/ask) |
| 10 | Divergent | Three Approaches | `multi-text` | 90s | ❌ | `creativity_score`, `totalResponseLength` |
| 11 | Divergent | Resourceful Constraint | `slider` | 45s | ✅ | `creativity_score`, `accuracyScore` |
| 12 | Collaboration | Collaboration | `text` | 60s | partial | `totalResponseLength`, `self_awareness` |
| 13 | **Consistency re-probe** | Information Filtering II | `mcq` | 40s | ✅ | `accuracyScore(late)` → **phase variance**, `timeVariance` |
| 14 | Metacognition | Risk / Mistake Recognition | `text` | 60s | ❌ | `self_awareness` |
| 15 | Metacognition | Reflection | `reflection` | 0 (∞) | ❌ | `reflection_depth`, `self_awareness`, `learning_orientation` |

**Ordering rules (fixed):** Q1 first; Q2 second; the L1→L2→L3 spine (Q3–Q8) **must** stay in ascending-tier order (transfer is meaningless otherwise); Q15 reflection **always last**. Within a tier the two items may swap freely for anti-gaming. Everything else is fixed.

**Passive telemetry** (`rushedDecisions`, `overthinkingCount`, `overtimeCount`, `backtrackCount`, `skippedQuestions`, `confidence`) is captured across **all timed items (Q2–Q14)**; Q1 is excluded from aggregates and used only for the multiplier; Q15 (timeLimit 0) is excluded from overtime/rushed.

---

## 4. THE linchpin — one hidden logic rule, three skins (prompt change)

The 3-tier spine only works if L1/L2/L3 share **one underlying rule**. Today the prompt doesn't enforce this. The generation prompt (`server.cjs:1586`) must be changed to:

> Define ONE hidden `LOGIC_RULE` for this scenario (e.g. *"prioritise the option that reduces the highest-probability irreversible loss"*).
> - **L1 (Q3–Q4):** apply `LOGIC_RULE` *directly* in the main story. Correct answer follows the rule plainly.
> - **L2 (Q5–Q6):** re-skin — **same `LOGIC_RULE`, completely different sub-context** (new characters/domain). Surface vocabulary changes; the rule does not.
> - **L3 (Q7–Q8):** inject a **hidden variable or noise** that changes what the rule *implies* (a twist, a misleading option, a constraint flip). The rule still governs, but naive pattern-matching fails.
> Return a per-item `answerKey` + `level` for every scored item so the evaluator can compute **per-level accuracy**.

Without this, L2/L3 are just "more questions" and the Mimic/Strategic distinctions collapse. **This is the make-or-break change.**

---

## 5. Proof: all 17 features have a reliable source

| # | Feature | Source(s) | Reliable? |
| :-: | :-- | :-- | :-: |
| 1 | `avgResponseTime` | All timed Q2–Q14, ÷ baseline multiplier (Q1) | ✅ |
| 2 | `avgTimeToStart` | First-interaction latency, every question | ✅ |
| 3 | `timeVariance` | **Fixed type mix** → z-scored within type, comparable across runs | ✅ (was broken) |
| 4 | `rushedDecisions` | Any timed Q < 15s | ✅ |
| 5 | `overthinkingCount` | Any timed Q > 60s | ✅ |
| 6 | `overtimeCount` | Per-type `TIME_BY_TYPE` overrun | ✅ |
| 7 | `totalAnswerChanges` | 9 interactive items (Q3,4,5,6,7,8,9,11,13) | ✅ |
| 8 | `backtrackCount` | Back-navigation, whole test | ✅ |
| 9 | `confidence` | Derived: pacing + low-revision + accuracy + reflection | ✅ |
| 10 | `totalResponseLength` | 5 text sources (Q2,10,12,14,15) | ✅ |
| 11 | `skippedQuestions` | Null answers, whole test | ✅ |
| 12 | `decisionStyle` | Derived from normalized `avgResponseTime` | ✅ |
| 13 | `accuracyScore` | 7 scored items across 3 levels + re-probe (Q3,4,5,6,7,8,11,13) | ✅ + **per-phase variance** |
| 14 | `reflection_depth` | Q15 reflection + Q2 understanding (LLM) | ✅ |
| 15 | `self_awareness` | Q7 risk choice + Q14 risk-recognition + Q15 | ✅ (was thin) |
| 16 | `learning_orientation` | Q9 info-seeking MCQ + Q15 | ✅ (was missing) |
| 17 | `creativity_score` | Q10 multi-text + Q11 resourceful slider (LLM) | ✅ (was missing) |

Every feature now has ≥1 dedicated source; the four previously weak/missing ones (3, 15, 16, 17) are closed.

---

## 6. Proof: all 8 categories are separable

The **per-level accuracy** (L1/L2/L3) + **latency-by-level** + **cognitive-4** give clean discriminators. No two categories share the same signature.

| Category | Decisive discriminator (enabled by this blueprint) |
| :-- | :-- |
| ⚡ `quick_careless` | Low latency across spine **but** accuracy drops even at L1; `rushedDecisions` high, `reflection_depth` low. |
| 🐢 `slow_thorough` | High accuracy at **all** levels **with uniformly high latency**; high `totalAnswerChanges`. |
| 😰 `concept_struggler` | **Fails L1 (direct)** — the key tell; low `confidence`, high `backtrackCount`. |
| 🚀 `fast_learner` | **Accuracy holds L1→L3** at low latency (true transfer). |
| 🎲 `inconsistent_performer` | **Accuracy variance across phases > 0.30** (early Q3/4 vs re-probe Q13) + high `timeVariance`. ← Q13 exists for this. |
| 📈 `steady_achiever` | Mid latency, stable mid-high accuracy across levels, low `timeVariance`. |
| 🎯 `strategic_thinker` | Accuracy holds to **L3** with a **deliberate `avgTimeToStart` spike at Q7/Q8** + high `creativity`/`reflection_depth`/`self_awareness`. (Separates from `slow_thorough`: latency is *targeted at far transfer*, not uniform, and cognitive-4 are high.) |
| 🙈 `ignorant_avoider` | `skippedQuestions ≥ 2` or minimal engagement (low `totalResponseLength` on text + fast+wrong). |

**Critical separations this design newly enables (impossible under random shuffle):**
- **Fast Learner vs Superficial Mimic** → mimic is correct at L1, **collapses at L2** near-transfer.
- **Strategic Thinker vs Slow-but-Thorough** → both slow/accurate, but strategic's latency is **localized to L3** with high cognitive-4; slow_thorough is uniformly slow.
- **Concept Struggler vs Quick-Careless** → struggler fails L1 slowly with low confidence; careless fails fast with normal confidence.

---

## 7. Scoring requirements (for `/api/evaluate-scenario`)

- Scored items (Q3,4,5,6,7,8,11,13) must carry an `answerKey` + `level` from generation.
- Evaluator returns **per-level accuracy** `{L1, L2, L3, reprobe}` in addition to overall `accuracyScore`, so the classifier can compute transfer-drop and phase-variance.
- Q9 scored on **orientation** (did they pick the info-seeking option?), not correctness.
- Q10/Q11/Q14/Q15 → LLM cognitive scoring (`creativity_score`, `self_awareness`, `reflection_depth`).

---

## 8. Code changes required (summary — not implemented here)

1. `server.cjs` — replace `buildPhaseOrder()` with the **fixed 15-slot blueprint** (Section 3); add `tap` (baseline) and ensure `multi-text` are in the type set; add `TIME_BY_TYPE.tap`.
2. `server.cjs` — rewrite the generation user-prompt to enforce the **one-rule-three-skins** contract (Section 4) and require `answerKey` + `level` per scored item.
3. `/api/evaluate-scenario` — return **per-level accuracy**; keep hybrid LLM→heuristic fallback.
4. `classifyLearner.ts` — consume per-level accuracy + latency-by-level; add the Mimic and Strategic discriminators.
5. Frontend `QuestionTypes.tsx` — render the `tap` baseline interaction; everything else already supports the types used.

---

## 9. Definition of done

- Fixed 15-slot skeleton live; content still randomized per run.
- All 17 features populated from a dedicated source every run.
- Per-level accuracy computed → Mimic vs Fast-Learner and Strategic vs Slow-Thorough separate cleanly.
- `timeVariance` is comparable across runs (fixed type mix).
- No category shares a discriminator signature with another.
