// ─── SVG FIGURE HELPERS ──────────────────────────────────────────────────────
// Shared drawing primitives for visual/diagram questions. Everything is drawn
// with currentColor so the figures adapt to the dark theme.

export const S = 'stroke="currentColor" stroke-width="2" fill="none"';

/**
 * Stable identity key for a question: hashes prompt text AND diagram, so two
 * questions with the same wording but different diagrams count as different.
 */
export function questionKey(question: string, svg?: string): string {
    const s = question + '|' + (svg || '');
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    }
    return String(h >>> 0);
}

/** A compass rose used by direction-sense questions. */
export const COMPASS_SVG = `
<svg viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" style="max-width:220px">
  <line x1="110" y1="30" x2="110" y2="190" ${S}/>
  <line x1="30" y1="110" x2="190" y2="110" ${S}/>
  <polygon points="110,18 104,32 116,32" fill="currentColor"/>
  <polygon points="110,202 104,188 116,188" fill="currentColor"/>
  <polygon points="18,110 32,104 32,116" fill="currentColor"/>
  <polygon points="202,110 188,104 188,116" fill="currentColor"/>
  <text x="110" y="14" font-size="14" fill="currentColor" text-anchor="middle">N</text>
  <text x="110" y="216" font-size="14" fill="currentColor" text-anchor="middle">S</text>
  <text x="10" y="114" font-size="14" fill="currentColor" text-anchor="middle">W</text>
  <text x="210" y="114" font-size="14" fill="currentColor" text-anchor="middle">E</text>
</svg>`;

/** Renders a "problem figures" row (last box = ?) and an "answer figures" row. */
export function figureSeriesSvg(problem: string[], answers: string[]): string {
    const box = (inner: string, x: number, y: number) =>
        `<g transform="translate(${x},${y})"><rect x="0" y="0" width="90" height="90" ${S} opacity="0.5"/>${inner}</g>`;
    const problemRow = problem
        .map((fig, i) => box(fig, 10 + i * 105, 24))
        .join('');
    const answerRow = answers
        .map(
            (fig, i) =>
                box(fig, 10 + i * 105, 158) +
                `<text x="${55 + i * 105}" y="266" font-size="14" fill="currentColor" text-anchor="middle">${String.fromCharCode(65 + i)}</text>`
        )
        .join('');
    const width = 20 + Math.max(problem.length, answers.length) * 105;
    if (problem.length === 0) {
        // Single row of labelled figures (e.g. odd-one-out questions)
        return `
<svg viewBox="0 132 ${width} 144" xmlns="http://www.w3.org/2000/svg" style="max-width:${width}px">
  ${answerRow}
</svg>`;
    }
    return `
<svg viewBox="0 0 ${width} 276" xmlns="http://www.w3.org/2000/svg" style="max-width:${width}px">
  <text x="10" y="16" font-size="12" fill="currentColor" opacity="0.7">PROBLEM FIGURES</text>
  ${problemRow}
  <text x="10" y="150" font-size="12" fill="currentColor" opacity="0.7">ANSWER FIGURES</text>
  ${answerRow}
</svg>`;
}

// Small figure snippets (drawn inside a 90×90 box)
export const FIG = {
    qmark: `<text x="45" y="60" font-size="42" fill="currentColor" text-anchor="middle">?</text>`,
    circle: `<circle cx="45" cy="45" r="27" ${S}/>`,
    circleV: `<circle cx="45" cy="45" r="27" ${S}/><line x1="45" y1="18" x2="45" y2="72" ${S}/>`,
    square: `<rect x="18" y="18" width="54" height="54" ${S}/>`,
    squareV: `<rect x="18" y="18" width="54" height="54" ${S}/><line x1="45" y1="18" x2="45" y2="72" ${S}/>`,
    squareH: `<rect x="18" y="18" width="54" height="54" ${S}/><line x1="18" y1="45" x2="72" y2="45" ${S}/>`,
    squareD: `<rect x="18" y="18" width="54" height="54" ${S}/><line x1="18" y1="18" x2="72" y2="72" ${S}/>`,
    dots: (n: number) => {
        const pos = [
            [45, 45], [30, 30], [60, 60], [60, 30], [30, 60], [45, 15],
        ];
        return Array.from({ length: n })
            .map((_, i) => `<circle cx="${pos[i][0]}" cy="${pos[i][1]}" r="6" fill="currentColor"/>`)
            .join('');
    },
    arrow: (angle: number) =>
        `<g transform="rotate(${angle},45,45)"><line x1="15" y1="45" x2="66" y2="45" ${S}/><polygon points="75,45 60,37 60,53" fill="currentColor"/></g>`,
    triInCircle: `<circle cx="45" cy="45" r="30" ${S}/><polygon points="45,22 65,60 25,60" ${S}/>`,
    circleInTri: `<polygon points="45,12 78,72 12,72" ${S}/><circle cx="45" cy="52" r="15" ${S}/>`,
    shadedQuads: (n: number) => {
        const quads = [
            `<rect x="18" y="18" width="27" height="27" fill="currentColor"/>`,
            `<rect x="45" y="18" width="27" height="27" fill="currentColor"/>`,
            `<rect x="45" y="45" width="27" height="27" fill="currentColor"/>`,
            `<rect x="18" y="45" width="27" height="27" fill="currentColor"/>`,
        ];
        return `<rect x="18" y="18" width="54" height="54" ${S}/><line x1="45" y1="18" x2="45" y2="72" ${S}/><line x1="18" y1="45" x2="72" y2="45" ${S}/>${quads.slice(0, n).join('')}`;
    },
    triangle: `<polygon points="45,16 74,72 16,72" ${S}/>`,
    rect: `<rect x="12" y="27" width="66" height="36" ${S}/>`,
    rhombus: `<polygon points="45,14 74,45 45,76 16,45" ${S}/>`,
    circleR: (r: number) => `<circle cx="45" cy="45" r="${r}" ${S}/>`,
    dotCorner: (pos: 'TL' | 'TR' | 'BR' | 'BL' | 'C') => {
        const p = { TL: [25, 25], TR: [65, 25], BR: [65, 65], BL: [25, 65], C: [45, 45] }[pos];
        return `<rect x="15" y="15" width="60" height="60" ${S}/><circle cx="${p[0]}" cy="${p[1]}" r="6" fill="currentColor"/>`;
    },
    halfDisc: (angle: number) =>
        `<g transform="rotate(${angle},45,45)"><path d="M 17 45 A 28 28 0 0 1 73 45 Z" fill="currentColor"/><circle cx="45" cy="45" r="28" ${S}/></g>`,
    poly: (n: number) => {
        const pts = Array.from({ length: n }, (_, i) => {
            const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
            return `${(45 + 28 * Math.cos(a)).toFixed(1)},${(45 + 28 * Math.sin(a)).toFixed(1)}`;
        }).join(' ');
        return `<polygon points="${pts}" ${S}/>`;
    },
    manyRects: (n: number) =>
        Array.from({ length: n })
            .map((_, i) => `<rect x="${16 + (i % 3) * 21}" y="${16 + Math.floor(i / 3) * 21}" width="13" height="13" ${S}/>`)
            .join(''),
    lineAngle: (a: number) =>
        `<g transform="rotate(${a},45,45)"><line x1="45" y1="15" x2="45" y2="75" ${S}/></g>`,
};
