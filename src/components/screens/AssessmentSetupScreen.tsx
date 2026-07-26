import { useState, useRef } from 'react';
import { uploadPdf, generateExam, parsePaper } from '../../services/api';
import { CustomExamQuestion, CustomQuestionType, ExamDifficulty, GeneratedExam } from '../../types/quiz.types';
import { appendCognitiveProbes } from '../../utils/cognitiveProbes';

interface AssessmentSetupScreenProps {
    onStartCustomExam: (exam: GeneratedExam) => void;
    onStartGeneralQuiz?: () => void;
    onBack: () => void;
    userName?: string;
    // Session-authoring mode: the host is creating the paper for a session rather
    // than taking it. Custom exams are handed to onAuthorCustomExam (saved to the
    // session) and the General Aptitude Test card calls onAuthorGeneralQuiz (saved
    // to the session), instead of starting the assessment.
    sessionAuthor?: boolean;
    onAuthorCustomExam?: (exam: GeneratedExam) => void;
    onAuthorGeneralQuiz?: () => void;
}

type SetupTab = 'select-mode' | 'hybrid';

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

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Label hand-written MCQ options as "A) …","B) …",… so the exam UI's letter badge
// and the letter-based answer key match.
const withOptionLetters = (options: string[]): string[] =>
    options.map((opt, i) => {
        const letter = OPTION_LETTERS[i] || String.fromCharCode(65 + i);
        const text = String(opt ?? '').replace(/^\s*[A-Za-z][\)\.\:\-]\s*/, '').trim();
        return `${letter}) ${text}`;
    });

// Sort questions into MCQ -> Short -> Long order and renumber IDs sequentially 1..N
const sortQuestionsByType = (questions: CustomExamQuestion[]): CustomExamQuestion[] => {
    const order: Record<CustomQuestionType, number> = { mcq: 0, short: 1, long: 2 };
    const sorted = [...questions].sort((a, b) => (order[a.type] ?? 0) - (order[b.type] ?? 0));
    return sorted.map((q, idx) => ({ ...q, id: idx + 1 }));
};

// Reusable editor for a list of hand-written / extracted questions (MCQ / short / long).
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
        onChange(sortQuestionsByType([...questions, q]));
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
    const remove = (index: number) => onChange(sortQuestionsByType(questions.filter((_, i) => i !== index)));

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
                            <label className="text-xs text-white/40">Marks:</label>
                            <input
                                type="number"
                                min={1}
                                max={20}
                                value={q.marks}
                                onChange={(e) => updateQ(qi, 'marks', Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                                className="text-input text-xs w-16 text-center"
                            />
                            <button
                                type="button"
                                onClick={() => remove(qi)}
                                className="text-xs text-red-400 hover:text-red-300 ml-2"
                            >
                                ✕ Delete
                            </button>
                        </div>
                    </div>

                    <input
                        type="text"
                        value={q.question}
                        onChange={(e) => updateQ(qi, 'question', e.target.value)}
                        placeholder={`Enter ${TYPE_META[q.type].label.toLowerCase()} question text...`}
                        className="text-input text-sm"
                    />

                    {q.type === 'mcq' ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {q.options.map((opt, oi) => (
                                    <input
                                        key={oi}
                                        type="text"
                                        value={opt.replace(/^\s*[A-Za-z][\)\.\:\-]\s*/, '')}
                                        onChange={(e) => updateOpt(qi, oi, e.target.value)}
                                        placeholder={`Option ${String.fromCharCode(65 + oi)}...`}
                                        className="text-input text-xs"
                                    />
                                ))}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <label className="text-xs text-white/40">Correct Answer:</label>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {['A', 'B', 'C', 'D'].map((letter) => (
                                            <button
                                                key={letter}
                                                type="button"
                                                onClick={() => updateQ(qi, 'correctAnswer', letter)}
                                                className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                                                    q.correctAnswer === letter ? 'bg-green-500 text-white shadow-lg' : 'bg-white/10 text-white/50 hover:bg-white/20'
                                                }`}
                                            >
                                                {letter}
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => updateQ(qi, 'correctAnswer', 'AI')}
                                            title="🤖 AI Dynamic Evaluation: No fixed right/wrong answer. Every valid choice receives full marks (never hurts student score) while AI extracts decision telemetry to enhance Cognitive Profiling."
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                                                q.correctAnswer === 'AI'
                                                    ? 'bg-purple-500/30 text-purple-200 border-purple-500/50 shadow-lg'
                                                    : 'bg-white/10 text-white/60 hover:bg-white/20 border-white/10'
                                            }`}
                                        >
                                            <span>🤖</span> AI Decides
                                        </button>
                                    </div>
                                </div>
                                {q.correctAnswer === 'AI' && (
                                    <p className="text-[11px] text-purple-300/80 bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                                        ✨ <strong>AI Dynamic Evaluation Active:</strong> Students receive 100% full marks for any valid choice (doesn't hurt overall score), while AI evaluates situational logic to enrich their Cognitive Profile.
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2">
                            <label className="text-xs text-white/40">Model answer key points (used for AI grading)</label>
                            {(q.keyPoints || ['']).map((kp, ki) => (
                                <div key={ki} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={kp}
                                        onChange={(e) => updateKP(qi, ki, e.target.value)}
                                        placeholder={`Key point ${ki + 1} for AI grading...`}
                                        className="text-input text-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const updated = (q.keyPoints || []).filter((_, i) => i !== ki);
                                            updateQ(qi, 'keyPoints', updated.length ? updated : ['']);
                                        }}
                                        className="text-xs text-white/30 hover:text-white/60 px-2"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => updateQ(qi, 'keyPoints', [...(q.keyPoints || []), ''])}
                                className="text-xs text-primary-300 hover:underline"
                            >
                                + Add key point
                            </button>
                        </div>
                    )}
                </div>
            ))}

            <div className="flex gap-2 flex-wrap pt-1">
                <button onClick={() => add('mcq')} className="flex-1 min-w-[120px] glass-card p-3 text-center text-white/50 hover:text-white/80 hover:bg-white/10 transition-all border-2 border-dashed border-white/10 hover:border-white/20 text-xs">
                    + Add MCQ
                </button>
                <button onClick={() => add('short')} className="flex-1 min-w-[120px] glass-card p-3 text-center text-white/50 hover:text-white/80 hover:bg-white/10 transition-all border-2 border-dashed border-white/10 hover:border-white/20 text-xs">
                    + Add Short Question
                </button>
                <button onClick={() => add('long')} className="flex-1 min-w-[120px] glass-card p-3 text-center text-white/50 hover:text-white/80 hover:bg-white/10 transition-all border-2 border-dashed border-white/10 hover:border-white/20 text-xs">
                    + Add Long Question
                </button>
            </div>
        </div>
    );
}

export function AssessmentSetupScreen({
    onStartCustomExam,
    onStartGeneralQuiz,
    onBack,
    userName,
    sessionAuthor = false,
    onAuthorCustomExam,
    onAuthorGeneralQuiz,
}: AssessmentSetupScreenProps) {
    const [tab, setTab] = useState<SetupTab>('select-mode');

    // Route a finished custom exam either to the session (author) or the taker.
    const deliverCustomExam = (exam: GeneratedExam) => {
        const questions = exam.examId ? exam.questions : appendCognitiveProbes(exam.questions);
        const finalExam: GeneratedExam = {
            ...exam,
            questions: sortQuestionsByType(questions),
            durationSeconds: timerEnabled ? Math.max(60, Math.round((Number(durationMinutes) || 0) * 60)) : undefined,
            timerMode,
        };
        if (sessionAuthor && onAuthorCustomExam) onAuthorCustomExam(finalExam);
        else onStartCustomExam(finalExam);
    };

    // Document / Camera scan file upload state
    const [extractedText, setExtractedText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [paperFiles, setPaperFiles] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Live Questions Workspace (manual + extracted questions)
    const [manualQuestions, setManualQuestions] = useState<CustomExamQuestion[]>([
        { id: 1, type: 'mcq', marks: 1, question: '', options: ['', '', '', ''], correctAnswer: 'A', explanation: '' },
    ]);

    // AI Generator state
    const [showAiConfig, setShowAiConfig] = useState(false);
    const [materialText, setMaterialText] = useState('');
    const [mcqCount, setMcqCount] = useState(0);
    const [shortCount, setShortCount] = useState(0);
    const [longCount, setLongCount] = useState(0);
    const mcqMarks = MARKS_PER_MCQ;
    const shortMarks = MARKS_PER_SHORT;
    const longMarks = MARKS_PER_LONG;
    const [difficulty, setDifficulty] = useState<ExamDifficulty>('normal');
    const [additionalInstructions, setAdditionalInstructions] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState('');
    const materialFileRef = useRef<HTMLInputElement>(null);

    // Title state
    const [examTitle, setExamTitle] = useState('');

    // Timer state
    const [timerEnabled, setTimerEnabled] = useState(true);
    const [durationMinutes, setDurationMinutes] = useState<number | ''>(20);
    const [timerMode, setTimerMode] = useState<'auto-submit' | 'soft'>('auto-submit');

    const timerError = (): string =>
        timerEnabled && (durationMinutes === '' || Number(durationMinutes) < 1)
            ? 'Please set the exam timer to at least 1 minute, or turn the timer off.'
            : '';

    // Preview state & editing with Undo/Redo history
    const [previewExam, setPreviewExam] = useState<GeneratedExam | null>(null);
    const [editingPreviewId, setEditingPreviewId] = useState<number | null>(null);
    const [previewHistory, setPreviewHistory] = useState<GeneratedExam[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    const updatePreviewWithHistory = (newExam: GeneratedExam) => {
        const nextHistory = previewHistory.slice(0, historyIndex + 1);
        nextHistory.push(newExam);
        setPreviewHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
        setPreviewExam(newExam);
    };

    const handleUndoPreview = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setPreviewExam(previewHistory[newIndex]);
        }
    };

    const handleRedoPreview = () => {
        if (historyIndex < previewHistory.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            setPreviewExam(previewHistory[newIndex]);
        }
    };

    const handleDeletePreviewQuestion = (qId: number) => {
        if (!previewExam) return;
        const filtered = previewExam.questions.filter(q => q.id !== qId);
        const sorted = sortQuestionsByType(filtered);
        const newTotalMarks = sorted.reduce((sum, q) => sum + (q.marks || 1), 0);
        const newExam = {
            ...previewExam,
            totalMarks: newTotalMarks,
            questions: sorted
        };
        updatePreviewWithHistory(newExam);
    };

    const handleUpdatePreviewQuestion = (qId: number, field: keyof CustomExamQuestion, value: any) => {
        if (!previewExam) return;
        const updatedQuestions = previewExam.questions.map(q => {
            if (q.id === qId) {
                return { ...q, [field]: value };
            }
            return q;
        });
        const newTotalMarks = updatedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
        const newExam = {
            ...previewExam,
            totalMarks: newTotalMarks,
            questions: updatedQuestions
        };
        updatePreviewWithHistory(newExam);
    };

    // Handle Document / Camera Scan Upload
    const handleDocUpload = async (files: FileList | null, target: 'hybrid' | 'material') => {
        if (!files || files.length === 0) return;
        const fileArr = Array.from(files);

        if (fileArr.length > 7) {
            const limitMsg = 'You can upload at most 7 files combined (PNG, JPG, PDF, DOCX, TXT).';
            if (target === 'hybrid') setUploadError(limitMsg);
            else setGenerateError(limitMsg);
            return;
        }

        if (target === 'hybrid') {
            setIsUploading(true);
            setUploadError('');
        } else {
            setIsGenerating(true);
            setGenerateError('');
        }

        const res = await uploadPdf(fileArr);
        if (target === 'hybrid') setIsUploading(false);
        else setIsGenerating(false);

        if (res.success && res.text) {
            if (target === 'hybrid') {
                setExtractedText(res.text);
                setPaperFiles(fileArr.map(f => f.name));
            } else {
                setMaterialText(res.text);
                setPaperFiles(fileArr.map(f => f.name));
                setShowAiConfig(true);
            }
        } else {
            const errMsg = res.error || 'Failed to extract text from file(s)';
            if (target === 'hybrid') setUploadError(errMsg);
            else setGenerateError(errMsg);
        }
    };

    // Parse uploaded file into live questions editor
    const handleParsePaper = async () => {
        if (!extractedText.trim()) return;
        const tErr = timerError();
        if (tErr) { setUploadError(tErr); return; }
        setIsParsing(true);
        setUploadError('');

        const result = await parsePaper(extractedText);
        setIsParsing(false);

        if (result.success && result.exam) {
            const finalTitle = examTitle.trim() || result.exam.examTitle || 'Custom Exam';
            if (!examTitle.trim()) setExamTitle(finalTitle);

            if (result.exam.durationMinutes && result.exam.durationMinutes > 0) {
                setDurationMinutes(result.exam.durationMinutes);
                setTimerEnabled(true);
            }

            const parsedQs: CustomExamQuestion[] = (result.exam.questions || [])
                .filter((q: any) => !q.probe)
                .map((q: any, idx: number) => ({
                    id: idx + 1,
                    type: q.type || 'mcq',
                    marks: q.marks || (q.type === 'long' ? 6 : q.type === 'short' ? 3 : 1),
                    question: q.question || '',
                    options: Array.isArray(q.options) ? q.options.map((o: string) => o.replace(/^[A-D]\)\s*/, '')) : ['', '', '', ''],
                    correctAnswer: q.correctAnswer || 'A',
                    explanation: q.explanation || '',
                    keyPoints: q.keyPoints || [''],
                }));

            if (parsedQs.length > 0) {
                setManualQuestions(prev => sortQuestionsByType([...prev.filter(q => q.question.trim()), ...parsedQs]));
            }
        } else {
            setUploadError(result.error || 'Failed to parse paper');
        }
    };

    // Launch Unified Hybrid Exam (Manual + Scans + AI)
    const handleLaunchUnifiedExam = async () => {
        if (!examTitle.trim()) {
            setGenerateError('Please enter a test/subject title (e.g. Physics Test 1)');
            return;
        }
        const tErr = timerError();
        if (tErr) { setGenerateError(tErr); return; }

        const validManual = manualQuestions
            .filter(q => {
                if (!q.question.trim()) return false;
                if (q.type === 'mcq') return q.options.some(o => o.trim());
                return true;
            })
            .map(q => ({
                ...q,
                marks: Math.max(1, Math.min(20, q.marks || 1)),
                options: q.type === 'mcq' ? withOptionLetters(q.options) : q.options,
            }));

        const aiRequested = mcqCount + shortCount + longCount;

        // Case A: Pure Manual / Extracted Paper (No AI generation requested)
        if (aiRequested === 0) {
            if (validManual.length === 0) {
                setGenerateError('Please add at least one question to your exam.');
                return;
            }
            const sorted = sortQuestionsByType(validManual);
            const totalMarks = sorted.reduce((sum, q) => sum + q.marks, 0);
            const finalExam: GeneratedExam = {
                examTitle: examTitle.trim(),
                totalMarks,
                questions: sorted,
            };
            setPreviewExam(finalExam);
            return;
        }

        // Case B: AI Material / Hybrid Exam Generation
        if (aiRequested > 0 && materialText.trim().length < 20) {
            setGenerateError('Please provide study material text (at least 20 characters) for AI generation, or set AI question counts to 0.');
            return;
        }
        if (aiRequested > MAX_TOTAL_QUESTIONS) {
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
            manualQuestions: validManual,
            difficulty,
            additionalInstructions,
        });
        setIsGenerating(false);

        if (result.success && result.exam) {
            const finalTitle = examTitle.trim() || result.exam.examTitle || 'Generated Hybrid Exam';
            const finalExam = { ...result.exam, examTitle: finalTitle };
            setPreviewExam(finalExam);
            setPreviewHistory([finalExam]);
            setHistoryIndex(0);
        } else {
            setGenerateError(result.error || 'Failed to generate exam');
        }
    };

    const handleStartPreviewExam = () => {
        if (!previewExam) return;
        deliverCustomExam(previewExam);
    };

    // Calculate Dynamic Marks Total
    const bonusMarksTotal = manualQuestions
        .filter(q => q.question.trim())
        .reduce((sum, q) => sum + Math.max(1, Math.min(20, q.marks || 1)), 0);
    const aiMarksTotal = mcqCount * mcqMarks + shortCount * shortMarks + longCount * longMarks;
    const totalMarksCalculated = bonusMarksTotal + (showAiConfig ? aiMarksTotal : 0);

    // Timer controls block
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
                            min={0}
                            max={240}
                            value={durationMinutes}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === '') { setDurationMinutes(''); return; }
                                setDurationMinutes(Math.max(0, Math.min(240, Number(v) || 0)));
                            }}
                            placeholder="e.g. 20"
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
                    </div>
                </>
            )}
        </div>
    );

    // Preview Screen
    if (previewExam) {
        return (
            <section className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="max-w-3xl w-full space-y-6 relative z-10">
                    <div className="glass-card p-6 border-2 border-primary-500/40 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h2 className="text-2xl font-extrabold text-white">{previewExam.examTitle}</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleUndoPreview}
                                    disabled={historyIndex <= 0}
                                    className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Undo last edit or deletion"
                                >
                                    <span>↩️</span> Undo
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRedoPreview}
                                    disabled={historyIndex >= previewHistory.length - 1}
                                    className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Redo edit or deletion"
                                >
                                    <span>↪️</span> Redo
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-white/70 flex-wrap">
                            <span>Total Questions: <strong>{previewExam.questions.filter(q => !q.probe).length}</strong></span>
                            <span>•</span>
                            <span>Total Marks: <strong>{previewExam.totalMarks}</strong></span>
                            {timerEnabled && (
                                <>
                                    <span>•</span>
                                    <span>Timer: <strong>{durationMinutes} mins</strong> ({timerMode})</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="glass-card p-5 max-h-[55vh] overflow-y-auto space-y-4">
                        {previewExam.questions.filter(q => !q.probe).map((q, i) => (
                            <div key={q.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="bg-primary-500/20 text-primary-300 text-xs px-2 py-0.5 rounded-full font-bold">
                                            Q{i + 1} ({q.marks}m)
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_META[q.type].badge}`}>
                                            {TYPE_META[q.type].label}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditingPreviewId(editingPreviewId === q.id ? null : q.id)}
                                            className="text-xs text-primary-300 hover:text-primary-200 bg-primary-500/10 px-2.5 py-1 rounded-lg border border-primary-500/20"
                                        >
                                            {editingPreviewId === q.id ? '✓ Done' : '✏️ Edit'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeletePreviewQuestion(q.id)}
                                            className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20"
                                        >
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>

                                {editingPreviewId === q.id ? (
                                    <div className="space-y-2 pt-2 border-t border-white/10">
                                        <label className="text-xs text-white/40">Edit Question Text:</label>
                                        <input
                                            type="text"
                                            value={q.question}
                                            onChange={(e) => handleUpdatePreviewQuestion(q.id, 'question', e.target.value)}
                                            className="text-input text-xs"
                                        />
                                        <div className="flex items-center gap-3 pt-1">
                                            <label className="text-xs text-white/40">Marks:</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={20}
                                                value={q.marks}
                                                onChange={(e) => handleUpdatePreviewQuestion(q.id, 'marks', Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                                                className="text-input text-xs w-20 text-center"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-white/90 font-medium">{q.question}</p>
                                )}

                                {q.type === 'mcq' && q.options.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                                        {q.options.map((opt, oi) => (
                                            <div key={oi} className="text-xs p-2 rounded-lg border border-white/10 bg-white/5 text-white/70">
                                                {editingPreviewId === q.id ? (
                                                    <input
                                                        type="text"
                                                        value={opt.replace(/^\s*[A-Za-z][\)\.\:\-]\s*/, '')}
                                                        onChange={(e) => {
                                                            const newOpts = [...q.options];
                                                            newOpts[oi] = `${OPTION_LETTERS[oi]}) ${e.target.value}`;
                                                            handleUpdatePreviewQuestion(q.id, 'options', newOpts);
                                                        }}
                                                        className="text-input text-xs w-full"
                                                    />
                                                ) : (
                                                    opt
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 justify-center">
                        <button onClick={() => setPreviewExam(null)} className="btn-secondary !py-3 !px-6">
                            ← Back to Edit
                        </button>
                        <button onClick={handleStartPreviewExam} className="btn-primary !py-3 !px-8 text-lg">
                            {sessionAuthor ? '✅ Use This Paper for Session' : '🚀 Start Exam'}
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    // Unified Hybrid Exam Studio Screen
    if (tab === 'hybrid') {
        return (
            <section className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="max-w-4xl w-full space-y-6 relative z-10 my-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <button onClick={() => setTab('select-mode')} className="btn-secondary !py-2 !px-4 text-sm">
                            ← Choose Mode
                        </button>
                        <h1 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                            🎓 Unified Hybrid Exam Studio
                        </h1>
                    </div>

                    {/* Section 1: Title & Overall Timer */}
                    <div className="glass-card p-5 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-white/70 uppercase tracking-wider">Exam / Subject Title</label>
                            <input
                                type="text"
                                value={examTitle}
                                onChange={(e) => setExamTitle(e.target.value)}
                                placeholder="e.g. Computer Networks - Midterm Exam"
                                className="text-input text-sm mt-1"
                            />
                        </div>
                        {renderTimerControls()}
                    </div>

                    {/* Section 2: Upload File / Camera Scan (Optional) */}
                    <div className="glass-card p-5 space-y-3">
                        <div>
                            <h3 className="font-semibold text-base flex items-center gap-2">
                                <span>📄</span> Upload Document or Camera Scan <span className="text-xs font-normal text-white/40">(PDF, DOCX, TXT, PNG, JPG)</span>
                            </h3>
                            <p className="text-xs text-white/40 mt-0.5">
                                Upload an existing test paper or camera scan photo to automatically extract and digitize its questions.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,image/*"
                                multiple
                                onChange={(e) => handleDocUpload(e.target.files, 'hybrid')}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading || isParsing}
                                className="btn-secondary !py-2.5 !px-4 text-xs flex items-center gap-2"
                            >
                                <span>📷</span> {isUploading ? 'Extracting File Text...' : 'Upload File / Photo Scan'}
                            </button>
                            {paperFiles.length > 0 && (
                                <span className="text-xs text-green-400 font-medium">
                                    ✓ {paperFiles.length} file(s) attached
                                </span>
                            )}
                        </div>

                        {uploadError && (
                            <p className="text-xs text-red-400">⚠️ {uploadError}</p>
                        )}

                        {extractedText.trim() && (
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handleParsePaper}
                                    disabled={isParsing}
                                    className="btn-primary !py-2 !px-4 text-xs flex items-center gap-2 bg-gradient-to-r from-amber-500 to-primary-500"
                                >
                                    <span>⚡</span> {isParsing ? 'Parsing Questions into Editor...' : 'Extract Questions into Live Editor'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Collapsible AI Generator Card */}
                    <div className="glass-card p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-base flex items-center gap-2">
                                    <span>⚙️</span> AI Question Generator & Directives
                                </h3>
                                <p className="text-xs text-white/40 mt-0.5">
                                    Paste study notes or set sliders to let AI generate additional questions.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAiConfig(v => !v)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${
                                    showAiConfig
                                        ? 'bg-primary-500/30 text-primary-200 border-primary-500/50'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/10'
                                }`}
                            >
                                {showAiConfig ? '▲ Collapse AI Generator' : '🤖 + Expand AI Generator'}
                            </button>
                        </div>

                        {showAiConfig && (
                            <div className="space-y-4 pt-3 border-t border-white/10">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs text-white/60">Study Material / Lecture Notes</label>
                                        <button
                                            type="button"
                                            onClick={() => materialFileRef.current?.click()}
                                            className="text-[11px] text-primary-300 hover:underline flex items-center gap-1"
                                        >
                                            <span>📁</span> Upload Study Notes File (PDF, DOCX, TXT)
                                        </button>
                                        <input
                                            ref={materialFileRef}
                                            type="file"
                                            accept=".pdf,.docx,.txt"
                                            multiple
                                            onChange={(e) => handleDocUpload(e.target.files, 'material')}
                                            className="hidden"
                                        />
                                    </div>
                                    <textarea
                                        value={materialText}
                                        onChange={(e) => setMaterialText(e.target.value)}
                                        placeholder="Paste lecture notes or chapter text here for AI generation..."
                                        className="text-input text-xs min-h-[90px]"
                                    />
                                </div>

                                <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/5">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-white/80">Multiple-Choice Questions (MCQ)</span>
                                            <span className="text-primary-300 font-bold">{mcqCount}</span>
                                        </div>
                                        <input type="range" min={0} max={40} value={mcqCount} onChange={(e) => setMcqCount(parseInt(e.target.value))} className="w-full accent-primary-500" />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-white/80">Short-Answer Questions</span>
                                            <span className="text-fuchsia-300 font-bold">{shortCount}</span>
                                        </div>
                                        <input type="range" min={0} max={20} value={shortCount} onChange={(e) => setShortCount(parseInt(e.target.value))} className="w-full accent-fuchsia-500" />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-white/80">Long-Answer / Essay Questions</span>
                                            <span className="text-amber-300 font-bold">{longCount}</span>
                                        </div>
                                        <input type="range" min={0} max={15} value={longCount} onChange={(e) => setLongCount(parseInt(e.target.value))} className="w-full accent-amber-500" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-white/70">AI Difficulty Level <span className="text-white/40 font-normal">(Applies strictly to AI-generated questions)</span></label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {([
                                            { key: 'easy', label: '🟢 Easy', desc: 'Direct Recall & Definitions' },
                                            { key: 'normal', label: '🟡 Normal', desc: 'Applied Theory Scenarios' },
                                            { key: 'hard', label: '🔴 Hard', desc: 'Complex Scenarios & Distractors' },
                                        ] as const).map((d) => (
                                            <button
                                                key={d.key}
                                                type="button"
                                                onClick={() => setDifficulty(d.key)}
                                                className={`p-2.5 rounded-xl text-center transition-all border ${
                                                    difficulty === d.key
                                                        ? 'border-primary-500/50 bg-primary-500/20 text-white shadow-lg'
                                                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10'
                                                }`}
                                            >
                                                <div className="text-xs font-semibold">{d.label}</div>
                                                <div className="text-[10px] text-white/40 mt-0.5">{d.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-white/10">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-white/80 uppercase tracking-wider flex items-center gap-1.5">
                                            <span>💬</span> Additional AI Instructions / Directives <span className="text-white/40 font-normal text-[10px] lowercase">(optional)</span>
                                        </label>
                                        <span className="text-xs text-white/40">
                                            {additionalInstructions.trim() ? additionalInstructions.trim().split(/\s+/).filter(Boolean).length : 0} / 50 words
                                        </span>
                                    </div>
                                    <textarea
                                        value={additionalInstructions}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const words = val.trim().split(/\s+/).filter(Boolean);
                                            if (words.length <= 50 || val.length < additionalInstructions.length) {
                                                setAdditionalInstructions(val);
                                            }
                                        }}
                                        placeholder="e.g. 'Focus on cybersecurity protocols', 'Include Python code snippets'..."
                                        className="text-input text-xs min-h-[60px] resize-y"
                                        rows={2}
                                    />
                                    <p className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                                        ⚡ <strong>Priority Rule Active:</strong> Appears ONLY for AI-generated questions. Overrides default difficulty presets.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 4: Live Questions Workspace */}
                    <div className="glass-card p-5 space-y-4">
                        <div>
                            <h3 className="font-semibold text-base flex items-center gap-2">
                                <span>✍️</span> Live Questions Workspace <span className="text-xs font-normal text-white/40">(Manual + Extracted + AI)</span>
                            </h3>
                            <p className="text-xs text-white/40 mt-0.5">
                                Add, edit, or remove questions. Questions are automatically ordered: <strong>MCQ → Short → Long</strong>.
                            </p>
                        </div>

                        <ManualQuestionsEditor
                            questions={manualQuestions}
                            onChange={setManualQuestions}
                        />

                        {/* Dynamic Summary */}
                        <div className="flex items-center gap-4 text-sm rounded-xl p-3 bg-white/5 text-white/70 border border-white/10 flex-wrap justify-between">
                            <div className="flex items-center gap-3">
                                <span><strong className="text-white">{manualQuestions.filter(q => q.question.trim()).length + (showAiConfig ? mcqCount + shortCount + longCount : 0)}</strong> total questions</span>
                                <span className="text-white/20">|</span>
                                <span><strong className="text-white">{totalMarksCalculated}</strong> total marks</span>
                            </div>
                            {timerEnabled && (
                                <span className="text-xs text-accent-300 font-semibold bg-accent-500/20 px-2.5 py-1 rounded-full">
                                    ⏱️ {durationMinutes || 0} mins ({timerMode})
                                </span>
                            )}
                        </div>
                    </div>

                    {generateError && (
                        <div className="text-xs text-red-300 bg-red-500/20 p-3 rounded-xl border border-red-500/30">
                            ⚠️ {generateError}
                        </div>
                    )}

                    <button
                        onClick={handleLaunchUnifiedExam}
                        disabled={isGenerating || isUploading || isParsing}
                        className="btn-primary w-full !py-4 text-lg font-bold shadow-2xl flex items-center justify-center gap-2"
                    >
                        <span>{sessionAuthor ? '✅' : '🚀'}</span>
                        {isGenerating ? 'Generating & Structuring Exam...' : sessionAuthor ? 'Use This Hybrid Paper for Session' : 'Generate & Launch Hybrid Exam'}
                    </button>
                </div>
            </section>
        );
    }

    // Mode Selection Screen (2 CLEAN OPTIONS)
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
                        <span className="text-4xl">🎓</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                        {sessionAuthor ? 'Create Session Assessment' : 'Choose Assessment Mode'}
                    </h1>
                    <p className="text-white/50 text-sm">
                        {sessionAuthor
                            ? 'Build the paper every participant in this session will take.'
                            : userName ? `Welcome, ${userName}` : 'Select your assessment format'}
                    </p>
                </div>

                <div className="grid gap-4">
                    {/* Option 1: General Aptitude Test */}
                    {(sessionAuthor ? onAuthorGeneralQuiz : onStartGeneralQuiz) && (
                        <button
                            onClick={() => (sessionAuthor ? onAuthorGeneralQuiz?.() : onStartGeneralQuiz?.())}
                            className="glass-card p-6 text-left hover:bg-white/10 transition-all group cursor-pointer border border-white/5 hover:border-emerald-500/30"
                        >
                            <div className="flex items-start gap-4">
                                <div className="text-4xl group-hover:scale-110 transition-transform">🧠</div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-xl">General Aptitude Test</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">
                                        A quick 12-question mix of problem-solving, logical, verbal, and visual diagram puzzles. Randomly generated for every attempt — instant marks + cognitive profile.
                                    </p>
                                    <span className="inline-block text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full mt-1">
                                        {sessionAuthor ? 'One aptitude test for all participants' : '12 Questions · Auto-Graded'}
                                    </span>
                                </div>
                            </div>
                        </button>
                    )}

                    {/* Option 2: Unified Hybrid Exam Studio (Custom Paper & AI Generator) */}
                    <button
                        onClick={() => setTab('hybrid')}
                        className="glass-card p-6 text-left hover:bg-white/10 transition-all group cursor-pointer border border-white/5 hover:border-primary-500/30 bg-gradient-to-r from-primary-500/10 to-accent-500/10"
                    >
                        <div className="flex items-start gap-4">
                            <div className="text-4xl group-hover:scale-110 transition-transform">🎓</div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-xl text-primary-200 flex items-center gap-2">
                                    Unified Hybrid Exam Studio
                                    <span className="text-[10px] bg-primary-500/30 text-primary-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border border-primary-500/40">
                                        Custom &amp; AI
                                    </span>
                                </h3>
                                <p className="text-white/60 text-sm leading-relaxed">
                                    Upload file/scanned photo papers, type your own questions, or let AI generate questions from study notes. Supports all 4 creation modes in one workspace!
                                </p>
                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                    <span className="text-xs bg-accent-500/20 text-accent-300 px-2 py-0.5 rounded-full">✍️ Manual</span>
                                    <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">📄 Photo / PDF Scans</span>
                                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">🤖 AI Material Generator</span>
                                </div>
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        </section>
    );
}
