// ─── APTITUDE QUESTION BANK ──────────────────────────────────────────────────
// A large pool of aptitude questions (mathematical, verbal, logical, general
// knowledge and visual/diagram-based) sourced from PMA-style intelligence
// tests. Every test run randomly samples 15 questions with a category quota,
// so each attempt gets a different mix.

import { Question, Scenario } from '../types/quiz.types';
import { COMPASS_SVG, FIG, figureSeriesSvg, questionKey } from './svgFigures';
import { generateQuestions } from './questionGenerators';

export type BankCategory = 'math' | 'verbal' | 'logical' | 'gk' | 'visual' | 'psych';

export interface BankQuestion {
    category: BankCategory;
    type: 'mcq' | 'text' | 'multi-text';
    question: string;
    options?: string[];
    // MCQ: letter "A".."E" | text: canonical answer.
    // Open-ended (psych) questions have NO correctAnswer — they earn their
    // mark through a meaningful attempt and feed the cognitive analysis.
    correctAnswer?: string;
    accept?: string[]; // text only: other accepted answers
    hint?: string;
    svg?: string;
}

const CATEGORY_NAMES: Record<BankCategory, string> = {
    math: 'Mathematical',
    verbal: 'Verbal Reasoning',
    logical: 'Logical Reasoning',
    gk: 'General Knowledge',
    visual: 'Visual Reasoning',
    psych: 'Problem Solving & Reflection',
};

const TIME_BY_TYPE: Record<string, number> = { mcq: 45, text: 75, 'multi-text': 150 };
const VISUAL_TIME = 60;
const PSYCH_TEXT_TIME = 120; // open-ended reflection needs more time than a short answer

// ─── THE BANK ────────────────────────────────────────────────────────────────

const BANK: BankQuestion[] = [
    // ── MATHEMATICAL ─────────────────────────────────────────────────────────
    { category: 'math', type: 'text', question: 'A car moves at 60 km/h. How much time will it take to cover 150 km? (answer in hours)', correctAnswer: '2.5', accept: ['2.5 hours', '2.5 hrs', '2.5hr', '2 hours 30 minutes', '2 and a half hours', '150 minutes', '2:30'] },
    { category: 'math', type: 'mcq', question: 'A car covers 100 km in 2 hours. How much time will it take to cover 250 km?', options: ['4 hours', '5 hours', '6 hours', '4.5 hours'], correctAnswer: 'B' },
    { category: 'math', type: 'mcq', question: 'A person covers 9 km in 1 hour 30 minutes. Find his speed in km/h.', options: ['4.5 km/h', '6 km/h', '9 km/h', '7.5 km/h'], correctAnswer: 'B' },
    { category: 'math', type: 'text', question: 'A train runs at 80 km/h. How far will it go in 3 hours? (answer in km)', correctAnswer: '240', accept: ['240 km', '240km', '240 kilometers', '240 kilometres'] },
    { category: 'math', type: 'mcq', question: 'A train travels 300 km in 5 hours. What is its speed?', options: ['50 km/h', '55 km/h', '60 km/h', '65 km/h'], correctAnswer: 'C' },
    { category: 'math', type: 'mcq', question: 'A class has 500 students, 360 are boys. What is the percentage of girls?', options: ['24%', '28%', '30%', '32%'], correctAnswer: 'B' },
    { category: 'math', type: 'text', question: 'What is 10% of 50% of half a kg? Express the answer in grams.', correctAnswer: '25', accept: ['25g', '25 g', '25 grams', '25grams'] },
    { category: 'math', type: 'mcq', question: 'One dozen mangoes cost Rs.84. What will be the cost of 21 mangoes?', options: ['Rs.126', 'Rs.147', 'Rs.168', 'Rs.140'], correctAnswer: 'B' },
    { category: 'math', type: 'text', question: 'A shopkeeper sells 1 dozen cupcakes for Rs.48. How much will 6 cupcakes cost? (answer in Rs.)', correctAnswer: '24', accept: ['rs.24', 'rs 24', '24 rupees', 'rs24'] },
    { category: 'math', type: 'mcq', question: 'A packet of 24 chocolates costs Rs.240. Find the cost of 10 chocolates.', options: ['Rs.90', 'Rs.110', 'Rs.100', 'Rs.120'], correctAnswer: 'C' },
    { category: 'math', type: 'mcq', question: 'The cost of 4 dozen lemons is Rs.96. What will be the price of 15 lemons?', options: ['Rs.30', 'Rs.28', 'Rs.32', 'Rs.45'], correctAnswer: 'A' },
    { category: 'math', type: 'text', question: 'The cost of 30 pencils is Rs.150. How many pencils can be bought for Rs.90?', correctAnswer: '18', accept: ['18 pencils'] },
    { category: 'math', type: 'mcq', question: 'Currently, Ahmed is 10 years old and his brother is 4 years younger than him. What will be their age difference after 20 years?', options: ['4 years', '8 years', '24 years', '14 years'], correctAnswer: 'A' },
    { category: 'math', type: 'text', question: 'Sana is 4 years older than Hina. If Hina is 8 years old today, how old will Sana be after 5 years?', correctAnswer: '17', accept: ['17 years', '17 years old'] },
    { category: 'math', type: 'mcq', question: "When Zain was 10 years old, his father was 40. What will be the age of Zain's father when Zain turns 30?", options: ['50 years', '55 years', '60 years', '70 years'], correctAnswer: 'C' },
    { category: 'math', type: 'mcq', question: 'A mother is three times as old as her son. If the son is 7 years old today, in how many years will the mother be twice his age?', options: ['5 years', '7 years', '10 years', '14 years'], correctAnswer: 'B' },
    { category: 'math', type: 'mcq', question: 'Ali is 6 years old and his sister is twice his age. What will be her age when Ali turns 12?', options: ['24 years', '18 years', '16 years', '20 years'], correctAnswer: 'B' },
    { category: 'math', type: 'mcq', question: '5 labourers can grind 5 kilograms of corn in 5 minutes. How many kg of corn will one labourer grind in one minute?', options: ['1 kg', '5 kg', '1/5 kg', '1/25 kg'], correctAnswer: 'C' },
    { category: 'math', type: 'text', question: 'If 5 boys write 5 pages in 5 minutes, in how many minutes can one boy write one page?', correctAnswer: '5', accept: ['5 minutes', '5 mins', '5min'] },
    { category: 'math', type: 'mcq', question: 'A shirt costs Rs.800. After a 25% discount, what is its price?', options: ['Rs.550', 'Rs.600', 'Rs.650', 'Rs.700'], correctAnswer: 'B' },
    { category: 'math', type: 'mcq', question: 'What is 15% of 200?', options: ['20', '25', '30', '35'], correctAnswer: 'C' },
    { category: 'math', type: 'text', question: 'A bag has 3 dozen eggs. 6 eggs are broken. How many eggs are left?', correctAnswer: '30', accept: ['30 eggs'] },
    { category: 'math', type: 'mcq', question: 'A worker earns Rs.4,500 in 9 days. How much does he earn in 4 days?', options: ['Rs.1,800', 'Rs.2,000', 'Rs.2,200', 'Rs.2,500'], correctAnswer: 'B' },
    { category: 'math', type: 'mcq', question: "Ayesha's age is half of her father's age. If her father is 48 years old, how old will Ayesha be after 6 years?", options: ['24 years', '28 years', '30 years', '32 years'], correctAnswer: 'C' },
    { category: 'math', type: 'text', question: 'A cyclist covers 36 km in 3 hours. What is his speed in km/h?', correctAnswer: '12', accept: ['12 km/h', '12km/h', '12 kmh'] },
    { category: 'math', type: 'mcq', question: 'If 8 pens cost Rs.96, what is the cost of 5 pens?', options: ['Rs.55', 'Rs.60', 'Rs.65', 'Rs.70'], correctAnswer: 'B' },
    { category: 'math', type: 'mcq', question: 'A water tank fills completely in 40 minutes. What fraction of the tank fills in 10 minutes?', options: ['1/2', '1/3', '1/4', '1/5'], correctAnswer: 'C' },
    { category: 'math', type: 'text', question: 'Out of 60 marks, Ali scored 45. What percentage did he score?', correctAnswer: '75', accept: ['75%', '75 percent'] },
    { category: 'math', type: 'mcq', question: 'The sum of two numbers is 30 and their difference is 6. What is the larger number?', options: ['16', '18', '20', '22'], correctAnswer: 'B' },

    // ── VERBAL REASONING ─────────────────────────────────────────────────────
    { category: 'verbal', type: 'text', question: 'Re-arrange the following jumbled letters to form a sensible word and type it: M C O P T R E U', correctAnswer: 'computer' },
    { category: 'verbal', type: 'text', question: "Re-arrange the jumbled letters to form a meaningful English word and type it: ENGRAST", hint: 'Opposite of "familiar".', correctAnswer: 'strange' },
    { category: 'verbal', type: 'mcq', question: 'WATCH is to TIME as BAROMETER is to ______.', options: ['Mercury', 'Gas Cylinder', 'Pressure', 'Temperature'], correctAnswer: 'C' },
    { category: 'verbal', type: 'mcq', question: 'SAND is to DESERT as AIR is to ______.', options: ['Sky', 'Atmosphere', 'Ocean', 'Island'], correctAnswer: 'B' },
    { category: 'verbal', type: 'mcq', question: 'Listen is to hear as look is to ______.', options: ['After', 'See', 'Observe', 'Notice'], correctAnswer: 'B' },
    { category: 'verbal', type: 'mcq', question: 'Good is to Bad as Sharp is to ______.', options: ['Blunt', 'Thin', 'Fast', 'Slow'], correctAnswer: 'A' },
    { category: 'verbal', type: 'mcq', question: 'Day is to Night as Accept is to ______.', options: ['Reject', 'Except', 'Agree', 'Adopt'], correctAnswer: 'A' },
    { category: 'verbal', type: 'mcq', question: 'Accelerate is to retard as praise is to ______.', options: ['Scold', 'Applaud', 'Glorify', 'Commend'], correctAnswer: 'A' },
    { category: 'verbal', type: 'mcq', question: 'Conference : Chairman :: Newspaper : ______', options: ['Reporter', 'Distributor', 'Printer', 'Editor'], correctAnswer: 'D' },
    { category: 'verbal', type: 'mcq', question: 'HANDSOME is to BEAUTIFUL as HE is to ______.', options: ['MAN', 'SHE', 'CHARMING', 'HIM'], correctAnswer: 'B' },
    { category: 'verbal', type: 'mcq', question: 'Which word does NOT belong with the others?', options: ['Apple', 'Mango', 'Carrot', 'Banana'], correctAnswer: 'C' },
    { category: 'verbal', type: 'mcq', question: 'Choose the odd one out:', options: ['United Nations', 'SAARC', 'ASEAN', 'Punjab Assembly'], correctAnswer: 'D' },
    { category: 'verbal', type: 'mcq', question: 'What is that which you see once in a MINUTE, twice in a WEEK, but never in a DAY, nor even in a MONTH?', options: ['b', 'h', 'i', 'e'], correctAnswer: 'D' },
    { category: 'verbal', type: 'text', question: 'Re-arrange the jumbled letters to form a sensible word and type it: L O H O S C', correctAnswer: 'school' },
    { category: 'verbal', type: 'text', question: 'Re-arrange the jumbled letters to form a fruit name and type it: N A B A N A', correctAnswer: 'banana' },
    { category: 'verbal', type: 'mcq', question: 'Doctor : Hospital :: Teacher : ______', options: ['School', 'Office', 'Court', 'Library'], correctAnswer: 'A' },
    { category: 'verbal', type: 'mcq', question: 'Pen is to Writer as Brush is to ______.', options: ['Painter', 'Carpenter', 'Doctor', 'Barber'], correctAnswer: 'A' },
    { category: 'verbal', type: 'mcq', question: 'Which word does NOT belong with the others?', options: ['Car', 'Bus', 'Truck', 'Boat'], correctAnswer: 'D' },
    { category: 'verbal', type: 'mcq', question: 'Find the odd one out:', options: ['Rose', 'Jasmine', 'Tulip', 'Mango'], correctAnswer: 'D' },
    { category: 'verbal', type: 'mcq', question: 'BIG is to SMALL as TALL is to ______.', options: ['Short', 'High', 'Long', 'Wide'], correctAnswer: 'A' },
    { category: 'verbal', type: 'mcq', question: 'Book : Pages :: Ladder : ______', options: ['Rungs', 'Wood', 'Height', 'Climbing'], correctAnswer: 'A' },

    // ── LOGICAL REASONING ────────────────────────────────────────────────────
    { category: 'logical', type: 'mcq', question: 'Complete the series: 1, 4, 9, 16, 25, ...?', options: ['35', '36', '48', '49'], correctAnswer: 'B' },
    { category: 'logical', type: 'mcq', question: 'Find the missing number: 20, 19, 17, (...), 10, 5', options: ['12', '13', '14', '15'], correctAnswer: 'C' },
    { category: 'logical', type: 'mcq', question: 'Complete the series: 6, 11, 21, 36, 56, ...?', options: ['42', '51', '81', '91'], correctAnswer: 'C' },
    { category: 'logical', type: 'text', question: 'Complete the series and type the missing number: 1, 6, 13, 22, 33, ...?', correctAnswer: '46' },
    { category: 'logical', type: 'mcq', question: 'Complete the series: 121, 225, 361, ...?', options: ['441', '484', '529', '729'], correctAnswer: 'C' },
    { category: 'logical', type: 'mcq', question: 'Find the missing number: 0, 2, 8, 14, (...), 34', options: ['24', '22', '20', '18'], correctAnswer: 'A' },
    { category: 'logical', type: 'text', question: 'Complete the series and type the next number: 5, 9, 17, 29, 45, ...?', correctAnswer: '65' },
    { category: 'logical', type: 'mcq', question: 'Which letter should come next in the series? A, C, F, J, ...', options: ['H', 'O', 'U', 'M'], correctAnswer: 'B' },
    { category: 'logical', type: 'mcq', question: 'Complete the series: AB, BA, ABC, CBA, ABCD, ...?', options: ['ACBD', 'BACD', 'CABD', 'DCBA'], correctAnswer: 'D' },
    { category: 'logical', type: 'mcq', question: 'In a code language, R S N O means STOP. What does K N R S mean? (A B C D E F G H I J K L M N O P Q R S T U V W X Y Z)', options: ['LOST', 'LOTS', 'SLOT', 'TOLL'], correctAnswer: 'A' },
    { category: 'logical', type: 'mcq', question: 'If TOUR is coded as 1234, CLEAR is coded as 56784 and SPARE is coded as 90847, how would you encode CARE?', options: ['5847', '5874', '5487', '5784'], correctAnswer: 'A' },
    { category: 'logical', type: 'mcq', question: 'If 1 + 1 = 2, 2 + 3 = 13 and 3 + 3 = 18, then 4 + 3 = ?', options: ['22', '25', '23', '16'], correctAnswer: 'B' },
    { category: 'logical', type: 'mcq', question: 'Imran reached the finish line before Kamran but after Zeeshan. Who finished last?', options: ['Imran', 'Kamran', 'Zeeshan', 'Cannot be determined'], correctAnswer: 'B' },
    { category: 'logical', type: 'mcq', question: 'The mountain in Nepal is taller than the one in India, but shorter than the one in China. Which mountain is the tallest?', options: ['The one in Nepal', 'The one in India', 'The one in China', 'They are all equal'], correctAnswer: 'C' },
    { category: 'logical', type: 'mcq', question: 'Mona scored higher than Zara but lower than Ayesha in the test. Who scored the lowest?', options: ['Mona', 'Zara', 'Ayesha', 'Cannot be determined'], correctAnswer: 'B' },
    { category: 'logical', type: 'mcq', question: 'Bilal arrived earlier than Usman, but later than Hamza. Who arrived first?', options: ['Bilal', 'Usman', 'Hamza', 'Cannot be determined'], correctAnswer: 'C' },
    { category: 'logical', type: 'mcq', question: 'The red box is bigger than the blue box, and the green box is smaller than the blue box. Which box is the smallest?', options: ['The red box', 'The blue box', 'The green box', 'Cannot be determined'], correctAnswer: 'C' },
    { category: 'logical', type: 'mcq', question: 'A is the mother of B, and A is the sister of C. What is the relationship between B and C?', options: ["C is B's uncle/aunt", "C is B's cousin", "C is B's brother-in-law", "C is B's son-in-law"], correctAnswer: 'A' },
    { category: 'logical', type: 'mcq', question: 'Sister of my brother is your mother. What is the relation between you and me?', options: ['You are my brother', 'You are my sister', 'You are my nephew/niece', 'You are my cousin'], correctAnswer: 'C' },
    { category: 'logical', type: 'mcq', question: 'I walked North for 4 km, turned to my left and walked 6 km, then turned to my right and walked 4 km. How far am I from the starting point (straight line)?', options: ['15 km', '14 km', '20 km', '10 km'], correctAnswer: 'D' },
    { category: 'logical', type: 'mcq', question: 'Complete the series: 2, 4, 8, 16, 32, ...?', options: ['48', '64', '62', '66'], correctAnswer: 'B' },
    { category: 'logical', type: 'mcq', question: 'Complete the series: 3, 6, 9, 12, ...?', options: ['14', '15', '16', '18'], correctAnswer: 'B' },
    { category: 'logical', type: 'text', question: 'Complete the series and type the next number: 7, 14, 28, 56, ...?', correctAnswer: '112' },
    { category: 'logical', type: 'mcq', question: 'Which letter comes next in the series? Z, X, V, T, ...', options: ['S', 'R', 'Q', 'P'], correctAnswer: 'B' },
    { category: 'logical', type: 'mcq', question: 'If CAT is coded as 3-1-20, how is DOG coded?', options: ['4-15-7', '4-14-7', '5-15-7', '4-15-8'], correctAnswer: 'A' },
    { category: 'logical', type: 'mcq', question: 'Ahmed is facing East. He turns 90° clockwise, then another 180°. Which direction is he facing now?', options: ['North', 'South', 'East', 'West'], correctAnswer: 'A' },
    { category: 'logical', type: 'mcq', question: 'All roses are flowers. Some flowers fade quickly. Which statement is definitely true?', options: ['All roses fade quickly', 'Roses are flowers', 'No rose fades quickly', 'All flowers are roses'], correctAnswer: 'B' },
    { category: 'logical', type: 'mcq', question: 'In a row of students, Sara is 7th from the left and 4th from the right. How many students are in the row?', options: ['10', '11', '12', '9'], correctAnswer: 'A' },
    { category: 'logical', type: 'mcq', question: 'A is taller than B, and B is taller than C. Who is the shortest?', options: ['A', 'B', 'C', 'Cannot be determined'], correctAnswer: 'C' },

    // ── GENERAL KNOWLEDGE ────────────────────────────────────────────────────
    { category: 'gk', type: 'mcq', question: 'Hong Kong is to China as Vatican is to ______.', options: ['Rome', 'Mexico', 'Canada', 'Christianity'], correctAnswer: 'A' },
    { category: 'gk', type: 'mcq', question: 'What is the capital city of Pakistan?', options: ['Karachi', 'Lahore', 'Islamabad', 'Peshawar'], correctAnswer: 'C' },
    { category: 'gk', type: 'mcq', question: 'How many continents are there in the world?', options: ['5', '6', '7', '8'], correctAnswer: 'C' },
    { category: 'gk', type: 'mcq', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Mercury'], correctAnswer: 'B' },
    { category: 'gk', type: 'mcq', question: 'K2, the second-highest mountain in the world, is located in which country?', options: ['Nepal', 'India', 'Pakistan', 'China'], correctAnswer: 'C' },
    { category: 'gk', type: 'text', question: 'Which gas do plants absorb from the air during photosynthesis? Type your answer.', correctAnswer: 'carbon dioxide', accept: ['co2', 'carbondioxide', 'carbon di oxide'] },
    { category: 'gk', type: 'mcq', question: 'Which is the largest ocean in the world?', options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'], correctAnswer: 'D' },
    { category: 'gk', type: 'mcq', question: 'The Great Wall is located in which country?', options: ['Japan', 'China', 'India', 'Korea'], correctAnswer: 'B' },
    { category: 'gk', type: 'mcq', question: 'How many days are there in a leap year?', options: ['364', '365', '366', '367'], correctAnswer: 'C' },
    { category: 'gk', type: 'mcq', question: 'What is the national language of Pakistan?', options: ['Punjabi', 'Urdu', 'Sindhi', 'Pashto'], correctAnswer: 'B' },
    { category: 'gk', type: 'mcq', question: 'The sun rises in the ______.', options: ['North', 'South', 'East', 'West'], correctAnswer: 'C' },
    { category: 'gk', type: 'mcq', question: 'Which is the longest river in Pakistan?', options: ['Ravi', 'Chenab', 'Jhelum', 'Indus'], correctAnswer: 'D' },
    { category: 'gk', type: 'text', question: 'How many minutes are there in 2 hours? Type the number.', correctAnswer: '120', accept: ['120 minutes', '120 mins'] },
    { category: 'gk', type: 'mcq', question: 'Quaid-e-Azam Muhammad Ali Jinnah was born in which city?', options: ['Lahore', 'Karachi', 'Dhaka', 'Delhi'], correctAnswer: 'B' },
    { category: 'gk', type: 'mcq', question: 'Which planet is closest to the Sun?', options: ['Earth', 'Venus', 'Mercury', 'Mars'], correctAnswer: 'C' },
    { category: 'gk', type: 'mcq', question: 'How many bones are there in the adult human body?', options: ['106', '206', '306', '256'], correctAnswer: 'B' },
    { category: 'gk', type: 'mcq', question: 'Which vitamin does sunlight help the human body produce?', options: ['Vitamin A', 'Vitamin B', 'Vitamin C', 'Vitamin D'], correctAnswer: 'D' },
    { category: 'gk', type: 'mcq', question: 'What is the currency of Japan?', options: ['Won', 'Yuan', 'Yen', 'Ringgit'], correctAnswer: 'C' },
    { category: 'gk', type: 'mcq', question: 'Mount Everest lies in which mountain range?', options: ['Karakoram', 'Himalayas', 'Alps', 'Hindu Kush'], correctAnswer: 'B' },
    { category: 'gk', type: 'mcq', question: 'Which gas makes up most of the Earth\'s atmosphere?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], correctAnswer: 'C' },
    { category: 'gk', type: 'mcq', question: 'Who is the national poet of Pakistan?', options: ['Faiz Ahmed Faiz', 'Allama Iqbal', 'Ahmed Faraz', 'Mirza Ghalib'], correctAnswer: 'B' },
    { category: 'gk', type: 'text', question: 'In which year did Pakistan come into being? Type the year.', correctAnswer: '1947' },
    { category: 'gk', type: 'mcq', question: 'Which is the smallest continent by land area?', options: ['Europe', 'Antarctica', 'Australia', 'South America'], correctAnswer: 'C' },
    { category: 'gk', type: 'mcq', question: 'How many players are there in a cricket team?', options: ['9', '10', '11', '12'], correctAnswer: 'C' },
    { category: 'gk', type: 'mcq', question: 'What is the boiling point of water at sea level?', options: ['90°C', '100°C', '110°C', '120°C'], correctAnswer: 'B' },
    { category: 'gk', type: 'mcq', question: 'The Thar Desert is located in which province of Pakistan?', options: ['Punjab', 'Balochistan', 'Sindh', 'KPK'], correctAnswer: 'C' },
    { category: 'gk', type: 'mcq', question: 'The Olympic Games are normally held after every how many years?', options: ['2 years', '3 years', '4 years', '5 years'], correctAnswer: 'C' },
    { category: 'gk', type: 'mcq', question: 'Which is the largest planet in our solar system?', options: ['Saturn', 'Jupiter', 'Neptune', 'Earth'], correctAnswer: 'B' },
    { category: 'gk', type: 'mcq', question: 'Faisal Mosque is located in which city?', options: ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad'], correctAnswer: 'C' },
    { category: 'gk', type: 'mcq', question: 'Which country gifted the Statue of Liberty to the USA?', options: ['England', 'France', 'Germany', 'Italy'], correctAnswer: 'B' },

    // ── PROBLEM SOLVING & REFLECTION (open-ended, no right answer) ───────────
    // These reveal HOW the student thinks: approach, values, creativity and
    // self-awareness. They are marked on meaningful attempt, and the written
    // answers feed the cognitive-feature and confidence analysis.
    { category: 'psych', type: 'text', question: 'Your two best friends have had a serious fight and both want you to take their side. How would you handle this situation? Explain your reasoning.' },
    { category: 'psych', type: 'text', question: 'You have an important exam tomorrow, but late at night a close friend calls you, upset, and really needs someone to talk to. What would you do, and why?' },
    { category: 'psych', type: 'text', question: 'You studied hard for a test but still failed it. What do you think went wrong, and what would you do next?' },
    { category: 'psych', type: 'text', question: 'A group member is not contributing to your class project and the deadline is near. How would you solve this problem?' },
    { category: 'psych', type: 'text', question: 'What do you think matters more for success in life: hard work or luck? Give reasons for your answer.' },
    { category: 'psych', type: 'text', question: 'You find a wallet on the street with cash and an ID card inside. What would you do? Describe your steps.' },
    { category: 'psych', type: 'text', question: 'What do you think about using AI tools (like ChatGPT) for homework? When is it helpful and when is it harmful?' },
    { category: 'psych', type: 'text', question: 'If you were the class monitor and caught your best friend cheating in a test, what would you do and why?' },
    { category: 'psych', type: 'text', question: 'Describe a difficult problem you solved recently — in studies or daily life. How did you approach it?' },
    { category: 'psych', type: 'text', question: 'You are leading a team and two members strongly disagree with each other\'s ideas. How would you decide what to do?' },
    { category: 'psych', type: 'text', question: 'If you could change one thing about how subjects are taught in your institute, what would it be and why?' },
    { category: 'psych', type: 'text', question: 'Your phone breaks one day before an important online registration deadline. What is your plan? Describe it.' },
    { category: 'psych', type: 'text', question: 'A junior student asks you for the "secret to good grades". What advice would you honestly give, and why?' },
    { category: 'psych', type: 'multi-text', question: 'Your class wants to organise a farewell party but has almost no budget. Give 3 different ways to make it successful anyway.' },
    { category: 'psych', type: 'multi-text', question: 'The electricity goes out during your online exam. Give 3 backup plans you could use.' },
    { category: 'psych', type: 'multi-text', question: 'Give 3 different ways a student can memorise difficult concepts effectively.' },
    { category: 'psych', type: 'multi-text', question: 'Traffic near your campus is always jammed at closing time. Suggest 3 practical solutions.' },
    { category: 'psych', type: 'multi-text', question: 'Many students feel sleepy in early morning classes. Give 3 realistic ways to fix this problem.' },
    { category: 'psych', type: 'text', question: 'You get two good opportunities at the same time: an unpaid internship in your field and a paid part-time job outside it. How would you decide which one to take?' },
    { category: 'psych', type: 'text', question: 'A close friend keeps borrowing your notes but never shares his own. How would you deal with this?' },
    { category: 'psych', type: 'text', question: 'If you were given one full week with no classes and no exams, how would you spend it and why?' },
    { category: 'psych', type: 'text', question: 'You notice a classmate being left out of every group activity. What would you do?' },
    { category: 'psych', type: 'text', question: 'Your parents want you to choose a career you are not interested in. How would you handle this conversation?' },
    { category: 'psych', type: 'text', question: 'You have three assignments due on the same day but time to properly complete only two. How would you decide what to do?' },
    { category: 'psych', type: 'text', question: 'What does "failure" mean to you? Describe how you deal with it when it happens.' },
    { category: 'psych', type: 'text', question: 'You believe a teacher has marked your paper unfairly. What steps would you take?' },
    { category: 'psych', type: 'multi-text', question: 'Your university cafeteria food is poor quality. Suggest 3 realistic ways students could get it improved.' },
    { category: 'psych', type: 'multi-text', question: 'A first-semester student is struggling to manage time. Give 3 practical time-management tips.' },
    { category: 'psych', type: 'multi-text', question: 'Your study group gets distracted in every session. Give 3 ways to make the sessions productive.' },

    // ── VISUAL REASONING (diagram-based) ─────────────────────────────────────
    {
        category: 'visual', type: 'mcq', svg: COMPASS_SVG,
        question: 'Sameer is walking toward South and after some time he turns left. Using the compass, what is his present direction?',
        options: ['East', 'West', 'North', 'South'], correctAnswer: 'A',
    },
    {
        category: 'visual', type: 'mcq', svg: COMPASS_SVG,
        question: 'A man walks 10 meters towards North, then walks toward South. After this he turns back and then moves towards his left. Using the compass, what is his present direction?',
        options: ['East', 'West', 'North', 'South'], correctAnswer: 'B',
    },
    {
        category: 'visual', type: 'mcq', svg: COMPASS_SVG,
        question: 'I started walking down a road in the morning facing the Sun (it rises in the East). After walking for some time, I turned to my left, then I turned to my right. In which direction was I going then?',
        options: ['East', 'West', 'North', 'South'], correctAnswer: 'A',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [FIG.circle, FIG.circleV, FIG.square, FIG.qmark],
            [FIG.squareH, FIG.squareV, FIG.squareD, FIG.square]
        ),
        question: 'One figure is missing in the problem series. Which answer figure fills the blank?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'B',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [FIG.dots(1), FIG.dots(2), FIG.dots(3), FIG.qmark],
            [FIG.dots(4), FIG.dots(5), FIG.dots(2), FIG.dots(6)]
        ),
        question: 'The number of dots follows a pattern. Which answer figure comes next in the series?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'A',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [FIG.arrow(0), FIG.arrow(90), FIG.arrow(180), FIG.qmark],
            [FIG.arrow(90), FIG.arrow(0), FIG.arrow(270), FIG.arrow(180)]
        ),
        question: 'The arrow rotates by the same amount in each step. Which answer figure comes next?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'C',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [FIG.triInCircle, FIG.circleInTri, FIG.triInCircle, FIG.qmark],
            [FIG.triInCircle, FIG.circle, FIG.circleInTri, FIG.triangle]
        ),
        question: 'The figures alternate in a pattern. Which answer figure comes next in the series?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'C',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [FIG.shadedQuads(0), FIG.shadedQuads(1), FIG.shadedQuads(2), FIG.qmark],
            [FIG.shadedQuads(4), FIG.shadedQuads(1), FIG.shadedQuads(3), FIG.shadedQuads(0)]
        ),
        question: 'One more quarter is shaded at each step. Which answer figure comes next?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'C',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [],
            [FIG.square, FIG.rect, FIG.rhombus, FIG.triangle]
        ),
        question: 'Look at the answer figures. Which figure is the odd one out?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'D',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [FIG.circleR(10), FIG.circleR(16), FIG.circleR(22), FIG.qmark],
            [FIG.circleR(22), FIG.circleR(28), FIG.circleR(16), FIG.circleR(10)]
        ),
        question: 'The circle grows by the same amount in each step. Which answer figure comes next?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'B',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [FIG.dotCorner('TL'), FIG.dotCorner('TR'), FIG.dotCorner('BR'), FIG.qmark],
            [FIG.dotCorner('C'), FIG.dotCorner('TL'), FIG.dotCorner('BL'), FIG.dotCorner('TR')]
        ),
        question: 'The dot moves clockwise around the corners of the square. Which answer figure comes next?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'C',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [FIG.halfDisc(0), FIG.halfDisc(90), FIG.halfDisc(180), FIG.qmark],
            [FIG.halfDisc(90), FIG.halfDisc(270), FIG.halfDisc(0), FIG.halfDisc(180)]
        ),
        question: 'The shaded half rotates by the same amount in each step. Which answer figure comes next?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'B',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [FIG.poly(3), FIG.poly(4), FIG.poly(5), FIG.qmark],
            [FIG.poly(3), FIG.poly(6), FIG.poly(8), FIG.circle]
        ),
        question: 'The number of sides increases by one in each step. Which answer figure comes next?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'B',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [FIG.manyRects(2), FIG.manyRects(4), FIG.manyRects(6), FIG.qmark],
            [FIG.manyRects(7), FIG.manyRects(9), FIG.manyRects(8), FIG.manyRects(5)]
        ),
        question: 'The number of small squares follows a pattern. Which answer figure comes next?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'C',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [FIG.lineAngle(0), FIG.lineAngle(45), FIG.lineAngle(90), FIG.qmark],
            [FIG.lineAngle(135), FIG.lineAngle(0), FIG.lineAngle(90), FIG.lineAngle(45)]
        ),
        question: 'The line rotates by 45° in each step. Which answer figure comes next?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'A',
    },
    {
        category: 'visual', type: 'mcq',
        svg: figureSeriesSvg(
            [],
            [FIG.arrow(0), FIG.arrow(0), FIG.arrow(180), FIG.arrow(0)]
        ),
        question: 'Look at the answer figures. Which arrow is the odd one out?',
        options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'], correctAnswer: 'C',
    },
    {
        category: 'visual', type: 'mcq', svg: COMPASS_SVG,
        question: 'A boy walks 5 m East, then 5 m North, then 5 m West. Using the compass, how far is he from his starting point?',
        options: ['5 m', '10 m', '15 m', '0 m'], correctAnswer: 'A',
    },
];

// ─── TEST BUILDER ────────────────────────────────────────────────────────────

/** Number of questions drawn from each category (total = 12). */
const QUOTA: Record<BankCategory, number> = {
    math: 0, // mathematical questions removed by request
    logical: 2,
    verbal: 1,
    visual: 3,
    gk: 2,
    psych: 4,
};

export const TOTAL_TEST_QUESTIONS = Object.values(QUOTA).reduce((a, b) => a + b, 0);

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── RECENTLY-USED TRACKING ───────────────────────────────────────────────────
// Remembers the questions used in the last few tests (localStorage) so fresh
// tests strongly prefer questions the student hasn't just seen.

const RECENT_KEY = 'aita_recent_questions_v2';
const RECENT_TESTS_REMEMBERED = 4; // avoid questions from the last N tests

function getRecentKeys(): string[] {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        return Array.isArray(parsed) ? parsed.flat() : [];
    } catch {
        return [];
    }
}

function pushRecentTest(keys: string[]): void {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        const tests: string[][] = Array.isArray(parsed) ? parsed : [];
        tests.push(keys);
        localStorage.setItem(RECENT_KEY, JSON.stringify(tests.slice(-RECENT_TESTS_REMEMBERED)));
    } catch {
        /* localStorage unavailable — repetition avoidance just degrades */
    }
}

/**
 * How many of each category's quota are generated fresh (in real time, with
 * random numbers/names/patterns) rather than drawn from the curated bank.
 * GK and open-ended questions stay curated.
 */
const GENERATED_PER_CATEGORY: Record<BankCategory, number> = {
    visual: 2,
    math: 0,
    logical: 1,
    verbal: 1,
    gk: 0,
    psych: 0, // open-ended prompts are curated, not templated
};

export function buildTest(): { scenario: Scenario; questions: Question[] } {
    const recent = new Set(getRecentKeys());
    let picked: BankQuestion[] = [];
    (Object.keys(QUOTA) as BankCategory[]).forEach(cat => {
        // Fresh real-time generated questions first (avoiding recent output)
        const generated = generateQuestions(cat, Math.min(GENERATED_PER_CATEGORY[cat], QUOTA[cat]), recent);
        picked.push(...generated);

        // Fill the rest from the curated bank, preferring questions not seen
        // in the last few tests.
        const remaining = QUOTA[cat] - generated.length;
        if (remaining > 0) {
            const pool = BANK.filter(q => q.category === cat);
            const byRecency = (qs: BankQuestion[]) => [
                ...shuffle(qs.filter(q => !recent.has(questionKey(q.question, q.svg)))),
                ...shuffle(qs.filter(q => recent.has(questionKey(q.question, q.svg)))),
            ];
            if (cat === 'psych') {
                // At most one "give 3 solutions" (multi-text) question per test
                const multi = byRecency(pool.filter(q => q.type === 'multi-text')).slice(0, 1);
                const texts = byRecency(pool.filter(q => q.type === 'text'));
                picked.push(...[...multi, ...texts].slice(0, remaining));
            } else {
                picked.push(...byRecency(pool).slice(0, remaining));
            }
        }
    });

    picked = shuffle(picked);
    pushRecentTest(picked.map(q => questionKey(q.question, q.svg)));

    const questions: Question[] = picked.map((q, i) => ({
        id: i + 1,
        phase: i + 1,
        phaseName: CATEGORY_NAMES[q.category],
        type: q.type,
        timeLimit:
            q.category === 'psych'
                ? (q.type === 'multi-text' ? TIME_BY_TYPE['multi-text'] : PSYCH_TEXT_TIME)
                : q.svg ? VISUAL_TIME : TIME_BY_TYPE[q.type] ?? 45,
        question: q.question,
        hint: q.hint ?? (q.category === 'psych'
            ? 'There is no right or wrong answer — we are interested in HOW you think, so explain your reasoning.'
            : undefined),
        options: q.options,
        category: q.category,
        svg: q.svg,
        correctAnswer: q.correctAnswer,
        accept: q.accept,
    }));

    const totalTimeLimit = questions.reduce((s, q) => s + q.timeLimit, 0);

    const scenario: Scenario = {
        title: '🧠 Aptitude & Thinking Assessment',
        description:
            `A single mixed test of ${TOTAL_TEST_QUESTIONS} questions covering problem-solving & reflection, general knowledge, logical reasoning, verbal reasoning and visual (diagram) puzzles. Questions are randomly selected — every attempt is different.`,
        context_details:
            `• ${TOTAL_TEST_QUESTIONS} questions — answer all of them\n• Mix of multiple-choice, written and diagram-based questions\n• Open-ended questions have no right answer — they earn their mark through a genuine, thought-out attempt\n• You can move back and forth between questions\n• Your result dashboard is shown right after you submit`,
        constraint: 'Answer every question — unanswered questions count against your marks.',
        urgency: `Finish before the timer runs out (${Math.round(totalTimeLimit / 60)} minutes total).`,
        totalTimeLimit,
    };

    return { scenario, questions };
}

// ─── GRADING ─────────────────────────────────────────────────────────────────

function normalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9./]/g, '');
}

/** Grades a single answer against the bank question. */
export function isCorrect(q: Question, answer: string | string[] | undefined): boolean {
    if (answer == null) return false;

    // Open-ended questions (no correctAnswer): the mark is earned through a
    // meaningful attempt — a real written response, not a token keystroke.
    if (!q.correctAnswer) {
        if (Array.isArray(answer)) {
            return answer.filter(s => (s || '').trim().length >= 4).length >= 2;
        }
        return String(answer).trim().length >= 20;
    }

    const raw = Array.isArray(answer) ? answer.join(' ') : String(answer);
    if (raw.trim().length === 0) return false;

    if (q.type === 'mcq') {
        return raw.trim().toUpperCase() === q.correctAnswer.toUpperCase();
    }

    // Written answers: normalized comparison against the canonical + accepted list
    const candidates = [q.correctAnswer, ...(q.accept || [])].map(normalize);
    const given = normalize(raw);
    if (candidates.includes(given)) return true;

    // Numeric tolerance: "2.5", "2.5 hours", "Rs. 24" etc.
    const numGiven = parseFloat(given.replace(/[^0-9.]/g, ''));
    if (!Number.isNaN(numGiven)) {
        return candidates.some(c => {
            const numC = parseFloat(c.replace(/[^0-9.]/g, ''));
            return !Number.isNaN(numC) && Math.abs(numC - numGiven) < 1e-9;
        });
    }
    return false;
}

export interface GradeSummary {
    correct: number;         // total marks earned (1/question, incl. attempt-based open-ended)
    graded: number;          // total questions (= total marks)
    accuracy: number;        // marks ratio (correct/graded) — matches the displayed X/N score
    objectiveAccuracy: number; // correctness over ONLY objectively-gradable questions
    objectiveCount: number;  // how many questions had a definite right answer
    perQuestion: Record<number, boolean>;
}

// ─── VARK ESTIMATION ─────────────────────────────────────────────────────────
// Estimates VARK learning-style preferences from how the student actually
// performed across the different question formats in THIS test:
//   Visual      → accuracy on diagram/visual questions
//   Read/Write  → accuracy on written (typed) answers + verbal reasoning
//   Auditory    → accuracy on language-based questions (verbal + GK recall),
//                 the closest behavioural proxy available in a silent test
//   Kinesthetic → accuracy on applied problem-solving (math + logical) blended
//                 with hands-on interactivity (answer changes / experimenting)
export function computeVark(
    questions: Question[],
    answers: Record<number, string | string[]>,
    totalAnswerChanges: number = 0
): { visual: number; auditory: number; readWrite: number; kinesthetic: number } {
    const accuracyOf = (pred: (q: Question) => boolean): number | null => {
        const qs = questions.filter(pred);
        if (qs.length === 0) return null;
        return qs.filter(q => isCorrect(q, answers[q.id])).length / qs.length;
    };

    const overallAcc = accuracyOf(() => true) ?? 0.5;
    const visualAcc = accuracyOf(q => q.category === 'visual') ?? overallAcc;
    const verbalAcc = accuracyOf(q => q.category === 'verbal') ?? overallAcc;
    const writtenAcc = accuracyOf(q => q.type === 'text') ?? overallAcc;
    const gkAcc = accuracyOf(q => q.category === 'gk') ?? overallAcc;
    const appliedAcc = accuracyOf(q => q.category === 'math' || q.category === 'logical') ?? overallAcc;
    const interactivity = Math.min(1, totalAnswerChanges / 8);

    const V = visualAcc;
    const R = 0.6 * writtenAcc + 0.4 * verbalAcc;
    const A = 0.6 * verbalAcc + 0.4 * gkAcc;
    const K = 0.7 * appliedAcc + 0.3 * interactivity;

    // Smooth (so no style ever shows 0%) and normalise to sum 1
    const base = 0.1;
    const raw = { visual: V + base, auditory: A + base, readWrite: R + base, kinesthetic: K + base };
    const sum = raw.visual + raw.auditory + raw.readWrite + raw.kinesthetic;
    return {
        visual: raw.visual / sum,
        auditory: raw.auditory / sum,
        readWrite: raw.readWrite / sum,
        kinesthetic: raw.kinesthetic / sum,
    };
}

/** Grades the whole test locally (no AI call needed). */
export function gradeTest(questions: Question[], answers: Record<number, string | string[]>): GradeSummary {
    let correct = 0;
    let objectiveCorrect = 0;
    let objectiveCount = 0;
    const perQuestion: Record<number, boolean> = {};
    questions.forEach(q => {
        const ok = isCorrect(q, answers[q.id]);
        perQuestion[q.id] = ok;
        if (ok) correct++;
        // Objectively-gradable = has a definite right answer (MCQ / factual text).
        // Open-ended reflection questions have no correctAnswer and are excluded
        // from the accuracy signal so a few thoughtful write-ups can't inflate it.
        if (q.correctAnswer) {
            objectiveCount++;
            if (ok) objectiveCorrect++;
        }
    });
    const graded = questions.length;
    return {
        correct,
        graded,
        accuracy: graded > 0 ? correct / graded : 0,
        // Fall back to the marks ratio only if a test somehow had no gradable items.
        objectiveAccuracy: objectiveCount > 0 ? objectiveCorrect / objectiveCount : (graded > 0 ? correct / graded : 0),
        objectiveCount,
        perQuestion,
    };
}
