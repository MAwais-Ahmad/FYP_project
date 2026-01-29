import { Scenario } from '../../types/quiz.types';

interface ScenarioCardProps {
    scenario: Scenario;
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
    return (
        <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">{scenario.title}</h2>
            </div>

            <div className="space-y-3 text-white/80">
                <p>{scenario.description}</p>

                {scenario.budget && (
                    <p>
                        <strong className="text-white">Budget:</strong> {scenario.budget}
                    </p>
                )}

                {scenario.stakeholders && scenario.stakeholders.length > 0 && (
                    <div>
                        <p className="font-medium text-white mb-2">
                            {scenario.stakeholders.length} stakeholders want funding:
                        </p>
                        <ul className="space-y-2">
                            {scenario.stakeholders.map((s, idx) => (
                                <li key={idx} className="flex items-center gap-2 pl-4 border-l-2 border-primary-400/50">
                                    <span className="font-medium text-primary-300">{s.name}:</span>
                                    <span className="text-accent-300">{s.request}</span>
                                    <span className="text-white/60">({s.purpose})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {scenario.constraint && (
                    <p className="p-3 rounded-lg bg-amber-500/20 border border-amber-400/30 text-amber-200">
                        ⚠️ {scenario.constraint}
                    </p>
                )}

                {scenario.urgency && (
                    <p className="text-white/70">⏰ {scenario.urgency}</p>
                )}
            </div>
        </div>
    );
}
