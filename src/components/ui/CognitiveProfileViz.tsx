// Shared visuals for cognitive-profile breakdowns — used by both the live
// post-assessment ResultsScreen and the saved-record RecordDetail view so the
// two present the same analysis.

export function RadarChart({ axes }: { axes: { label: string; value: number }[] }) {
    const size = 230;
    const c = size / 2;
    const r = 78;
    const n = axes.length;
    const angleFor = (i: number) => (-90 + (i * 360) / n) * (Math.PI / 180);
    const pt = (i: number, radius: number) => ({
        x: c + radius * Math.cos(angleFor(i)),
        y: c + radius * Math.sin(angleFor(i)),
    });

    const valuePoints = axes
        .map((a, i) => {
            const p = pt(i, r * Math.max(0.05, Math.min(1, a.value)));
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
        })
        .join(' ');

    const rings = [0.25, 0.5, 0.75, 1];

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[260px] mx-auto">
            {/* grid rings */}
            {rings.map((ring, ri) => (
                <polygon
                    key={ri}
                    points={axes
                        .map((_, i) => {
                            const p = pt(i, r * ring);
                            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                        })
                        .join(' ')}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                />
            ))}
            {/* axes */}
            {axes.map((_, i) => {
                const p = pt(i, r);
                return <line key={i} x1={c} y1={c} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />;
            })}
            {/* value polygon */}
            <polygon points={valuePoints} fill="rgba(139,92,246,0.35)" stroke="rgb(167,139,250)" strokeWidth="2" />
            {/* labels */}
            {axes.map((a, i) => {
                const p = pt(i, r + 16);
                return (
                    <text
                        key={i}
                        x={p.x}
                        y={p.y}
                        fontSize="9"
                        fill="rgba(255,255,255,0.6)"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {a.label}
                    </text>
                );
            })}
        </svg>
    );
}

export function StatCard({ icon, value, label, sub }: { icon: string; value: string; label: string; sub: string }) {
    return (
        <div className="glass-card p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <div className="text-2xl font-bold leading-none">{value}</div>
                <div className="text-sm font-medium text-white/80 mt-1">{label}</div>
                <div className="text-xs text-white/40">{sub}</div>
            </div>
        </div>
    );
}
