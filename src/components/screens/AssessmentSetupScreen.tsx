import { useState, useRef } from 'react';
import { uploadPdf, generateExam, parsePaper } from '../../services/api';
import { CustomExamQuestion, ExamDifficulty, GeneratedExam } from '../../types/quiz.types';

interface AssessmentSetupScreenProps {
    onStartAIScenario: () => void;
    onStartCustomExam: (exam: GeneratedExam) => void;
    onBack: () => void;
    userName?: string;
}

type SetupTab = 'select-mode' | 'custom-paper' | 'ai-material';
type CustomPaperMode = 'upload' | 'manual';

export function AssessmentSetupScreen({
    onStartAIScenario,
    onStartCustomExam,
    onBack,
    userName,
}: AssessmentSetupScreenProps) {
    const [tab, setTab] = useState<SetupTab>('select-mode');

    // Custom Paper state
    const [customMode, setCustomMode] = useState<CustomPaperMode>('upload');
    const [extractedText, setExtractedText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [pdfPageCount, setPdfPageCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Manual entry state
    const [manualQuestions, setManualQuestions] = useState<CustomExamQuestion[]>([
        { id: 1, type: 'mcq', marks: 1, question: '', options: ['', '', '', ''], correctAnswer: 'A', explanation: '' },
    ]);

    // AI Material state
    const [materialText, setMaterialText] = useState('');
    const [questionCount, setQuestionCount] = useState(10);
    const [totalMarks, setTotalMarks] = useState(10);
    const [difficulty, setDifficulty] = useState<ExamDifficulty>('normal');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState('');
    const [materialPageCount, setMaterialPageCount] = useState(0);
    const materialFileRef = useRef<HTMLInputElement>(null);

    // Exam / Subject Title state (Mandatory for tracking & AI Chatbot queries)
    const [examTitle, setExamTitle] = useState('');

    // Preview state
    const [previewExam, setPreviewExam] = useState<GeneratedExam | null>(null);

    // ─── PDF Upload Handler ───
    const handlePdfUpload = async (file: File, target: 'paper' | 'material') => {
        if (target === 'paper') {
            setIsUploading(true);
            setUploadError('');
        } else {
            setIsGenerating(true);
            setGenerateError('');
        }

        const result = await uploadPdf(file);

        if (result.success && result.text) {
            if (target === 'paper') {
                setExtractedText(result.text);
                setPdfPageCount(result.pageCount || 0);
                setIsUploading(false);
            } else {
                setMaterialText(result.text);
                setMaterialPageCount(result.pageCount || 0);
                setIsGenerating(false);
            }
        } else {
            const errMsg = result.error || 'Failed to read PDF';
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

    // ─── Generate exam from material ───
    const handleGenerateExam = async () => {
        if (!materialText.trim()) return;
        if (!examTitle.trim()) {
            setGenerateError('Please enter a test/subject title (e.g. Physics Test 1)');
            return;
        }
        setIsGenerating(true);
        setGenerateError('');

        const result = await generateExam({
            materialText,
            questionCount,
            totalMarks,
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

    // ─── Manual entry helpers ───
    const addManualQuestion = () => {
        setManualQuestions(prev => [
            ...prev,
            {
                id: prev.length + 1,
                type: 'mcq',
                marks: 1,
                question: '',
                options: ['', '', '', ''],
                correctAnswer: 'A',
                explanation: '',
            },
        ]);
    };

    const updateManualQuestion = (index: number, field: string, value: any) => {
        setManualQuestions(prev => {
            const updated = [...prev];
            (updated[index] as any)[field] = value;
            return updated;
        });
    };

    const updateManualOption = (qIndex: number, optIndex: number, value: string) => {
        setManualQuestions(prev => {
            const updated = [...prev];
            updated[qIndex].options[optIndex] = value;
            return updated;
        });
    };

    const removeManualQuestion = (index: number) => {
        setManualQuestions(prev => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, id: i + 1 })));
    };

    const handleStartManualExam = () => {
        const valid = manualQuestions.filter(q => q.question.trim() && q.options.every(o => o.trim()));
        if (valid.length === 0) return;
        const total = valid.reduce((sum, q) => sum + q.marks, 0);
        onStartCustomExam({
            examTitle: examTitle.trim() || 'Custom Paper',
            totalMarks: total,
            questions: valid,
        });
    };

    // ─── Preview & Start ───
    const handleStartPreviewExam = () => {
        if (previewExam) {
            onStartCustomExam(previewExam);
        }
    };

    // ─── RENDER ──────────────────────────────────────────────────────────────────

    // Preview Screen
    if (previewExam) {
        return (
            <section className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
                <div className="floating-shape shape-1 w-96 h-96 bg-primary-500 -top-48 -left-48" />
                <div className="floating-shape shape-2 w-72 h-72 bg-accent-500 -bottom-36 -right-36" style={{ animationDelay: '2s' }} />

                <div className="max-w-3xl w-full space-y-6 relative z-10">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold">📋 Exam Preview</h1>
                        <p className="text-white/60">{previewExam.examTitle}</p>
                        <div className="flex items-center justify-center gap-4 text-sm">
                            <span className="bg-primary-500/20 text-primary-300 px-3 py-1 rounded-full">
                                {previewExam.questions.length} Questions
                            </span>
                            <span className="bg-accent-500/20 text-accent-300 px-3 py-1 rounded-full">
                                {previewExam.totalMarks} Total Marks
                            </span>
                        </div>
                    </div>

                    <div className="glass-card p-5 max-h-[50vh] overflow-y-auto space-y-4">
                        {previewExam.questions.map((q, i) => (
                            <div key={q.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                                <div className="flex items-start gap-2">
                                    <span className="bg-primary-500/20 text-primary-300 text-xs px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                                        Q{i + 1} ({q.marks}m)
                                    </span>
                                    <p className="text-sm text-white/90">{q.question}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pl-8">
                                    {q.options.map((opt, oi) => (
                                        <div
                                            key={oi}
                                            className={`text-xs p-2 rounded-lg border ${
                                                q.correctAnswer && opt.startsWith(q.correctAnswer)
                                                    ? 'border-green-500/30 bg-green-500/10 text-green-300'
                                                    : 'border-white/10 bg-white/5 text-white/60'
                                            }`}
                                        >
                                            {opt}
                                        </div>
                                    ))}
                                </div>
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
                            🚀 Start Exam
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
                        ← Dashboard
                    </button>
                </div>

                <div className="max-w-2xl w-full space-y-6 relative z-10">
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 shadow-2xl animate-glow">
                            <span className="text-4xl">📝</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-white to-primary-200 bg-clip-text text-transparent">
                            Choose Assessment Mode
                        </h1>
                        {userName && (
                            <p className="text-white/50 text-sm">Welcome, {userName}</p>
                        )}
                    </div>

                    <div className="grid gap-4">
                        {/* AI Adaptive Scenario */}
                        <button
                            onClick={onStartAIScenario}
                            className="glass-card p-6 text-left hover:bg-white/10 transition-all group cursor-pointer border border-white/5 hover:border-primary-500/30"
                        >
                            <div className="flex items-start gap-4">
                                <div className="text-4xl group-hover:scale-110 transition-transform">🧠</div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-xl">AI Adaptive Scenario</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">
                                        AI generates interactive dilemmas with sliders, rankings, and MCQs. Measures cognitive profile through behavioral telemetry across two adaptive rounds.
                                    </p>
                                    <span className="inline-block text-xs bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full mt-1">
                                        Existing Flow
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
                                        Upload a PDF exam paper or manually enter your own questions, options, correct answers, and marks. The system digitizes and auto-grades it.
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
                                        Upload study material or paste notes. AI generates a custom exam calibrated by Bloom's Taxonomy difficulty (Easy / Normal / Hard).
                                    </p>
                                    <span className="inline-block text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full mt-1">
                                        AI-Powered Generation
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
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

                    {/* Mode Toggle */}
                    <div className="glass-card p-1 flex gap-1">
                        <button
                            onClick={() => setCustomMode('upload')}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                customMode === 'upload' ? 'bg-primary-500 text-white shadow-lg' : 'text-white/50 hover:text-white/80'
                            }`}
                        >
                            📤 Upload PDF
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

                    {/* Upload PDF Mode */}
                    {customMode === 'upload' && (
                        <div className="space-y-4">
                            <div
                                className="glass-card p-8 border-2 border-dashed border-white/20 hover:border-primary-500/40 transition-all cursor-pointer text-center"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handlePdfUpload(file, 'paper');
                                    }}
                                />
                                {isUploading ? (
                                    <div className="space-y-2">
                                        <div className="text-4xl animate-spin">⏳</div>
                                        <p className="text-white/60">Extracting text from PDF...</p>
                                    </div>
                                ) : extractedText ? (
                                    <div className="space-y-2">
                                        <div className="text-4xl">✅</div>
                                        <p className="text-green-300 font-semibold">PDF Loaded ({pdfPageCount} pages)</p>
                                        <p className="text-white/40 text-xs">Click to replace with a different file</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="text-4xl">📤</div>
                                        <p className="text-white/70 font-medium">Click to upload exam paper PDF</p>
                                        <p className="text-white/40 text-xs">Max 10MB • Digital PDFs supported</p>
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
                                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                    ⚠️ {uploadError}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual Entry Mode */}
                    {customMode === 'manual' && (
                        <div className="space-y-4">
                            {manualQuestions.map((q, qi) => (
                                <div key={qi} className="glass-card p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-sm text-primary-300">Question {qi + 1}</h3>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-white/40">Marks:</label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={q.marks}
                                                onChange={(e) => updateManualQuestion(qi, 'marks', parseInt(e.target.value) || 1)}
                                                className="text-input !w-16 !py-1 text-center text-sm"
                                            />
                                            {manualQuestions.length > 1 && (
                                                <button
                                                    onClick={() => removeManualQuestion(qi)}
                                                    className="text-red-400 hover:text-red-300 text-sm px-2"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Enter question text..."
                                        value={q.question}
                                        onChange={(e) => updateManualQuestion(qi, 'question', e.target.value)}
                                        className="text-input text-sm"
                                    />

                                    <div className="grid grid-cols-2 gap-2">
                                        {['A', 'B', 'C', 'D'].map((letter, oi) => (
                                            <input
                                                key={letter}
                                                type="text"
                                                placeholder={`${letter}) Option...`}
                                                value={q.options[oi]}
                                                onChange={(e) => updateManualOption(qi, oi, e.target.value)}
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
                                                    onClick={() => updateManualQuestion(qi, 'correctAnswer', letter)}
                                                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                                                        q.correctAnswer === letter
                                                            ? 'bg-green-500 text-white shadow-lg'
                                                            : 'bg-white/10 text-white/50 hover:bg-white/20'
                                                    }`}
                                                >
                                                    {letter}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={addManualQuestion}
                                className="w-full glass-card p-3 text-center text-white/50 hover:text-white/80 hover:bg-white/10 transition-all border-2 border-dashed border-white/10 hover:border-white/20"
                            >
                                + Add Question
                            </button>

                            <div className="glass-card p-4 flex items-center justify-between">
                                <div className="text-sm text-white/60">
                                    <span className="font-semibold text-white">{manualQuestions.length}</span> questions •{' '}
                                    <span className="font-semibold text-white">{manualQuestions.reduce((s, q) => s + q.marks, 0)}</span> total marks
                                </div>
                                <button
                                    onClick={handleStartManualExam}
                                    disabled={manualQuestions.filter(q => q.question.trim()).length === 0}
                                    className="btn-primary !py-2.5 !px-6 disabled:opacity-50"
                                >
                                    🚀 Start Exam
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

                    {/* Material Input */}
                    <div className="space-y-4">
                        <div
                            className="glass-card p-6 border-2 border-dashed border-white/20 hover:border-green-500/40 transition-all cursor-pointer text-center"
                            onClick={() => materialFileRef.current?.click()}
                        >
                            <input
                                ref={materialFileRef}
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePdfUpload(file, 'material');
                                }}
                            />
                            {materialPageCount > 0 ? (
                                <div className="space-y-1">
                                    <div className="text-3xl">✅</div>
                                    <p className="text-green-300 font-semibold text-sm">Material PDF Loaded ({materialPageCount} pages)</p>
                                    <p className="text-white/40 text-xs">Click to replace</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <div className="text-3xl">📤</div>
                                    <p className="text-white/70 font-medium text-sm">Upload study material PDF</p>
                                    <p className="text-white/40 text-xs">Or paste text below</p>
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

                        {/* Question Count */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-white/70">Number of Questions</label>
                                <span className="text-lg font-bold text-primary-300">{questionCount}</span>
                            </div>
                            <input
                                type="range"
                                min={3}
                                max={25}
                                value={questionCount}
                                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                className="w-full accent-primary-500"
                            />
                            <div className="flex justify-between text-xs text-white/30">
                                <span>3</span>
                                <span>25</span>
                            </div>
                        </div>

                        {/* Total Marks */}
                        <div className="space-y-2">
                            <label className="text-sm text-white/70">Total Marks</label>
                            <input
                                type="number"
                                min={questionCount}
                                max={100}
                                value={totalMarks}
                                onChange={(e) => setTotalMarks(parseInt(e.target.value) || questionCount)}
                                className="text-input text-sm !w-32"
                            />
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

                    {generateError && (
                        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                            ⚠️ {generateError}
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerateExam}
                        disabled={isGenerating || materialText.trim().length < 20}
                        className="btn-primary w-full !py-4 text-lg disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <><span className="animate-spin">🤖</span> AI is generating your exam...</>
                        ) : (
                            <>🚀 Generate {questionCount}-Question Exam</>
                        )}
                    </button>
                </div>
            </section>
        );
    }

    return null;
}
