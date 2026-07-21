import { CustomExamQuestion } from '../types/quiz.types';

// ─── COGNITIVE PROFILING PROBES ──────────────────────────────────────────────
// Marks-free written questions auto-appended to every custom exam so the four
// cognitive features (reflection_depth, self_awareness, learning_orientation,
// creativity_score) can ALWAYS be measured by the AI grader — even for a paper
// made entirely of MCQs, which otherwise yields no free text to analyse.
//
// They carry marks:0 and probe:true, so they never affect the score, correctness
// review, or skip counts — they exist purely to feed the cognitive evaluation.
//
// NOTE: This list is mirrored server-side in server/server.cjs (COGNITIVE_PROBES)
// for AI-generated / parsed exams, which are graded from the server's stored copy.
// Keep the two in sync if you change the wording.
export const COGNITIVE_PROBES: Omit<CustomExamQuestion, 'id'>[] = [
    {
        type: 'long',
        marks: 0,
        probe: true,
        question:
            'Reflection: Looking back over this exam, which question challenged you the most and how did you work through it? What would you do differently next time?',
        options: [],
    },
    {
        type: 'short',
        marks: 0,
        probe: true,
        question:
            'When you were unsure of an answer, what did you actually do — guess, eliminate options, reason it out, or something else? How do you usually close a gap in your knowledge?',
        options: [],
    },
    {
        type: 'short',
        marks: 0,
        probe: true,
        question:
            'Pick one idea from this exam and explain how you would teach it to a friend in a clear, memorable way.',
        options: [],
    },
];

// Append the cognitive probes to an exam's question list, numbering them AFTER the
// real questions. Idempotent: if probes are already present, the list is returned
// unchanged (prevents double-append when both client and server run).
export function appendCognitiveProbes(questions: CustomExamQuestion[]): CustomExamQuestion[] {
    if (questions.some(q => q.probe)) return questions;
    const maxId = questions.reduce((m, q) => Math.max(m, q.id), 0);
    const probes = COGNITIVE_PROBES.map((p, i) => ({ ...p, id: maxId + 1 + i }));
    return [...questions, ...probes];
}
