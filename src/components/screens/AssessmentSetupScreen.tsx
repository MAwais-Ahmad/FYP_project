import { useState, useRef } from 'react';
import { uploadPdf, generateExam, parsePaper } from '../../services/api';
import { CustomExamQuestion, CustomQuestionType, ExamDifficulty, GeneratedExam } from '../../types/quiz.types';
import { appendCognitiveProbes } from '../../utils/cognitiveProbes';

interface AssessmentSetupScreenProps {
    onStartAIScenario: () => void;
    onStartCustomExam: (exam: GeneratedExam) => void;
    onBack: () => void;
    userName?: string;
    // Session-authoring mode: the host is creating the paper for a session rather
    // than taking it. Custom exams are handed to onAuthorCustomExam (saved to the
    // session) and the AI Scenario card asks for a difficulty then calls
    // onAuthorScenario, instead of starting the assessment.
    sessionAuthor?: boolean;
    onAuthorCustomExam?: (exam: GeneratedExam) => void;
    onAuthorScenario?: (difficultyLevel: number) => void;
}

type SetupTab = 'select-mode' | 'custom-paper' | 'ai-material';
type CustomPaperMode = 'upload' | 'manual';

const MARKS_PER_MCQ = 1;
const MARKS_PER_SHORT = 3;
const MARKS_PER_LONG = 6;
const MAX_TOTAL_QUESTIONS = 40;

// Display label + badge colour for each question type.
const TYPE_META: Record<CustomQuestionType, { label: string; badge: string }> = {
    mcq: { label: 'MCQ', badge: 'bg-sky-500/20 text-sky-300' },
    short: { label: 'Short', badge: 'bg-fuchsia-500/20 text-fuchsia-300' },
    long: { label: 'Long', badge: 'bg-amber-500/20 text-amber-300' },
};

const DEFAULT_TYPE_MARKS = { mcq: MARKS_PER_MCQ, short: MARKS_PER_SHORT, long: MARKS_PER_LONG };

// Reusable editor for a list of hand-written questions (MCQ / short / long).
// Used both for the standalone Custom Paper manual mode and for the "add your own
// questions" section of the AI-material hybrid exam. When perTypeMarks is given,
// each question's marks are governed by its type (no per-question marks input).
function ManualQuestionsEditor({
    questions,
    onChange,
    perTypeMarks,
}: {
    questions: CustomExamQuestion[];
    onChange: (q: CustomExamQuestion[]) => void;
    perTypeMarks?: { mcq: number; short: number; long: number };
}) {
    const markFor = (type: CustomQuestionType) => (perTypeMarks ? perTypeMarks[type] : DEFAULT_TYPE_MARKS[type]);

    const add = (type: CustomQuestionType) => {
        const id = questions.length + 1;
        const base = { id, marks: markFor(type), question: '', explanation: '' };
        const q: CustomExamQuestion =
            type === 'mcq'
                ? { ...base, type: 'mcq', options: ['', '', '', ''], correctAnswer: 'A' }
                : { ...base, type, options: [], keyPoints: [''] };
        onChange([...questions, q]);
    };
    const updateQ = (index: number, field: string, value: any) => {
        const updated = [...questions];
        (updated[index] as any)[field] = value;
        onChange(updated);
    };
    const updateOpt = (qi: number, oi: number, value: string) => {
        const updated = [...questions];
        updated[qi] = { ...updated[qi], options: updated[qi].options.map((o, i) => (i === oi ? value : o)) };
        onChange(updated);
    };
    const updateKP = (qi: number, ki: number, value: string) => {
        const updated = [...questions];
        const kp = [...(updated[qi].keyPoints || [])];
        kp[ki] = value;
        updated[qi] = { ...updated[qi], keyPoints: kp };
        onChange(updated);
    };
    const remove = (index: number) => onChange(questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, id: i + 1 })));

    return (
        <div className="space-y-4">
            {questions.map((q, qi) => (
                <div key={qi} className="glass-card p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-primary-300">Question {qi + 1}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_META[q.type].badge}`}>{TYPE_META[q.type].label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {perTypeMarks ? (
                                <span className="text-xs text-white/40">{markFor(q.type)} mark{markFor(q.type) > 1 ? 's' : ''}</span>
                            ) : (
                                <>
                                    <label className="text-xs text-white/40">Marks:</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={q.marks}
                                        onChange={(e) => updateQ(qi, 'marks', parseInt(e.target.value) || 1)}
                                        className="text-input !w-16 !py-1 text-center text-sm"
                                    />
                                </>
                            )}
                            {questions.length > 1 && (
                                <button onClick={() => remove(qi)} className="text-red-400 hover:text-red-300 text-sm px-2">✕</button>
                            )}
                        </div>
                    </div>

                    <input
                        type="text"
                        placeholder="Enter question text..."
                        value={q.question}
                        onChange={(e) => updateQ(qi, 'question', e.target.value)}
                        className="text-input text-sm"
                    />

                    {q.type === 'mcq' ? (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                {['A', 'B', 'C', 'D'].map((letter, oi) => (
                                    <input
                                        key={letter}
                                        type="text"
                                        placeholder={`${letter}) Option...`}
                                        value={q.options[oi]}
                                        onChange={(e) => updateOpt(qi, oi, e.target.value)}
                                        className="text-input text-sm"
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="text-xs text-white/40">Correct Answer:</label>
                                <div className="flex gap-2">
                                    {['A', 'B', 'C', 'D'].map((letter) => (
                                        <button
                                            key={letter}
                                            onClick={() => updateQ(qi, 'correctAnswer', letter)}
                                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                                                q.correctAnswer === letter ? 'bg-green-500 text-white shadow-lg' : 'bg-white/10 text-white/50 hover:bg-white/20'
                                            }`}
                                        >
                                            {letter}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">Model answer key points (used for AI grading)</label>
                            {(q.keyPoints || ['']).map((kp, ki) => (
                                <input
                                    key={ki}
                                    type="text"
                                    placeholder={`Key point ${ki + 1}...`}
                                    value={kp}
                                    onChange={(e) => updateKP(qi, ki, e.target.value)}
                                    className="text-input text-sm"
                                />
                            ))}
                            <button
                                onClick={() => updateQ(qi, 'keyPoints', [...(q.keyPoints || []), ''])}
                                className="text-xs text-primary-300 hover:text-primary-200"
                            >
                                + Add key point
                            </button>
                        </div>
                    )}
                </div>
            ))}

            <div className="flex gap-2 flex-wrap">
                <button onClick={() => add('mcq')} className="flex-1 min-w-[120px] glass-card p-3 text-center text-white/50 hover:text-white/80 hover:bg-white/10 transition-all border-2 border-dashed border-white/10 hover:border-white/20">
                    + Add MCQ
                </button>
                <button onClick={() => add('short')} className="flex-1 min-w-[120px] glass-card p-3 text-center text-white/50 hover:text-white/80 hover:bg-white/10 transition-all border-2 border-dashed border-white/10 hover:border-white/20">
                    + Add Short Question
                </button>
                <button onClick={() => add('long')} className="flex-1 min-w-[120px] glass-card p-3 text-center text-white/50 hover:text-white/80 hover:bg-white/10 transition-all border-2 border-dashed border-white/10 hover:border-white/20">
                    + Add Long Question
                </button>
            </div>
        </div>
    );
}

export function AssessmentSetupScreen({
    onStartAIScenario,
    onStartCustomExam,
    onBack,
    userName,
    sessionAuthor = false,
    onAuthorCustomExam,
    onAuthorScenario,
}: AssessmentSetupScreenProps) {
    const [tab, setTab] = useState<SetupTab>('select-mode');

    // AI-scenario difficulty picker (session authoring only)
    const [scenarioDifficulty, setScenarioDifficulty] = useState(5);
    const [showScenarioDifficulty, setShowScenarioDifficulty] = useState(false);

    // Route a finished custom exam either to the session (author) or the taker.
    // Attaches the creator's timer settings and, for manual (client-owned) exams,
    // appends the marks-free cognitive probes. AI-generated / parsed exams already
    // carry the probes from the server (their answer key lives server-side).
    const deliverCustomExam = (exam: GeneratedExam) => {
        const questions = exam.examId ? exam.questions : appendCognitiveProbes(exam.questions);
        const finalExam: GeneratedExam = {
            ...exam,
            questions,
            durationSeconds: timerEnabled ? Math.max(60, Math.round(durationMinutes * 60)) : undefined,
            timerMode,
        };
        if (sessionAuthor && onAuthorCustomExam) onAuthorCustomExam(finalExam);
        else onStartCustomExam(finalExam);
    };

    // Custom Paper state
    const [customMode, setCustomMode] = useState<CustomPaperMode>('upload');
    const [extractedText, setExtractedText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [paperFiles, setPaperFiles] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual entry state (supports MCQ + written questions)
    const [manualQuestions, setManualQuestions] = useState<CustomExamQuestion[]>([
        { id: 1, type: 'mcq', marks: 1, question: '', options: ['', '', '', ''], correctAnswer: 'A', explanation: '' },
    ]);

    // AI Material state
    const [materialText, setMaterialText] = useState('');
    const [mcqCount, setMcqCount] = useState(8);
    const [shortCount, setShortCount] = useState(2);
    const [longCount, setLongCount] = useState(0);
    // Editable per-type marks (teacher can change; defaults 1/3/6).
    const [mcqMarks, setMcqMarks] = useState(MARKS_PER_MCQ);
    const [shortMarks, setShortMarks] = useState(MARKS_PER_SHORT);
    const [longMarks, setLongMarks] = useState(MARKS_PER_LONG);
    // Teacher's own hand-written questions merged into the AI-generated exam.
    const [bonusQuestions, setBonusQuestions] = useState<CustomExamQuestion[]>([]);
    const [difficulty, setDifficulty] = useState<ExamDifficulty>('normal');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState('');
    const [materialFiles, setMaterialFiles] = useState<string[]>([]);
    const materialFileRef = useRef<HTMLInputElement>(null);

    // Exam / Subject Title state (Mandatory for tracking & AI Chatbot queries)
    const [examTitle, setExamTitle] = useState('');

    // Overall exam timer (creator-set). durationMinutes drives the countdown.
    // timerMode: 'auto-submit' force-submits at zero; 'soft' keeps going into
    // overtime so late answers are still captured as behavioural data.
    const [timerEnabled, setTimerEnabled] = useState(true);
    const [durationMinutes, setDurationMinutes] = useState(20);
    const [timerMode, setTimerMode] = useState<'auto-submit' | 'soft'>('auto-submit');

    // Preview state
    const [previewExam, setPreviewExam] = useState<GeneratedExam | null>(null);

    // ─── Document Upload Handler ───
    // Custom Paper accepts a single file; AI-material accepts up to 7.
    const handleDocUpload = async (files: FileList, target: 'paper' | 'material') => {
        const fileArr = Array.from(files);
        if (fileArr.length === 0) return;

        const limit = target === 'paper' ? 1 : 7;
        if (fileArr.length > limit) {
            const msg = target === 'paper'
                ? 'The Custom Paper mode accepts only 1 file. Please select a single document.'
                : 'You can upload at most 7 files for an AI material exam. Please select fewer files.';
            if (target === 'paper') setUploadError(msg); else setGenerateError(msg);
            return;
        }

        if (target === 'paper') {
            setIsUploading(true);
            setUploadError('');
        } else {
            setIsGenerating(true);
            setGenerateError('');
        }

        const result = await uploadPdf(fileArr);

        if (result.success && result.text) {
            const names = fileArr.map(f => f.name);
            const note = result.failedFiles && result.failedFiles.length
                ? ` (couldn't read: ${result.failedFiles.join(', ')})`
                : '';
            if (target === 'paper') {
                setExtractedText(result.text);
                setPaperFiles(names);
                setIsUploading(false);
                if (note) setUploadError('Some files were skipped' + note);
            } else {
                setMaterialText(result.text);
                setMaterialFiles(names);
                setIsGenerating(false);
                if (note) setGenerateError('Some files were skipped' + note);
            }
        } else {
            const errMsg = result.error || 'Failed to read document(s)';
            if (target === 'paper') {
                setUploadError(errMsg);
                setIsUploading(false);
            } else {
                setGenerateError(errMsg);
                setIsGenerating(false);
            }
        }
    };

    // ─── Parse uploaded paper ───
    const handleParsePaper = async () => {
        if (!extractedText.trim()) return;
        setIsParsing(true);
        setUploadError('');

        const result = await parsePaper(extractedText);
        setIsParsing(false);

        if (result.success && result.exam) {
            const finalTitle = examTitle.trim() || result.exam.examTitle || 'Custom Exam';
            setPreviewExam({ ...result.exam, examTitle: finalTitle });
        } else {
            setUploadError(result.error || 'Failed to parse paper');
        }
    };

    // Teacher's own questions that are actually filled in (valid), with marks set
    // by the current per-type marks. Merged into the AI-generated exam.
    const validBonusQuestions = (): CustomExamQuestion[] =>
        bonusQuestions
            .filter(q => {
                if (!q.question.trim()) return false;
                if (q.type === 'mcq') return q.options.every(o => o.trim());
                return true;
            })
            .map(q => ({ ...q, marks: q.type === 'mcq' ? mcqMarks : q.type === 'long' ? longMarks : shortMarks }));

    // ─── Generate exam from material (AI questions + teacher's own, merged) ───
    const handleGenerateExam = async () => {
        if (!examTitle.trim()) {
            setGenerateError('Please enter a test/subject title (e.g. Physics Test 1)');
            return;
        }
        const bonus = validBonusQuestions();
        const aiTotal = mcqCount + shortCount + longCount;
        if (aiTotal + bonus.length < 1) {
            setGenerateError('Add at least one question — set an AI count above 0 or add your own.');
            return;
        }
        // AI generation needs material; teacher-only papers (aiTotal 0) don't.
        if (aiTotal > 0 && materialText.trim().length < 20) {
            setGenerateError('Please provide study material (or set all AI counts to 0 and add your own questions).');
            return;
        }
        if (aiTotal > MAX_TOTAL_QUESTIONS) {
            setGenerateError(`Please request at most ${MAX_TOTAL_QUESTIONS} AI questions in total.`);
            return;
        }
        setIsGenerating(true);
        setGenerateError('');

        const result = await generateExam({
            materialText,
            mcqCount,
            shortCount,
            longCount,
            mcqMarks,
            shortMarks,
            longMarks,
            manualQuestions: bonus,
            difficulty,
        });
        setIsGenerating(false);

        if (result.success && result.exam) {
            const finalTitle = examTitle.trim() || result.exam.examTitle || 'Generated Exam';
            setPreviewExam({ ...result.exam, examTitle: finalTitle });
        } else {
            setGenerateError(result.error || 'Failed to generate exam');
        }
    };

    // ─── Manual entry ───
    const handleStartManualExam = () => {
        const valid = manualQuestions
            .filter(q => {
                if (!q.question.trim()) return false;
                if (q.type === 'mcq') return q.options.every(o => o.trim());
                return true; // written questions only need a prompt
            })
            // Renumber ids sequentially so they match what the server expects when
            // grading, even if some questions were skipped.
            .map((q, i) => ({ ...q, id: i + 1 }));
        if (valid.length === 0) return;
        const total = valid.reduce((sum, q) => sum + q.marks, 0);
        deliverCustomExam({
            examTitle: examTitle.trim() || 'Custom Paper',
            totalMarks: total,
            questions: valid,
        });
    };

    // ─── Preview & Start ───
    const handleStartPreviewExam = () => {
        if (previewExam) {
            deliverCustomExam(previewExam);
        }
    };

    const manualTotalMarks = manualQuestions.reduce((s, q) => s + q.marks, 0);
    // AI-material tab totals — include the teacher's own (bonus) questions.
    const bonusValid = bonusQuestions.filter(q => q.question.trim() && (q.type !== 'mcq' || q.options.every(o => o.trim())));
    const bonusMcq = bonusValid.filter(q => q.type === 'mcq').length;
    const bonusShort = bonusValid.filter(q => q.type === 'short').length;
    const bonusLong = bonusValid.filter(q => q.type === 'long').length;
    const genTotalCount = mcqCount + shortCount + longCount + bonusValid.length;
    const genTotalMarks =
        (mcqCount + bonusMcq) * mcqMarks +
        (shortCount + bonusShort) * shortMarks +
        (longCount + bonusLong) * longMarks;
    const genOverLimit = (mcqCount + shortCount + longCount) > MAX_TOTAL_QUESTIONS;

    // Shared timer-settings card, used by both the Custom Paper and AI Material tabs.
    const renderTimerControls = () => (
        <div className="glass-card p-4 space-y-3 border border-accent-500/30 bg-accent-500/5">
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-accent-300 uppercase tracking-wider flex items-center gap-1">
                    <span>⏱️</span> Overall Timer
                </label>
                <button
                    type="button"
                    onClick={() => setTimerEnabled(v => !v)}
                    className={`text-xs px-3 py-1 rounded-full transition-all ${
                        timerEnabled ? 'bg-accent-500/30 text-accent-200' : 'bg-white/10 text-white/50'
                    }`}
                >
                    {timerEnabled ? 'On' : 'Off'}
                </button>
            </div>

            {timerEnabled && (
                <>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-white/70">Total time</span>
                        <input
                            type="number"
                            min={1}
                            max={240}
                            value={durationMinutes}
                            onChange={(e) => setDurationMinutes(Math.max(1, Math.min(240, Number(e.target.value) || 1)))}
                            className="text-input text-sm w-24 text-center"
                        />
                        <span className="text-sm text-white/50">minutes</span>
                    </div>

                    <div>
                        <p className="text-xs text-white/50 mb-1.5">When time runs out:</p>
                        <div className="glass-card p-1 flex gap-1 bg-white/5">
                            <button
                                type="button"
                                onClick={() => setTimerMode('auto-submit')}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                                    timerMode === 'auto-submit' ? 'bg-accent-500 text-white shadow' : 'text-white/50 hover:text-white/80'
                                }`}
                            >
                                🔒 Auto-submit
                            </button>
                            <button
                                type="button"
                                onClick={() => setTimerMode('soft')}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                                    timerMode === 'soft' ? 'bg-accent-500 text-white shadow' : 'text-white/50 hover:text-white/80'
                                }`}
                            >
                                ⏳ Keep going (measure overtime)
                            </button>
                        </div>
                        <p className="text-[11px] text-white/40 mt-1.5">
                            {timerMode === 'auto-submit'
                                ? 'The exam submits automatically the moment the timer hits zero.'
                                : 'The timer keeps counting into overtime — the student can finish, and the extra time is recorded as behavioural data.'}
                        </p>
                    </div>
                </>
            )}
        </div>
    );

    // ─── RENDER ──────────────────────────────────────────────────────────────────

    // Preview Screen (answers are intentionally NOT revealed here)
    if (previewExam) {
        return (
            <section className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="floating-shape shape-1 w-96 h-96 bg-primary-500 -top-48 -left-48" />
                <div className="floating-shape shape-2 w-72 h-72 bg-accent-500 -bottom-36 -right-36" style={{ animationDelay: '2s' }} />

                <div className="max-w-3xl w-full space-y-6 relative z-10">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold">📋 Exam Preview</h1>
                        <p className="text-white/60">{previewExam.examTitle}</p>
                        <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
                            <span className="bg-primary-500/20 text-primary-300 px-3 py-1 rounded-full">
                                {previewExam.questions.filter(q => !q.probe).length} Questions
                            </span>
                            <span className="bg-accent-500/20 text-accent-300 px-3 py-1 rounded-full">
                                {previewExam.totalMarks} Total Marks
                            </span>
                            <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full">
                                🔒 Answers hidden until you finish
                            </span>
                        </div>
                    </div>

                    <div className="glass-card p-5 max-h-[50vh] overflow-y-auto space-y-4">
                        {previewExam.questions.filter(q => !q.probe).map((q, i) => (
                            <div key={q.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                                <div className="flex items-start gap-2">
                                    <span className="bg-primary-500/20 text-primary-300 text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                                        Q{i + 1} ({q.marks}m)
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${TYPE_META[q.type].badge}`}>
                                        {TYPE_META[q.type].label}
                                    </span>
                                    <p className="text-sm text-white/90">{q.question}</p>
                                </div>
                                {q.type === 'mcq' && q.options.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 pl-8">
                                        {q.options.map((opt, oi) => (
                                            <div
                                                key={oi}
                                                className="text-xs p-2 rounded-lg border border-white/10 bg-white/5 text-white/60"
                                            >
                                                {opt}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {(q.type === 'short' || q.type === 'long') && (
                                    <p className="pl-8 text-xs text-white/40 italic">
                                        ✍️ {q.type === 'long' ? 'Long written answer required' : 'Short written answer required'}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => setPreviewExam(null)}
                            className="btn-secondary !py-3 !px-6"
                        >
                            ← Back to Edit
                        </button>
                        <button
                            onClick={handleStartPreviewExam}
                            className="btn-primary !py-3 !px-8 text-lg"
                        >
                            {sessionAuthor ? '✅ Use This Paper for Session' : '🚀 Start Exam'}
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    // Mode Selection Screen
    if (tab === 'select-mode') {
        return (
            <section className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="floating-shape shape-1 w-96 h-96 bg-primary-500 -top-48 -left-48" />
                <div className="floating-shape shape-2 w-72 h-72 bg-accent-500 -bottom-36 -right-36" style={{ animationDelay: '2s' }} />

                <div className="absolute top-4 left-4 z-20">
                    <button onClick={onBack} className="btn-secondary !py-2 !px-4 text-sm">
                        ← Back
                    </button>
                </div>

                <div className="max-w-2xl w-full space-y-6 relative z-10">
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 shadow-2xl animate-glow">
                            <span className="text-4xl">📝</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                            {sessionAuthor ? 'Create Session Assessment' : 'Choose Assessment Mode'}
                        </h1>
                        <p className="text-white/50 text-sm">
                            {sessionAuthor
                                ? 'Build the paper every participant in this session will take.'
                                : userName ? `Welcome, ${userName}` : ''}
                        </p>
                    </div>

                    <div className="grid gap-4">
                        {/* General AI Scenario */}
                        <button
                            onClick={() => {
                                if (sessionAuthor) setShowScenarioDifficulty(true);
                                else onStartAIScenario();
                            }}
                            className="glass-card p-6 text-left hover:bg-white/10 transition-all group cursor-pointer border border-white/5 hover:border-primary-500/30"
                        >
                            <div className="flex items-start gap-4">
                                <div className="text-4xl group-hover:scale-110 transition-transform">🧠</div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-xl">General AI Scenario</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">
                                        AI generates interactive dilemmas with sliders, rankings, and MCQs. Measures cognitive profile through behavioral telemetry.
                                    </p>
                                    <span className="inline-block text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full mt-1">
                                        {sessionAuthor ? 'One shared scenario for all' : 'Existing Flow'}
                                    </span>
                                </div>
                            </div>
                        </button>

                        {/* Custom Paper */}
                        <button
                            onClick={() => setTab('custom-paper')}
                            className="glass-card p-6 text-left hover:bg-white/10 transition-all group cursor-pointer border border-white/5 hover:border-accent-500/30"
                        >
                            <div className="flex items-start gap-4">
                                <div className="text-4xl group-hover:scale-110 transition-transform">📄</div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-xl">Custom Paper</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">
                                        Upload one or more PDF/PPTX/DOCX exam papers, or manually enter MCQ and written questions. The system digitizes and grades it.
                                    </p>
                                    <span className="inline-block text-xs bg-accent-500/20 text-accent-300 px-2 py-0.5 rounded-full mt-1">
                                        Upload or Manual Entry
                                    </span>
                                </div>
                            </div>
                        </button>

                        {/* AI Material Exam */}
                        <button
                            onClick={() => setTab('ai-material')}
                            className="glass-card p-6 text-left hover:bg-white/10 transition-all group cursor-pointer border border-white/5 hover:border-green-500/30"
                        >
                            <div className="flex items-start gap-4">
                                <div className="text-4xl group-hover:scale-110 transition-transform">📚</div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-xl">AI Material-Based Exam</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">
                                        Upload one or more study files or paste notes. AI generates a custom mix of MCQ + written questions calibrated by Bloom's Taxonomy difficulty.
                                    </p>
                                    <span className="inline-block text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full mt-1">
                                        AI-Powered Generation
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* AI Scenario difficulty picker (session authoring) */}
                {showScenarioDifficulty && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                        <div className="glass-card max-w-md w-full p-8 space-y-5 border border-white/10 shadow-2xl">
                            <div className="text-center space-y-1">
                                <div className="text-4xl">🧠</div>
                                <h2 className="text-xl font-bold">Scenario Difficulty</h2>
                                <p className="text-white/50 text-sm">Pick the challenge level for the shared scenario.</p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm text-white/70">Difficulty</label>
                                    <span className="text-lg font-bold text-primary-300">{scenarioDifficulty}/10</span>
                                </div>
                                <input
                                    type="range"
                                    min={1}
                                    max={10}
                                    value={scenarioDifficulty}
                                    onChange={(e) => setScenarioDifficulty(parseInt(e.target.value))}
                                    className="w-full accent-primary-500"
                                />
                                <div className="flex justify-between text-xs text-white/30"><span>Easy</span><span>Expert</span></div>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => setShowScenarioDifficulty(false)} className="btn-secondary !py-2.5 !px-5">Cancel</button>
                                <button
                                    onClick={() => { setShowScenarioDifficulty(false); onAuthorScenario?.(scenarioDifficulty); }}
                                    className="btn-primary !py-2.5 !px-6"
                                >
                                    ✅ Create for Session
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </section>
        );
    }

    // Custom Paper Tab
    if (tab === 'custom-paper') {
        return (
            <section className="min-h-screen p-4 md:p-6 relative overflow-hidden">
                <div className="floating-shape shape-1 w-96 h-96 bg-primary-500 -top-48 -left-48" />
                <div className="floating-shape shape-2 w-72 h-72 bg-accent-500 -bottom-36 -right-36" style={{ animationDelay: '2s' }} />

                <div className="max-w-3xl mx-auto space-y-6 relative z-10 pb-16">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setTab('select-mode')} className="btn-secondary !py-2 !px-4 text-sm">
                            ← Back
                        </button>
                        <h1 className="text-2xl font-bold">📄 Custom Paper</h1>
                    </div>

                    {/* Mandatory Exam / Subject Title Card */}
                    <div className="glass-card p-4 space-y-2 border border-primary-500/30 bg-primary-500/5">
                        <label className="text-xs font-semibold text-primary-300 uppercase tracking-wider flex items-center gap-1">
                            <span>📌</span> Test / Subject Title (Required)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Physics Test 1, CS101 Midterm, Chemistry Quiz..."
                            value={examTitle}
                            onChange={(e) => setExamTitle(e.target.value)}
                            className="text-input text-sm font-medium"
                        />
                    </div>

                    {renderTimerControls()}

                    {/* Mode Toggle */}
                    <div className="glass-card p-1 flex gap-1">
                        <button
                            onClick={() => setCustomMode('upload')}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                customMode === 'upload' ? 'bg-primary-500 text-white shadow-lg' : 'text-white/50 hover:text-white/80'
                            }`}
                        >
                            📤 Upload File(s)
                        </button>
                        <button
                            onClick={() => setCustomMode('manual')}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                customMode === 'manual' ? 'bg-primary-500 text-white shadow-lg' : 'text-white/50 hover:text-white/80'
                            }`}
                        >
                            ✏️ Manual Entry
                        </button>
                    </div>

                    {/* Upload Mode */}
                    {customMode === 'upload' && (
                        <div className="space-y-4">
                            <div
                                className="glass-card p-8 border-2 border-dashed border-white/20 hover:border-primary-500/40 transition-all cursor-pointer text-center"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.pptx,.ppt,.docx,.txt"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length) handleDocUpload(e.target.files, 'paper');
                                    }}
                                />
                                {isUploading ? (
                                    <div className="space-y-2">
                                        <div className="text-4xl animate-spin">⏳</div>
                                        <p className="text-white/60">Extracting text from document...</p>
                                    </div>
                                ) : paperFiles.length > 0 ? (
                                    <div className="space-y-2">
                                        <div className="text-4xl">✅</div>
                                        <p className="text-green-300 font-semibold">{paperFiles[0]}</p>
                                        <p className="text-white/40 text-xs">Click to replace with a different file</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="text-4xl">📤</div>
                                        <p className="text-white/70 font-medium">Click to upload one exam paper</p>
                                        <p className="text-white/40 text-xs">1 file: PDF, PowerPoint (.pptx), Word (.docx), TXT (Max 15MB)</p>
                                    </div>
                                )}
                            </div>

                            {extractedText && (
                                <div className="glass-card p-4 space-y-3">
                                    <h3 className="font-semibold text-sm">📖 Extracted Text Preview</h3>
                                    <pre className="text-xs text-white/50 max-h-32 overflow-y-auto whitespace-pre-wrap bg-white/5 p-3 rounded-lg">
                                        {extractedText.substring(0, 1000)}
                                        {extractedText.length > 1000 && '...'}
                                    </pre>
                                    <button
                                        onClick={handleParsePaper}
                                        disabled={isParsing}
                                        className="btn-primary w-full !py-3 disabled:opacity-50"
                                    >
                                        {isParsing ? (
                                            <><span className="animate-spin">🤖</span> AI is parsing questions...</>
                                        ) : (
                                            '🔍 Extract Questions with AI'
                                        )}
                                    </button>
                                </div>
                            )}

                            {uploadError && (
                                <div className="glass-card p-4 border border-amber-500/30 bg-amber-500/10 text-amber-200 rounded-xl space-y-2 text-sm">
                                    <div className="flex items-center gap-2 font-bold text-amber-300">
                                        <span className="text-xl">🤖</span> AITA AI Assistant Guidance
                                    </div>
                                    <p className="text-white/80 text-xs leading-relaxed">{uploadError.replace(/^🤖\s*AITA\s*AI\s*Assistant:\s*/i, '')}</p>
                                    <div className="text-[11px] text-white/50 pt-1 border-t border-amber-500/20">
                                        💡 <strong>Tip for Teachers:</strong> If your photo is dim or blurry, use a document scanner app like <strong>CamScanner</strong> or <strong>Adobe Scan</strong> for a sharp, high-contrast shot, or convert/type the content into a PDF, Word, or TXT file.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual Entry Mode */}
                    {customMode === 'manual' && (
                        <div className="space-y-4">
                            <ManualQuestionsEditor questions={manualQuestions} onChange={setManualQuestions} />

                            <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-2">
                                <div className="text-sm text-white/60">
                                    <span className="font-semibold text-white">{manualQuestions.length}</span> questions •{' '}
                                    <span className="font-semibold text-white">{manualTotalMarks}</span> total marks
                                </div>
                                <button
                                    onClick={handleStartManualExam}
                                    disabled={manualQuestions.filter(q => q.question.trim()).length === 0}
                                    className="btn-primary !py-2.5 !px-6 disabled:opacity-50"
                                >
                                    {sessionAuthor ? '✅ Use for Session' : '🚀 Start Exam'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        );
    }

    // AI Material Tab
    if (tab === 'ai-material') {
        return (
            <section className="min-h-screen p-4 md:p-6 relative overflow-hidden">
                <div className="floating-shape shape-1 w-96 h-96 bg-primary-500 -top-48 -left-48" />
                <div className="floating-shape shape-2 w-72 h-72 bg-accent-500 -bottom-36 -right-36" style={{ animationDelay: '2s' }} />

                <div className="max-w-3xl mx-auto space-y-6 relative z-10 pb-16">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setTab('select-mode')} className="btn-secondary !py-2 !px-4 text-sm">
                            ← Back
                        </button>
                        <h1 className="text-2xl font-bold">📚 AI Material-Based Exam</h1>
                    </div>

                    {/* Mandatory Exam / Subject Title Card */}
                    <div className="glass-card p-4 space-y-2 border border-green-500/30 bg-green-500/5">
                        <label className="text-xs font-semibold text-green-300 uppercase tracking-wider flex items-center gap-1">
                            <span>📌</span> Test / Subject Title (Required for Tracking & AI Queries)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Physics Test 1, CS101 Quiz 2, Operating Systems Final..."
                            value={examTitle}
                            onChange={(e) => setExamTitle(e.target.value)}
                            className="text-input text-sm font-medium"
                        />
                    </div>

                    {renderTimerControls()}

                    {/* Material Input */}
                    <div className="space-y-4">
                        <div
                            className="glass-card p-6 border-2 border-dashed border-white/20 hover:border-green-500/40 transition-all cursor-pointer text-center"
                            onClick={() => materialFileRef.current?.click()}
                        >
                            <input
                                ref={materialFileRef}
                                type="file"
                                multiple
                                accept=".pdf,.pptx,.ppt,.docx,.txt"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length) handleDocUpload(e.target.files, 'material');
                                }}
                            />
                            {materialFiles.length > 0 ? (
                                <div className="space-y-1">
                                    <div className="text-3xl">✅</div>
                                    <p className="text-green-300 font-semibold text-sm">{materialFiles.length} file{materialFiles.length > 1 ? 's' : ''} loaded</p>
                                    <p className="text-white/50 text-xs break-words">{materialFiles.join(', ')}</p>
                                    <p className="text-white/40 text-xs">Click to replace</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <div className="text-3xl">📤</div>
                                    <p className="text-white/70 font-medium text-sm">Upload study files (PDF, PPTX, DOCX)</p>
                                    <p className="text-white/40 text-xs">Up to 7 files, or paste text below</p>
                                </div>
                            )}
                        </div>

                        <div className="glass-card p-4 space-y-2">
                            <h3 className="font-semibold text-sm">📝 Study Material / Notes</h3>
                            <textarea
                                value={materialText}
                                onChange={(e) => setMaterialText(e.target.value)}
                                placeholder="Paste or type your study material, lecture notes, or topic here..."
                                className="text-input min-h-[150px] text-sm resize-y"
                                rows={6}
                            />
                            <p className="text-white/30 text-xs text-right">{materialText.length} characters</p>
                        </div>
                    </div>

                    {/* Exam Configuration */}
                    <div className="glass-card p-5 space-y-5">
                        <h3 className="font-semibold">⚙️ Exam Configuration</h3>

                        <p className="text-xs text-white/40 -mt-2">Set how many of each type to AI-generate, and the marks each is worth (defaults shown — change any).</p>

                        {/* MCQ Count + marks */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-sm text-white/70">Multiple-Choice Questions (MCQ)</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <input type="number" min={1} max={20} value={mcqMarks}
                                            onChange={(e) => setMcqMarks(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="text-input !w-14 !py-1 text-center text-xs" />
                                        <span className="text-[10px] text-white/40">m each</span>
                                    </div>
                                    <span className="text-lg font-bold text-sky-300 w-6 text-right">{mcqCount}</span>
                                </div>
                            </div>
                            <input type="range" min={0} max={MAX_TOTAL_QUESTIONS} value={mcqCount}
                                onChange={(e) => setMcqCount(parseInt(e.target.value))} className="w-full accent-primary-500" />
                            <div className="flex justify-between text-xs text-white/30"><span>0</span><span>{MAX_TOTAL_QUESTIONS}</span></div>
                        </div>

                        {/* Short-Answer Count + marks */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-sm text-white/70">Short-Answer Questions</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <input type="number" min={1} max={20} value={shortMarks}
                                            onChange={(e) => setShortMarks(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="text-input !w-14 !py-1 text-center text-xs" />
                                        <span className="text-[10px] text-white/40">m each</span>
                                    </div>
                                    <span className="text-lg font-bold text-fuchsia-300 w-6 text-right">{shortCount}</span>
                                </div>
                            </div>
                            <input type="range" min={0} max={20} value={shortCount}
                                onChange={(e) => setShortCount(parseInt(e.target.value))} className="w-full accent-fuchsia-500" />
                            <div className="flex justify-between text-xs text-white/30"><span>0</span><span>20</span></div>
                        </div>

                        {/* Long-Answer Count + marks */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-sm text-white/70">Long-Answer / Essay Questions</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <input type="number" min={1} max={20} value={longMarks}
                                            onChange={(e) => setLongMarks(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="text-input !w-14 !py-1 text-center text-xs" />
                                        <span className="text-[10px] text-white/40">m each</span>
                                    </div>
                                    <span className="text-lg font-bold text-amber-300 w-6 text-right">{longCount}</span>
                                </div>
                            </div>
                            <input type="range" min={0} max={15} value={longCount}
                                onChange={(e) => setLongCount(parseInt(e.target.value))} className="w-full accent-amber-500" />
                            <div className="flex justify-between text-xs text-white/30"><span>0</span><span>15</span></div>
                        </div>

                        {/* Totals summary */}
                        <div className={`flex items-center gap-3 text-sm rounded-xl p-3 flex-wrap ${genOverLimit ? 'bg-red-500/10 text-red-300 border border-red-500/20' : 'bg-white/5 text-white/60'}`}>
                            <span><span className="font-semibold text-white">{genTotalCount}</span> questions</span>
                            <span className="text-white/20">|</span>
                            <span><span className="font-semibold text-white">{genTotalMarks}</span> total marks</span>
                            {bonusValid.length > 0 && <span className="text-[11px] text-white/40">(incl. {bonusValid.length} of your own)</span>}
                            {genOverLimit && <span className="w-full text-xs">⚠️ Max {MAX_TOTAL_QUESTIONS} AI questions — reduce a count.</span>}
                        </div>

                        {/* Difficulty */}
                        <div className="space-y-2">
                            <label className="text-sm text-white/70">Difficulty Level (Bloom's Taxonomy)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    { key: 'easy', label: '🟢 Easy', desc: 'Recall & Basics' },
                                    { key: 'normal', label: '🟡 Normal', desc: 'Balanced Application' },
                                    { key: 'hard', label: '🔴 Hard', desc: 'Critical Analysis' },
                                ] as const).map((d) => (
                                    <button
                                        key={d.key}
                                        onClick={() => setDifficulty(d.key)}
                                        className={`p-3 rounded-xl text-center transition-all border ${
                                            difficulty === d.key
                                                ? 'border-primary-500/50 bg-primary-500/20 text-white shadow-lg'
                                                : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="text-lg">{d.label.split(' ')[0]}</div>
                                        <div className="text-xs font-semibold mt-1">{d.label.split(' ')[1]}</div>
                                        <div className="text-[10px] text-white/40 mt-0.5">{d.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Add your own questions (hybrid) */}
                    <div className="glass-card p-5 space-y-3">
                        <div>
                            <h3 className="font-semibold">✍️ Add Your Own Questions <span className="text-white/40 text-sm font-normal">(optional)</span></h3>
                            <p className="text-xs text-white/40 mt-1">
                                Mix in your favourite questions. They're merged with the AI ones, use the marks set above, and are ordered MCQ → short → long.
                            </p>
                        </div>
                        <ManualQuestionsEditor
                            questions={bonusQuestions}
                            onChange={setBonusQuestions}
                            perTypeMarks={{ mcq: mcqMarks, short: shortMarks, long: longMarks }}
                        />
                    </div>

                    {generateError && (
                        <div className="glass-card p-4 border border-amber-500/30 bg-amber-500/10 text-amber-200 rounded-xl space-y-2 text-sm">
                            <div className="flex items-center gap-2 font-bold text-amber-300">
                                <span className="text-xl">🤖</span> AITA AI Assistant Guidance
                            </div>
                            <p className="text-white/80 text-xs leading-relaxed">{generateError.replace(/^🤖\s*AITA\s*AI\s*Assistant:\s*/i, '')}</p>
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerateExam}
                        disabled={isGenerating || genTotalCount < 1 || genOverLimit}
                        className="btn-primary w-full !py-4 text-lg disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <><span className="animate-spin">🤖</span> AI is generating your exam...</>
                        ) : (
                            <>🚀 {sessionAuthor ? 'Create' : 'Generate'} {genTotalCount}-Question Exam</>
                        )}
                    </button>
                </div>
            </section>
        );
    }

    return null;
}
