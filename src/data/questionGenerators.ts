// ─── REAL-TIME QUESTION GENERATORS ───────────────────────────────────────────
// Procedural generators that build fresh aptitude questions every time a test
// starts: random numbers, names, words and diagram patterns with the correct
// answer computed programmatically. Combined with the curated bank this gives
// effectively unlimited variation — no two tests need ever look the same.

import type { BankCategory, BankQuestion } from './questionBank';
import { COMPASS_SVG, FIG, figureSeriesSvg, questionKey } from './svgFigures';

// ── small random helpers ─────────────────────────────────────────────────────

const ri = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** Builds MCQ options from a correct value + distractors; returns the letter. */
function mcqOf(correct: string | number, distractors: (string | number)[]): { options: string[]; correctAnswer: string } {
    const uniq: string[] = [];
    for (const d of distractors.map(String)) {
        if (d !== String(correct) && !uniq.includes(d)) uniq.push(d);
        if (uniq.length === 3) break;
    }
    const options = shuffle([String(correct), ...uniq]);
    return { options, correctAnswer: String.fromCharCode(65 + options.indexOf(String(correct))) };
}

/** Numeric distractors near the correct answer. */
function nearNumbers(correct: number, spread: number): number[] {
    const out = new Set<number>();
    while (out.size < 5) {
        const delta = ri(1, spread) * (Math.random() < 0.5 ? -1 : 1);
        const v = correct + delta;
        if (v !== correct && v > 0) out.add(v);
    }
    return [...out];
}

const MALE_NAMES = ['Ahmed', 'Bilal', 'Usman', 'Hamza', 'Zain', 'Imran', 'Kamran', 'Fahad', 'Salman', 'Danish', 'Asad', 'Tariq'];
const FEMALE_NAMES = ['Ayesha', 'Sana', 'Hina', 'Zara', 'Mona', 'Fatima', 'Sadia', 'Mahnoor', 'Rabia', 'Iqra'];
const ALL_NAMES = [...MALE_NAMES, ...FEMALE_NAMES];

// ─── MATH GENERATORS ─────────────────────────────────────────────────────────

function genSpeed(): BankQuestion {
    const variant = ri(0, 2);
    if (variant === 0) {
        // distance = speed × fractional time
        const s = pick([44, 48, 56, 64, 72, 84]);
        const t = pick([1.5, 2.5, 3.5]);
        const d = s * t;
        return { category: 'math', type: 'mcq', question: `A bus travels at ${s} km/h. How far will it go in ${t} hours?`, ...mcqOf(`${d} km`, nearNumbers(d, 16).map(n => `${n} km`)) };
    }
    if (variant === 1) {
        // speed from distance + time-with-minutes
        const s = pick([8, 12, 16, 24, 36, 48]);
        const times: Record<string, number> = { '1 hour 15 minutes': 1.25, '1 hour 30 minutes': 1.5, '2 hours 30 minutes': 2.5 };
        const tLabel = pick(Object.keys(times));
        const d = s * times[tLabel];
        return { category: 'math', type: 'mcq', question: `A cyclist covers ${d} km in ${tLabel}. What is his speed in km/h?`, ...mcqOf(`${s} km/h`, nearNumbers(s, 6).map(n => `${n} km/h`)) };
    }
    // time from distance + speed (answer x.5 hours)
    const s = pick([40, 60, 80]);
    const t = pick([1.5, 2.5, 3.5]);
    const d = s * t;
    return { category: 'math', type: 'text', question: `A train runs at ${s} km/h. How much time will it take to cover ${d} km? (answer in hours)`, correctAnswer: String(t), accept: [`${t} hours`, `${t} hrs`, `${t}h`, `${t * 60} minutes`] };
}

function genUnitary(): BankQuestion {
    const item = pick(['mangoes', 'oranges', 'bananas', 'cupcakes', 'samosas', 'apples']);
    const per = ri(6, 15);
    const dozenCost = per * 12;
    const n = pick([9, 15, 18, 21, 27]);
    const cost = per * n;
    if (Math.random() < 0.5) {
        return { category: 'math', type: 'mcq', question: `One dozen ${item} cost Rs.${dozenCost}. What will be the cost of ${n} ${item}?`, ...mcqOf(`Rs.${cost}`, nearNumbers(cost, Math.max(6, per)).map(v => `Rs.${v}`)) };
    }
    return { category: 'math', type: 'text', question: `One dozen ${item} cost Rs.${dozenCost}. What will be the cost of ${n} ${item}? (answer in Rs.)`, correctAnswer: String(cost), accept: [`rs.${cost}`, `rs ${cost}`, `${cost} rupees`] };
}

function genPercent(): BankQuestion {
    const variant = ri(0, 2);
    if (variant === 0) {
        const total = pick([240, 360, 480, 600, 750]);
        const pctBoys = pick([55, 60, 65, 70, 75]);
        const girls = total - (total * pctBoys) / 100;
        return { category: 'math', type: 'mcq', question: `A school has ${total} students and ${pctBoys}% are boys. How many girls are there?`, ...mcqOf(girls, nearNumbers(girls, 30)) };
    }
    if (variant === 1) {
        const price = pick([640, 960, 1200, 1600, 2400]);
        const disc = pick([15, 20, 25, 35]);
        const final = price - (price * disc) / 100;
        return { category: 'math', type: 'mcq', question: `A jacket costs Rs.${price}. After a ${disc}% discount, what is its price?`, ...mcqOf(`Rs.${final}`, nearNumbers(final, 90).map(v => `Rs.${v}`)) };
    }
    // marks → percentage (both chosen so the percentage is always clean)
    const outOf = pick([60, 80]);
    const pct = pick([40, 45, 55, 60, 65, 70, 75, 85]);
    const scored = (outOf * pct) / 100;
    return { category: 'math', type: 'text', question: `Out of ${outOf} marks, a student scored ${scored}. What percentage did he score?`, correctAnswer: String(pct), accept: [`${pct}%`, `${pct} percent`] };
}

function genAges(): BankQuestion {
    const variant = ri(0, 2);
    if (variant === 0) {
        // parent k× child now; in how many years m×
        const [k, m] = pick([[3, 2], [4, 2], [5, 3]]);
        const s = pick([5, 6, 7, 8, 9, 10]);
        const x = (s * (k - m)) / (m - 1);
        const parent = pick(['father', 'mother']);
        const pron = parent === 'father' ? 'his' : 'her';
        return { category: 'math', type: 'mcq', question: `A ${parent} is ${k} times as old as ${pron} child. If the child is ${s} years old today, in how many years will the ${parent} be ${m === 2 ? 'twice' : 'three times'} the child's age?`, ...mcqOf(`${x} years`, nearNumbers(x, 5).map(v => `${v} years`)) };
    }
    if (variant === 1) {
        const a = pick(FEMALE_NAMES);
        const b = pick(FEMALE_NAMES.filter(n => n !== a));
        const diff = ri(3, 7);
        const now = ri(6, 14);
        const later = ri(4, 9);
        return { category: 'math', type: 'text', question: `${a} is ${diff} years older than ${b}. If ${b} is ${now} years old today, how old will ${a} be after ${later} years?`, correctAnswer: String(now + diff + later), accept: [`${now + diff + later} years`] };
    }
    const sum = pick([30, 36, 40, 44, 50]);
    const d = pick([4, 6, 8, 10]);
    const larger = (sum + d) / 2;
    return { category: 'math', type: 'mcq', question: `The sum of the ages of two brothers is ${sum} years and their age difference is ${d} years. How old is the elder brother?`, ...mcqOf(larger, nearNumbers(larger, 6)) };
}

function genWorkRate(): BankQuestion {
    const n = pick([4, 6, 8, 12]);
    const d = pick([6, 9, 12, 15]);
    const m = pick([2, 3].map(f => n / f).filter(Number.isInteger));
    const days = (n * d) / m;
    return { category: 'math', type: 'mcq', question: `${n} workers can paint a house in ${d} days. Working at the same rate, how many days will ${m} workers take?`, ...mcqOf(`${days} days`, nearNumbers(days, 8).map(v => `${v} days`)) };
}

function genProfit(): BankQuestion {
    const cost = pick([400, 500, 800, 1200, 1500]);
    const p = pick([10, 15, 20, 25, 30]);
    const sell = cost + (cost * p) / 100;
    return { category: 'math', type: 'mcq', question: `A shopkeeper buys a bag for Rs.${cost} and sells it for Rs.${sell}. What is his profit percentage?`, ...mcqOf(`${p}%`, nearNumbers(p, 8).map(v => `${v}%`)) };
}

function genFraction(): BankQuestion {
    const pairs: [number, number, number, number][] = [[1, 2, 3, 4], [2, 3, 3, 4], [1, 4, 2, 3]];
    const [a, b, c, d] = pick(pairs);
    const base = pick([96, 120, 240, 360]);
    const ans = (base * a * c) / (b * d);
    if (!Number.isInteger(ans)) {
        return { category: 'math', type: 'mcq', question: 'What is 1/2 of 3/4 of 120?', ...mcqOf(45, nearNumbers(45, 12)) };
    }
    return { category: 'math', type: 'mcq', question: `What is ${a}/${b} of ${c}/${d} of ${base}?`, ...mcqOf(ans, nearNumbers(ans, 14)) };
}

const MATH_GENERATORS = [genSpeed, genUnitary, genPercent, genAges, genWorkRate, genProfit, genFraction];

// ─── LOGICAL GENERATORS ──────────────────────────────────────────────────────

function genNumberSeries(): BankQuestion {
    const variant = ri(0, 3);
    let terms: number[] = [];
    if (variant === 0) {
        // increasing differences: +d, +d+e, +d+2e ...
        const start = ri(2, 12); const d = ri(2, 5); const e = ri(1, 4);
        terms = [start];
        for (let i = 0; i < 5; i++) terms.push(terms[i] + d + i * e);
    } else if (variant === 1) {
        // ×2 (+c) chains
        const start = ri(2, 6); const c = pick([0, 1, 2]);
        terms = [start];
        for (let i = 0; i < 5; i++) terms.push(terms[i] * 2 + c);
    } else if (variant === 2) {
        // squares ± k
        const k = ri(-3, 3);
        const s = ri(1, 3);
        terms = Array.from({ length: 6 }, (_, i) => (i + s) * (i + s) + k);
    } else {
        // Fibonacci-like
        let a = ri(1, 4); let b = ri(2, 6);
        terms = [a, b];
        for (let i = 0; i < 4; i++) { const n = a + b; terms.push(n); a = b; b = n; }
    }
    const answer = terms[5];
    const shown = terms.slice(0, 5).join(', ');
    return { category: 'logical', type: 'mcq', question: `Complete the series: ${shown}, ...?`, ...mcqOf(answer, nearNumbers(answer, Math.max(3, Math.round(answer * 0.15)))) };
}

function genLetterSeries(): BankQuestion {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const start = ri(0, 8);
    const step0 = ri(2, 3);
    const grow = pick([0, 1]);
    const idx = [start];
    for (let i = 0; i < 4; i++) idx.push(idx[i] + step0 + i * grow);
    if (idx[4] > 25) return genLetterSeries();
    const answer = A[idx[4]];
    const shown = idx.slice(0, 4).map(i => A[i]).join(', ');
    const distractors = shuffle([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(c => c !== answer)).slice(0, 3);
    return { category: 'logical', type: 'mcq', question: `Which letter comes next in the series? ${shown}, ...`, ...mcqOf(answer, distractors) };
}

function genCoding(): BankQuestion {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const encode = (w: string, k: number) => [...w].map(ch => A[(A.indexOf(ch) + k + 26) % 26]).join('');
    const words = ['CAT', 'DOG', 'SUN', 'PEN', 'BAT', 'CUP', 'MAP', 'JAR'];
    const w1 = pick(words);
    const w2 = pick(words.filter(w => w !== w1));
    const k = pick([1, 2, 3, 4]);
    const answer = encode(w2, k);
    const distractors = [encode(w2, k + 1), encode(w2, k - 1), encode(w2, -k)];
    return { category: 'logical', type: 'mcq', question: `In a certain code, ${w1} is written as ${encode(w1, k)}. How is ${w2} written in that code?`, ...mcqOf(answer, distractors) };
}

function genOrdering(): BankQuestion {
    const names = shuffle(ALL_NAMES).slice(0, 4);
    // names[0] > names[1] > names[2] > names[3] by height
    const attr = pick([
        { rel: 'taller than', ask: ['tallest', 'shortest'] },
        { rel: 'older than', ask: ['oldest', 'youngest'] },
        { rel: 'faster than', ask: ['fastest', 'slowest'] },
    ]);
    const clues = shuffle([
        `${names[0]} is ${attr.rel} ${names[1]}.`,
        `${names[1]} is ${attr.rel} ${names[2]}.`,
        `${names[2]} is ${attr.rel} ${names[3]}.`,
    ]).join(' ');
    const askTop = Math.random() < 0.5;
    const answer = askTop ? names[0] : names[3];
    return { category: 'logical', type: 'mcq', question: `${clues} Who is the ${askTop ? attr.ask[0] : attr.ask[1]}?`, ...mcqOf(answer, names.filter(n => n !== answer)) };
}

function genTurnDirection(): BankQuestion {
    const dirs = ['North', 'East', 'South', 'West'];
    const start = ri(0, 3);
    const name = pick(ALL_NAMES);
    const turnCount = ri(2, 3);
    const turns: string[] = [];
    let cur = start;
    for (let i = 0; i < turnCount; i++) {
        const [label, delta] = pick<[string, number]>([['left', -1], ['right', 1], ['completely around (180°)', 2]]);
        turns.push(label);
        cur = (cur + delta + 4) % 4;
    }
    const answer = dirs[cur];
    const turnText = turns.map((t, i) => `${i === 0 ? 'turns' : 'then turns'} ${t}`).join(', ');
    return { category: 'logical', type: 'mcq', question: `${name} is facing ${dirs[start]}. He ${turnText}. Which direction is he facing now?`, ...mcqOf(answer, dirs.filter(x => x !== answer)) };
}

function genRowPosition(): BankQuestion {
    const name = pick(ALL_NAMES);
    const p = ri(4, 12);
    const q = ri(4, 12);
    const total = p + q - 1;
    return { category: 'logical', type: 'mcq', question: `In a row of students, ${name} is ${p}th from the left and ${q}th from the right. How many students are in the row?`, ...mcqOf(total, [total + 1, total - 1, total + 2]) };
}

function genBloodRelation(): BankQuestion {
    const m1 = pick(MALE_NAMES); const m2 = pick(MALE_NAMES.filter(n => n !== m1));
    const f1 = pick(FEMALE_NAMES);
    const templates: { q: string; answer: string; distractors: string[] }[] = [
        { q: `${m1} is the brother of ${f1}. ${f1} is the mother of ${m2}. What is ${m1} to ${m2}?`, answer: 'Uncle', distractors: ['Father', 'Cousin', 'Grandfather'] },
        { q: `${f1} is the sister of ${m1}. ${m1} is the father of ${m2}. What is ${f1} to ${m2}?`, answer: 'Aunt', distractors: ['Mother', 'Sister', 'Grandmother'] },
        { q: `${m1} is the father of ${m2}. ${f1} is the mother of ${m1}. What is ${f1} to ${m2}?`, answer: 'Grandmother', distractors: ['Mother', 'Aunt', 'Sister'] },
        { q: `${m2} is the son of ${f1}. ${f1} is the sister of ${m1}. What is ${m2} to ${m1}?`, answer: 'Nephew', distractors: ['Son', 'Cousin', 'Brother'] },
    ];
    const t = pick(templates);
    return { category: 'logical', type: 'mcq', question: t.q, ...mcqOf(t.answer, t.distractors) };
}

const LOGICAL_GENERATORS = [genNumberSeries, genLetterSeries, genCoding, genOrdering, genTurnDirection, genRowPosition, genBloodRelation];

// ─── VERBAL GENERATORS ───────────────────────────────────────────────────────

const JUMBLE_WORDS = [
    'PICTURE', 'KITCHEN', 'TEACHER', 'LIBRARY', 'MORNING', 'STATION', 'COUNTRY', 'SCIENCE',
    'HISTORY', 'BALANCE', 'JOURNEY', 'FREEDOM', 'VILLAGE', 'STUDENT', 'HOSPITAL', 'SANDWICH',
    'MOUNTAIN', 'ELEPHANT', 'TRIANGLE', 'KEYBOARD', 'LANGUAGE', 'QUESTION', 'DISCOVER', 'BUILDING',
    'CHILDREN', 'SHOULDER', 'DAUGHTER', 'EXERCISE', 'PAINTING', 'DISTANCE', 'FESTIVAL', 'UMBRELLA',
    'AIRPORT', 'BROTHER', 'CHIMNEY', 'DOLPHIN', 'EVENING', 'FACTORY', 'GRAMMAR', 'HARVEST',
    'JOURNAL', 'LANTERN', 'MACHINE', 'NETWORK', 'ORCHARD', 'PLASTIC', 'QUALITY', 'RAINBOW',
];

function genJumble(): BankQuestion {
    const word = pick(JUMBLE_WORDS);
    let letters = shuffle([...word]);
    while (letters.join('') === word) letters = shuffle([...word]);
    return { category: 'verbal', type: 'text', question: `Re-arrange the following jumbled letters to form a sensible English word and type it: ${letters.join(' ')}`, correctAnswer: word.toLowerCase() };
}

const ANALOGY_SETS: [string, string][][] = [
    // creature : home
    [['Bird', 'Nest'], ['Bee', 'Hive'], ['Dog', 'Kennel'], ['Horse', 'Stable'], ['Lion', 'Den'], ['Spider', 'Web']],
    // worker : workplace
    [['Doctor', 'Hospital'], ['Teacher', 'School'], ['Chef', 'Kitchen'], ['Farmer', 'Field'], ['Pilot', 'Cockpit'], ['Judge', 'Court']],
    // young : animal
    [['Puppy', 'Dog'], ['Kitten', 'Cat'], ['Cub', 'Lion'], ['Calf', 'Cow'], ['Chick', 'Hen'], ['Foal', 'Horse']],
    // tool : user
    [['Pen', 'Writer'], ['Brush', 'Painter'], ['Hammer', 'Carpenter'], ['Scalpel', 'Surgeon'], ['Needle', 'Tailor'], ['Plough', 'Farmer']],
    // part : whole
    [['Wheel', 'Car'], ['Page', 'Book'], ['Branch', 'Tree'], ['Petal', 'Flower'], ['Wing', 'Bird'], ['Blade', 'Fan']],
    // product : source
    [['Milk', 'Cow'], ['Egg', 'Hen'], ['Honey', 'Bee'], ['Wool', 'Sheep'], ['Silk', 'Silkworm'], ['Pearl', 'Oyster']],
];

function genAnalogy(): BankQuestion {
    const set = pick(ANALOGY_SETS);
    const [p1, p2] = shuffle(set).slice(0, 2);
    const distractors = set.filter(p => p !== p1 && p !== p2).map(p => p[1]).slice(0, 3);
    return { category: 'verbal', type: 'mcq', question: `${p1[0]} is to ${p1[1]} as ${p2[0]} is to ______.`, ...mcqOf(p2[1], distractors) };
}

const ODD_SETS: Record<string, string[]> = {
    fruits: ['Apple', 'Mango', 'Banana', 'Grape', 'Peach', 'Orange'],
    vegetables: ['Carrot', 'Potato', 'Onion', 'Spinach', 'Cabbage'],
    'land vehicles': ['Car', 'Bus', 'Truck', 'Train', 'Motorcycle'],
    birds: ['Sparrow', 'Eagle', 'Parrot', 'Pigeon', 'Crow'],
    insects: ['Ant', 'Bee', 'Butterfly', 'Mosquito', 'Beetle'],
    colors: ['Red', 'Blue', 'Green', 'Yellow', 'Purple'],
    professions: ['Doctor', 'Engineer', 'Lawyer', 'Teacher', 'Pilot'],
    sports: ['Cricket', 'Hockey', 'Football', 'Tennis', 'Badminton'],
    instruments: ['Guitar', 'Piano', 'Flute', 'Violin', 'Drum'],
    metals: ['Iron', 'Copper', 'Silver', 'Gold', 'Zinc'],
    planets: ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'],
    furniture: ['Chair', 'Table', 'Sofa', 'Cupboard', 'Bed'],
    stationery: ['Pen', 'Pencil', 'Eraser', 'Ruler', 'Marker'],
    'water bodies': ['River', 'Lake', 'Ocean', 'Stream', 'Pond'],
};

function genOddOut(): BankQuestion {
    const cats = Object.keys(ODD_SETS);
    const mainCat = pick(cats);
    const oddCat = pick(cats.filter(c => c !== mainCat));
    const three = shuffle(ODD_SETS[mainCat]).slice(0, 3);
    const odd = pick(ODD_SETS[oddCat]);
    const options = shuffle([...three, odd]);
    return {
        category: 'verbal', type: 'mcq',
        question: 'Which word does NOT belong with the others?',
        options,
        correctAnswer: String.fromCharCode(65 + options.indexOf(odd)),
    };
}

const ANTONYMS: [string, string][] = [
    ['Brave', 'Cowardly'], ['Generous', 'Miserly'], ['Ancient', 'Modern'], ['Victory', 'Defeat'],
    ['Expand', 'Contract'], ['Scarce', 'Abundant'], ['Transparent', 'Opaque'], ['Innocent', 'Guilty'],
    ['Permanent', 'Temporary'], ['Artificial', 'Natural'], ['Humble', 'Arrogant'], ['Rigid', 'Flexible'],
    ['Optimist', 'Pessimist'], ['Maximum', 'Minimum'], ['Courage', 'Fear'], ['Unity', 'Division'],
    ['Genuine', 'Fake'], ['Cautious', 'Reckless'], ['Punish', 'Reward'], ['Ascend', 'Descend'],
];

function genAntonym(): BankQuestion {
    const [pair, ...rest] = shuffle(ANTONYMS);
    const distractors = rest.slice(0, 3).map(p => p[1]);
    return { category: 'verbal', type: 'mcq', question: `Choose the word most OPPOSITE in meaning to "${pair[0]}":`, ...mcqOf(pair[1], distractors) };
}

const VERBAL_GENERATORS = [genJumble, genAnalogy, genOddOut, genAntonym];

// ─── VISUAL GENERATORS ───────────────────────────────────────────────────────

/** Builds a figure-series MCQ; the correct figure is placed at a random slot. */
function figMcq(problem: string[], correctFig: string, distractorFigs: string[], question: string): BankQuestion {
    const figs = shuffle([correctFig, ...distractorFigs.slice(0, 3)]);
    return {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(problem, figs),
        question,
        options: figs.map((_, i) => `Figure ${String.fromCharCode(65 + i)}`),
        correctAnswer: String.fromCharCode(65 + figs.indexOf(correctFig)),
    };
}

function genRotationSeries(): BankQuestion {
    const kind = pick(['arrow', 'half', 'line'] as const);
    const f = kind === 'arrow' ? FIG.arrow : kind === 'half' ? FIG.halfDisc : FIG.lineAngle;
    const step = pick(kind === 'line' ? [45] : [45, 90]);
    const start = pick([0, 45, 90, 135, 180]);
    const mod = kind === 'line' ? 180 : 360;
    const angles = [0, 1, 2, 3].map(i => (start + i * step) % mod);
    const wrongs = [(angles[3] + step) % mod, (angles[3] + 2 * step) % mod, (angles[3] - 2 * step + mod) % mod]
        .filter((a, i, arr) => a !== angles[3] && arr.indexOf(a) === i);
    while (wrongs.length < 3) wrongs.push((angles[3] + (wrongs.length + 1) * 30) % mod);
    return figMcq(
        [f(angles[0]), f(angles[1]), f(angles[2]), FIG.qmark],
        f(angles[3]),
        wrongs.map(a => f(a)),
        `The figure rotates by the same amount in each step. Which answer figure comes next?`
    );
}

function genDotWalk(): BankQuestion {
    const corners: ('TL' | 'TR' | 'BR' | 'BL')[] = ['TL', 'TR', 'BR', 'BL'];
    const cw = Math.random() < 0.5;
    const start = ri(0, 3);
    const seq = [0, 1, 2, 3].map(i => corners[(start + (cw ? i : -i) + 8) % 4]);
    const others = corners.filter(c => c !== seq[3]);
    return figMcq(
        [FIG.dotCorner(seq[0]), FIG.dotCorner(seq[1]), FIG.dotCorner(seq[2]), FIG.qmark],
        FIG.dotCorner(seq[3]),
        [...others.map(c => FIG.dotCorner(c)), FIG.dotCorner('C')],
        `The dot moves ${cw ? 'clockwise' : 'anti-clockwise'} around the corners. Which answer figure comes next?`
    );
}

function genCountSeries(): BankQuestion {
    if (Math.random() < 0.5) {
        const start = ri(1, 2);
        const seq = [start, start + 1, start + 2, start + 3];
        return figMcq(
            [FIG.dots(seq[0]), FIG.dots(seq[1]), FIG.dots(seq[2]), FIG.qmark],
            FIG.dots(seq[3]),
            [FIG.dots(seq[3] + 1), FIG.dots(seq[3] - 2), FIG.dots(Math.max(1, seq[3] - 3))],
            'The number of dots follows a pattern. Which answer figure comes next?'
        );
    }
    const start = ri(1, 3);
    const step = 2;
    const seq = [start, start + step, start + 2 * step, start + 3 * step];
    return figMcq(
        [FIG.manyRects(seq[0]), FIG.manyRects(seq[1]), FIG.manyRects(seq[2]), FIG.qmark],
        FIG.manyRects(seq[3]),
        [FIG.manyRects(seq[3] - 1), FIG.manyRects(seq[3] + 1), FIG.manyRects(seq[3] - 2)],
        'The number of small squares follows a pattern. Which answer figure comes next?'
    );
}

function genShapeSeries(): BankQuestion {
    const start = pick([3, 4]);
    const seq = [start, start + 1, start + 2, start + 3];
    return figMcq(
        [FIG.poly(seq[0]), FIG.poly(seq[1]), FIG.poly(seq[2]), FIG.qmark],
        FIG.poly(seq[3]),
        [FIG.poly(seq[3] + 1), FIG.poly(Math.max(3, seq[3] - 2)), FIG.circle],
        'The number of sides increases by one in each step. Which answer figure comes next?'
    );
}

function genSizeSeries(): BankQuestion {
    const r0 = ri(8, 12);
    const step = ri(5, 7);
    const radii = [0, 1, 2, 3].map(i => r0 + i * step);
    return figMcq(
        [FIG.circleR(radii[0]), FIG.circleR(radii[1]), FIG.circleR(radii[2]), FIG.qmark],
        FIG.circleR(radii[3]),
        [FIG.circleR(radii[3] + step), FIG.circleR(radii[2] - step), FIG.circleR(Math.max(5, radii[0] - 3))],
        'The circle grows by the same amount in each step. Which answer figure comes next?'
    );
}

function genVisualOddOut(): BankQuestion {
    const variants: { base: string; odd: string }[] = [
        { base: FIG.arrow(0), odd: FIG.arrow(180) },
        { base: FIG.arrow(90), odd: FIG.arrow(270) },
        { base: FIG.poly(5), odd: FIG.poly(6) },
        { base: FIG.square, odd: FIG.rhombus },
        { base: FIG.triInCircle, odd: FIG.circleInTri },
        { base: FIG.halfDisc(0), odd: FIG.halfDisc(180) },
    ];
    const v = pick(variants);
    const figs = shuffle([v.odd, v.base, v.base, v.base]);
    return {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg([], figs),
        question: 'Look at the answer figures. Which figure is the odd one out?',
        options: figs.map((_, i) => `Figure ${String.fromCharCode(65 + i)}`),
        correctAnswer: String.fromCharCode(65 + figs.indexOf(v.odd)),
    };
}

function genCompassWalk(): BankQuestion {
    if (Math.random() < 0.5) {
        // 3-4-5 displacement
        const k = ri(1, 3);
        const [a, b, c] = [3 * k, 4 * k, 5 * k];
        const [d1, d2] = pick([['East', 'North'], ['West', 'South'], ['North', 'East'], ['South', 'West']]);
        return {
            category: 'visual', type: 'mcq', svg: COMPASS_SVG,
            question: `A man walks ${a} km towards ${d1}, then ${b} km towards ${d2}. Using the compass, how far is he from his starting point (straight line)?`,
            ...mcqOf(`${c} km`, [`${a + b} km`, `${c + k} km`, `${Math.max(1, c - k)} km`]),
        };
    }
    // out-and-back with a sideways leg
    const m = ri(4, 9);
    const [go, side] = pick([['North', 'East'], ['East', 'South'], ['South', 'West'], ['West', 'North']]);
    return {
        category: 'visual', type: 'mcq', svg: COMPASS_SVG,
        question: `A girl walks ${m} m towards ${go}, then ${m} m towards ${side}, then ${m} m opposite to ${go}. Using the compass, how far is she from her starting point?`,
        ...mcqOf(`${m} m`, [`${2 * m} m`, `${3 * m} m`, '0 m']),
    };
}

const VISUAL_GENERATORS = [genRotationSeries, genDotWalk, genCountSeries, genShapeSeries, genSizeSeries, genVisualOddOut, genCompassWalk];

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

const GENERATORS: Record<BankCategory, (() => BankQuestion)[]> = {
    math: MATH_GENERATORS,
    logical: LOGICAL_GENERATORS,
    verbal: VERBAL_GENERATORS,
    visual: VISUAL_GENERATORS,
    gk: [], // GK is factual — served from the curated bank only
    psych: [], // open-ended prompts are curated, not templated
};

/**
 * Generates `count` fresh questions for a category, each from a different
 * template, skipping anything (text + diagram) produced in recent tests.
 */
export function generateQuestions(category: BankCategory, count: number, exclude?: Set<string>): BankQuestion[] {
    const gens = GENERATORS[category];
    if (gens.length === 0 || count <= 0) return [];
    const chosen = shuffle(gens).slice(0, Math.max(count, 1));
    const out: BankQuestion[] = [];
    const seen = new Set<string>(exclude ?? []);
    let guard = 0;
    while (out.length < count && guard < 80) {
        guard++;
        // After several collisions, rotate to other templates for more room
        const gen = guard <= 40 ? chosen[out.length % chosen.length] : pick(gens);
        const q = gen();
        const key = questionKey(q.question, q.svg);
        if (!seen.has(key)) {
            seen.add(key);
            out.push(q);
        }
    }
    return out;
}
