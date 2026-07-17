import { StudentRecord } from '../../utils/storage';
import { LEARNER_CATEGORIES } from '../../utils/classifyLearner';

interface RecordBlockProps {
    record: StudentRecord;
    onClick: () => void;
    showName?: boolean;
    status?: 'completed' | 'in-progress';
}

function fmtDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

export function RecordBlock({ record, onClick, showName = false, status }: RecordBlockProps) {
    const category = LEARNER_CATEGORIES[record.primaryCategory];
    const perfPct = Math.round(record.performanceScore * 100);
    const accPct = Math.round(record.accuracyScore * 100);
    const avgTime = record.avgResponseTime?.toFixed(1) || '—';

    return (
        <button
            onClick={onClick}
            className="w-full glass-card p-4 flex items-center gap-4 hover:bg-white/10 transition-all duration-200 cursor-pointer group text-left"
        >
            {/* Category Icon */}
            <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform`}
            >
                {record.primaryEmoji || '🧠'}
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {showName && (
                        <span className="font-semibold text-white truncate">
                            {record.name}
                        </span>
                    )}
                    <span className={`font-semibold ${showName ? 'text-white/60 text-sm' : 'text-white'}`}>
                        {record.primaryName || category?.name || 'Unknown'}
                    </span>
                    {status === 'in-progress' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 animate-pulse">
                            In Progress
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                    <span>{fmtDate(record.date)}</span>
                    <span>•</span>
                    <span>{record.scenariosCompleted} scenario{record.scenariosCompleted !== 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span className="capitalize">{record.decisionStyle}</span>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="hidden sm:flex items-center gap-4 text-sm shrink-0">
                <div className="text-center">
                    <div className="font-bold text-white">{perfPct}%</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Perf</div>
                </div>
                <div className="text-center">
                    <div className="font-bold text-white">{accPct}%</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Acc</div>
                </div>
                <div className="text-center">
                    <div className="font-bold text-white">{avgTime}s</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">Avg</div>
                </div>
            </div>

            {/* Chevron */}
            <svg
                className="w-5 h-5 text-white/20 group-hover:text-white/50 transition-colors shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
            >
                <path d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
}
