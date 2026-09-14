# AITA — Module Roadmap (next build phase)

**Decided:** 2026-07-31
**Rule:** build the 3 modules below, then **freeze features and run the pilot.** Everything under "Deferred" and "Won't do" waits until after a real classroom pilot.

---

## Scope at a glance

| # | Module | Status | Rough effort | Cost |
|---|---|---|---|---|
| 1 | Group / Class logic (Google Classroom-style) | ✅ BUILD | ~1 week | Dev time only |
| 2 | Anti-cheat: tab/focus detection + obvious-cheating flags | ✅ BUILD | ~2–4 days | Zero (client-side) |
| 3 | Reuse original paper images (preserve mode) | ✅ BUILD | ~3–5 days | Low (local extraction) |
| 4 | Internalization / pre-generated question bank | ❌ WON'T DO | — | — |

---

## Module 1 — Group / Class logic ✅

**Goal:** Google Classroom-style classes. A teacher creates a class; students join with a code. Solo users get a default/personal group.

**Build:**
- **DB (Prisma):**
  - `Group` — `id`, `name`, `code` (6-char unique), `creatorId` (admin), `archived` (bool), `createdAt`.
  - `GroupMember` — `groupId`, `userId`, `role` (`ADMIN` | `MEMBER`), unique `[groupId, userId]`.
  - Link `Session.groupId` (optional) so sessions belong to a class.
- **API:**
  - `GET /api/groups` — user's groups (incl. their default "General Workspace").
  - `POST /api/groups/create` — create class (creator becomes ADMIN).
  - `POST /api/groups/join` — join by 6-char code.
  - `DELETE /api/groups/:id` (or `/leave`) — soft-delete/leave **while preserving other members' records**.
  - `GET /api/groups/:id/analytics` — **admin-only** cumulative class analytics.
- **Frontend:**
  - Groups dashboard (grid of classes + "Create" and "Join with code" modals).
  - Group detail screen: admin-only cumulative analytics bar; inside each class → Solo Assessment (General Aptitude + Custom Exam) and Live Group Sessions.
- **Rules:** creator = admin (only admin edits/regenerates code/archives); cumulative class analytics visible to admin only; members see their own performance; leaving/deleting never wipes other members' records.
- **Solo users:** auto-create a default "General Workspace" group; users can also create personal named groups.

**Keep v1 simple** — don't over-build analytics. Basic class + join + teacher view + a few aggregate stats is enough.

**Done when:** create a class → join it from a 2nd account → admin sees analytics, member doesn't → a member leaving preserves everyone else's records.

---

## Module 2 — Anti-cheat: tab/focus + obvious-cheating flags ✅

**Goal:** deter casual cheating during quizzes. **Especially important for Custom/Material exams**, where every student gets the *same* exam (so answer-sharing is possible — the "unique scenario per student" anti-cheat only protects the aptitude engine, NOT custom exams).

**Build:**
- **Tab/focus detection:** during an active quiz, listen to `document.visibilitychange` + `window.blur/focus`. Count + timestamp every "left the quiz" event.
- **Fullscreen enforcement:** request fullscreen on quiz start; detect and count fullscreen exits.
- **Disable** copy / paste / right-click / text-selection during the quiz.
- **Obvious-cheating flags → teacher dashboard:** per attempt, record tab-switch count, time spent away, fullscreen exits, paste attempts, abnormally fast completion. Mark attempts over a threshold as "⚠️ Suspicious."
- **Optional:** after N violations, show a warning / auto-submit (configurable by teacher).
- **Transparency:** tell students up front that focus is monitored (consent + it's a stronger deterrent).

**Honest limits (document in-app):** cannot detect a **second physical device/monitor or a phone** — true for us *and* for commercial proctoring tools. This is a **deterrent, not a guarantee.**

**Done when:** switching tabs increments a counter saved to the attempt record, and the teacher dashboard shows per-student violation flags.

---

## Module 3 — Reuse original paper images (preserve mode) ✅

**Goal:** when a teacher uploads a figure-heavy paper (diagram/graph/image), **keep the original images with their questions** instead of dropping them. **We do NOT generate images — only reuse the ones already in the uploaded file.**

**Build:**
- **Extract embedded images on upload:** DOCX → unzip `word/media/`; PDF → extract embedded images via a PDF lib. Store each image (base64 or file) linked to the exam.
- **Preserve mode:** parse the paper's **existing questions + their associated figures** and render them in the interactive quiz — do **not** regenerate the questions for image-heavy papers. (Mapping images to freshly-generated questions is unreliable; preserving originals is clean.)
- **Display** each extracted image inline with its question in the quiz UI.
- **Teacher fallback:** allow the teacher to attach/reorder an image to a question manually, in case auto-positioning is off.

**Caveat:** works cleanly in *preserve* mode (keep original questions). Do **not** try to attach old images to AI-generated new questions.

**Priority:** genuine need for some theoretical papers (geography, biology-theory, etc.), but a **v2 item** — not needed for the Pak Studies pilot.

**Done when:** uploading a DOCX/PDF with a diagram shows that diagram alongside its question in the generated quiz.

---

## Module 4 — Internalization / pre-generated bank ❌ WON'T DO

Decided **not** to pursue. Reasons:
1. **Self-hosting LLMs costs more than the API** at our scale (GPUs > pay-per-token until very high volume).
2. **Pre-generating a bank doesn't fit our flow** — custom/material questions are generated from the teacher's runtime-uploaded material.
3. **No real problem to solve:** a custom/material exam is generated **once** (teacher-side at setup), then the whole class takes the same one — so there's **no per-student latency or cost** to optimize. The 25–46s generation time only applies to the live unique-scenario mode, which the pilot won't use.

**Cheap wins we could still do later if cost ever matters:** self-host fonts/assets; lean on MCQs (auto-graded, no LLM); client-side OCR (Tesseract.js) for printed papers. Not needed now.

---

## Deferred / v2 (after pilot)
- **Unique question set per student from the same material** — restores sharing-resistance for custom exams, but adds per-student latency/cost + grading-consistency issues. Tradeoff; later.
- **Reuse-images** polish (better auto-positioning).

## Won't do (documented so we don't revisit)
- **Webcam gaze/eye-tracking proctoring** — unreliable in-browser, heavy on low-end devices, serious privacy/legal risk (esp. minors).
- **Screen-capture screenshots** — browsers forbid *silent* capture (always consented + shows an indicator), circumventable via a 2nd screen, privacy/storage load.
- **AI-generated diagrams/graphs** — inaccurate labels; bad for exams.

---

## The stop line
Build **1 → 2 → 3**, then **stop adding features, polish, and run the Pak Studies pilot.** The pilot is what creates the value — every extra module just delays it.
