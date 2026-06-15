# AITA — Proposed System Improvements & Uncompleted Upgrades

This document outlines the gaps, uncompleted upgrades, and detailed technical specifications for the next phase of the **AITA (AI Teacher Assistant) Personalized Learning Style Detection System**.

---

## 1. Scenario Formats & Learner Category Expansion

### The Gaps
1. **Limited Scenario Formats**: The current system only supports 6 basic scenario formats (budget allocation, ethical dilemma, crisis management, team conflict, tradeoff analysis, and time management). This results in predictable scenarios and narrow behavioral observation.
2. **Learner Category Misalignment**: The learner categorization is not fully aligned or robustly implemented between the project description (which mentioned 6 types) and the classification code (which contains 8 types, including `ignorant_avoider`).

### Proposed Action Items
* **Vasten Scenario Formats (10+ Categories)**: Expand scenario generation to include at least 10 different formats to capture a broader array of learning styles and cognitive habits. Suggested new formats:
  * **Resource Constraint Scenarios**: Managing equipment or facilities instead of budget.
  * **Peer Review & Feedback**: Handling critical academic evaluation.
  * **Uncertainty & Incomplete Data**: Decision-making when half the information is missing.
  * **Innovation & Ideation**: Proposing solutions with high failure risk but high reward.
  * **Cross-cultural Communication**: Managing international team dynamics.
* **Properly Implement & Align Learner Categories**: Ensure the system classifies and tracks all 8 intended categories comprehensively, establishing clearer boundary conditions in the classification engine (`classifyLearner.ts`).

---

## 2. Compact Viewport UI (Eliminating Vertical Scrolling)

### The Gaps
The current `QuizScreen` layout has high vertical spacing, forcing students to scroll down to see hints, inputs, or click "Next" / "Previous" navigation buttons. This disrupts the test-taking experience.

### Proposed Action Items
* **Shrink and Consolidate Viewports**: Modify styles and container structures so the entire interactive workspace fits onto a single screen without vertical scrolling.
* **Flexbox/Grid Re-layout**:
  * Put the scenario narrative card and the active question card side-by-side on wide screens.
  * Reduce margins, padding, and font sizes to ensure optimal visibility of all options, input boxes, and buttons in a single viewport.
  * Use fixed positioning or container limits for navigation buttons so they are always visible above the fold.

---

## 3. Dynamic Feature-Based Confidence & Anti-Gaming Logic

### The Gaps
1. The system asks the user for self-reported confidence using a 1-10 slider bar in the Reflection phase. This is intrusive and subjective.
2. Students can "game" the system or trigger false classifications by simply clicking "Next" rapidly and skipping questions without reading.

### Proposed Action Items
* **Implicit Confidence Scoring**: Remove the manual confidence rating slider. Instead, extract confidence from the open text question ("What would you do better? / How would you improve?") and calculate it dynamically based on behavioral metrics.
* **Anti-Gaming Gatekeeper**: 
  * If a student exhibits skipping behavior (skipping multiple questions rapidly, short session time, blank answers), assign a confidence score of **0** and flag them directly as `ignorant_avoider`.
* **Dynamic Points Adjustments**: Construct a points-based adjustment system to calculate the final confidence score:
  * **Time Limits**: Deduct points if the student overestimates/goes overtime. Award bonus points if they finish before the time limit.
  * **Difficulty Multiplier**: Boost points if they successfully complete a high-difficulty round (Level 7-10).
  * **Interaction Metrics**: Adjust points based on `backtrackCount` and `totalAnswerChanges` (high revisions might signal hesitation/lower confidence).

```typescript
// Proposed dynamic confidence calculation structure
function calculateDynamicConfidence(
    behavioralMetrics: OverallMetrics,
    chosenDifficulty: number,
    isSkippingBehavior: boolean
): number {
    if (isSkippingBehavior) return 0;

    let confidencePoints = 5; // Base starting confidence

    // 1. Time Penalty / Bonus
    if (behavioralMetrics.overtimeCount > 0) {
        confidencePoints -= behavioralMetrics.overtimeCount * 0.75;
    } else if (behavioralMetrics.rushedDecisions === 0) {
        confidencePoints += 1.5; // Done in time, deliberate
    }

    // 2. Difficulty Multiplier
    if (chosenDifficulty >= 7) {
        confidencePoints += 1.5; // Bonus for choosing harder levels
    } else if (chosenDifficulty <= 3) {
        confidencePoints -= 0.5; // Small penalty for easy difficulty
    }

    // 3. Hesitation Adjustments
    if (behavioralMetrics.backtrackCount > 3) {
        confidencePoints -= 1.0; // Backtracking points to hesitation
    }
    if (behavioralMetrics.totalAnswerChanges > 4) {
        confidencePoints -= 0.8;
    }

    // Clamp score between 0 and 10
    return Math.max(0, Math.min(10, confidencePoints));
}
```

---

## 4. Fixing Cognitive Features Extraction

### The Gaps
Cognitive features (reflection depth, self-awareness, learning orientation, creativity score) returned by the GPT evaluation API are currently static, failing, or returning inaccurate default mock values.

### Proposed Action Items
* **Revise LLM Evaluation Prompting**: Enhance the system prompt in `server.cjs` under `/api/evaluate-scenario` to give specific rubrics for each score:
  * **Reflection Depth**: Scored on word count, keyword analysis (e.g., "because", "due to", "consequently"), and complexity of reasoning.
  * **Self-Awareness**: Evaluated by looking for self-critical phrases or recognition of errors in the reflection answers.
  * **Creativity Score**: Checked against standard responses to evaluate if the student recommended out-of-the-box approaches.
* **Hybrid Evaluation Pipeline**:
  * Implement client-side heuristics (e.g., text length checking, semantic parsing) to serve as a reliable fallback score when LLM evaluation fails.

---

## 5. Overhauling Results Screen Design

### The Gaps
The current `ResultsScreen.tsx` is functional but does not match the premium user experience mockups.

### Proposed Action Items
* **Re-implement Layout**: Refactor the Results screen to align completely with the designs defined in [Screen4_ResultsScreen.png](file:///d:/Projects/FYP_project/designs/Screen4_ResultsScreen.png).
* **UI Features to Add/Refine**:
  * High-fidelity learner profile summary badge.
  * Clear grid separation for the ML feature vector and recommendations.
  * Sleek cards for curated learning pathways (YouTube, AI practice sessions).

---

## 6. Dual Dashboards: Student & Teacher Views

### The Gaps
Currently, the application only supports a single-user flow (the Student view). There is no dashboard for instructors to analyze class-wide learning metrics.

### Proposed Action Items
* **Create Student Dashboard**: A dashboard showing personalized metrics, history of rounds, specific category blends, and dynamic recommendations.
* **Create Teacher Dashboard**: An aggregator interface containing:
  * Class-wide analytics: average performance scores, distribution of all 8 learner categories (e.g., a pie chart or bar chart).
  * Student registry table: searchable list of students showing their primary/secondary categories, confidence, and date taken.
  * Detailed logs: capability to click on a student's name and view their detailed question-by-question metrics and AI-generated feedback.
  * Class learning curves.

---

## 7. Learning Curve Accuracy Refinements

### The Gaps
The visual learning curves displayed on the dashboard are not accurately reflecting students' real-time improvements or cognitive adaptations across successive rounds.

### Proposed Action Items
* **Track Cumulative Metrics**: Make sure the progress curves are fed with accurate historical metrics across rounds (Scenario 1 → Scenario 2 → Scenario 3).
* **Calibrate Performance Score**: Tune `calculatePerformanceScore` to accurately reflect changes in difficulty, adjusting scores higher if they succeed at harder tasks.

---

## 8. Anti-Predictability & Dynamic Shuffling (Dynamic Phase & Question Selection)

### The Gaps
If a student takes the quiz multiple times or if many students share scenarios, they will recognize the patterns. The questions defined in the fallback or early prompts can become predictive, and the phase-by-phase structure (always Q1-Q2 for Understanding, Q3-Q4 for Planning, etc.) becomes monotonous.

### Proposed Action Items
* **Shuffled Dynamic Question Pool**: The quiz session will always consist of exactly **7 questions**, but their phases and question types are no longer hardcoded or linear. GPT will select, shuffle, and customize the 7 questions from a pool of **7 cognitive phases**:
  1. *Understanding* (Core tension/problem identification)
  2. *Information Filtering* (Choosing which data/files/resources to trust)
  3. *Planning* (Strategic solutions and allocation grids)
  4. *Risk Mitigation* (Identifying failure points and Plan B)
  5. *Execution Twist* (Pressure response to a sudden change/crisis)
  6. *Collaboration/Delegation* (Persuasion, team role assignment)
  7. *Reflection* (Hindsight, calibration, self-grading)
* **Dynamic Timing & Types**: For each scenario, GPT will output exactly 7 questions in a randomized sequence of these phases. GPT dynamically provides the question text, hint, options, phase metadata, and time limit (e.g., 30s for twists, 120s for planning) based on complexity.
* **Shuffling Mechanics**: Instruct the LLM backend to shuffle structural details (stakeholders, resource values, names) dynamically.
* **Dynamic Twist Generation**: Make sure the "Urgent Twist" (Phase 3 MCQ-Urgent) is dynamically randomized and is not hardcoded or predictable.
* **Inject Varied Prompts**: Add 50+ localized Pakistani scenarios seeds (e.g., university fest budget, freelancing conflict, hostel warden dispute) to the server prompt repository to ensure infinite variety.

---

## 9. Direct Question Navigation Panel (Jump to Question)

### The Gaps
Currently, if a student reaches the end of the round (e.g., Question 7) and wants to revisit or edit a previous response (e.g., Question 1), they have to click the "Previous" button 6 times, stepping back through every individual question sequentially. There is no direct jump method.

### Proposed Action Items
* **Question Navigation Map / Grid**: Implement a dynamic stepper or pagination grid (e.g., small numbered bubbles 1-7) in the quiz interface.
* **Direct Click Jump**: Allow students to click directly on any question number in the navigation panel to jump straight to that question's card (e.g., from Q7 directly to Q1).
* **Visual Status Indicators**:
  * Style each bubble according to status: *Completed* (answered), *Active* (current question), and *Unanswered/Skipped*.
  * Make sure jumping dynamically records a backtrack metric only when the student navigates to an earlier question, maintaining accuracy for behavioral feature extraction.
