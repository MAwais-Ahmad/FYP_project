# AITA — Module Breakdown

Target: University students (18-25 age group)
Model: gpt-4o-mini

---

## Module 1: Questions ✅
Generate creative, varied, scenario-based questions across multiple formats.
- 6 scenario formats (budget, ethical dilemma, crisis, team conflict, tradeoff, time management)
- Difficulty meter (1-10 slider on welcome screen)
- 4 phases per scenario: Understanding → Planning → Execution → Reflection
- 7 questions per scenario, GPT-generated and context-specific
- Pakistani 18-25 cultural context baked into prompts
- Different every refresh
- STATUS: ✅ Done

## Module 2: Feature Extraction ✅
Track and extract behavioral data while student answers.
- Bucket 1: Timing (response time, variance, rushed/overthinking counts) — ✅ Done
- Bucket 2: Accuracy (GPT-scored answer quality) — ✅ Done
- Bucket 3: Behavioral (answer changes, backtracks, confidence) — ✅ Done
- Bucket 4: Cognitive (reflection depth, creativity, self-awareness) — ✅ Done
- Bucket 5: Learning (improvement rate across scenarios) — ✅ Done
- STATUS: ✅ Done

## Module 3: Adaptive Questions ✅
Adjust difficulty dynamically based on student performance.
- User picks difficulty via slider on welcome screen (1-10)
- Between rounds: user adjusts difficulty based on how hard they felt it was
- System also sends adaptive signal (harder/easier/consistency_test) to GPT
- GPT adjusts complexity, ambiguity, stakeholder count, time pressure
- Up to 3 rounds, user can finish early
- STATUS: ✅ Done

## Module 4: ML Categorization ✅
Classify student into one of 8 learner types using extracted features.
- Rule-based classifier (mimics Random Forest)
- 8 categories: Quick-Careless, Slow-Thorough, Concept Struggler, Fast Learner, Inconsistent, Steady Achiever, Strategic Thinker, Ignorant/Avoider
- Primary + secondary category with confidence scores
- STATUS: ✅ Done

## Module 5: Personalized Solutions ✅
Provide recommendations based on learner category.
- YouTube video topic suggestions per category
- AI session recommendations per category
- Different messaging for lacking vs excelling students
- STATUS: ✅ Done

---

## Work Order
1. ~~Module 1 (Questions)~~ ✅
2. ~~Module 2 (Feature Extraction)~~ ✅
3. ~~Module 3 (Adaptive)~~ ✅
4. ~~Module 4 (ML Categorization)~~ ✅
5. ~~Module 5 (Personalized Solutions)~~ ✅
