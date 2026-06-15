require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = 'gpt-4o-mini';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

let totalTokensUsed = 0;

// ─── SCENARIO FORMATS (not just budget allocation!) ──────────────────────────
const scenarioFormats = [
  {
    format: 'budget_allocation',
    prompt: 'A situation where limited money/resources must be split among competing needs. Include specific amounts in PKR, stakeholders with names, and requests that total 25-40% more than the budget.',
  },
  {
    format: 'ethical_dilemma',
    prompt: 'A moral/ethical situation with no clear right answer — e.g., catching a friend cheating, a workplace honesty issue, choosing between loyalty and integrity. Present 2-3 conflicting values the student must weigh.',
  },
  {
    format: 'crisis_management',
    prompt: 'An event or project going wrong mid-way — e.g., a college event falling apart, a group project teammate disappearing before deadline, a tech failure during a presentation. Student must make rapid recovery decisions.',
  },
  {
    format: 'team_conflict',
    prompt: 'A disagreement between people the student cares about — e.g., two friends in a fight asking them to pick a side, teammates with opposing ideas, family members disagreeing on an important decision. Focus on diplomacy and relationship management.',
  },
  {
    format: 'tradeoff_analysis',
    prompt: 'A situation with 4-5 options where each has clear pros and cons — e.g., choosing between internship offers, picking a university, deciding how to spend a gap year. No money involved, just competing priorities and values.',
  },
  {
    format: 'time_management',
    prompt: 'An overwhelming week where too many commitments overlap — exams, family event, friend needs help, personal project deadline, health issue. Student must prioritize and some things WILL be dropped. Focus on what they sacrifice and why.',
  },
];

// ─── DIFFICULTY LEVEL DESCRIPTIONS ───────────────────────────────────────────
function getDifficultyPrompt(level) {
  if (level <= 3) {
    return `DIFFICULTY: EASY (Level ${level}/10)
    - 3-4 stakeholders/options (fewer decisions)
    - Clear information, no hidden details
    - One option is subtly better than others
    - Familiar everyday situations (college, friends, family)
    - Generous time context, low pressure`;
  }
  if (level <= 6) {
    return `DIFFICULTY: MEDIUM (Level ${level}/10)
    - 4-5 stakeholders/options
    - Some ambiguous information
    - No obviously correct answer
    - Moderate time pressure
    - Requires balancing multiple factors`;
  }
  if (level <= 8) {
    return `DIFFICULTY: HARD (Level ${level}/10)
    - 5-6 stakeholders/options with competing needs
    - Conflicting or incomplete information
    - Hidden constraints that emerge mid-scenario
    - Real time pressure
    - Requires creative thinking and trade-offs`;
  }
  return `DIFFICULTY: EXPERT (Level ${level}/10)
    - 6-7 stakeholders/options with layered conflicts
    - Deliberately misleading or contradictory information
    - Multiple hidden constraints
    - High-stakes consequences for wrong decisions
    - Requires systems thinking and strong justification`;
}

// ─── ADAPTIVE DIFFICULTY CONTEXT ─────────────────────────────────────────────
function getAdaptiveContext(difficultySignal, scenarioNumber) {
  if (!difficultySignal || scenarioNumber === 1) return '';

  const map = {
    harder: `\nADAPTIVE NOTE: Student performed WELL in Scenario ${scenarioNumber - 1}. Push harder — more variables, more ambiguity, tighter time pressure.`,
    easier: `\nADAPTIVE NOTE: Student STRUGGLED in Scenario ${scenarioNumber - 1}. Make this more structured — clearer options, less ambiguity, more guidance in hints.`,
    consistency_test: `\nADAPTIVE NOTE: Student showed MIXED patterns. Use a completely different domain to test if they apply consistent decision-making principles.`,
  };

  return map[difficultySignal] || '';
}

// ─── GENERATE SCENARIO + QUESTIONS ───────────────────────────────────────────
app.post('/api/generate-scenario', async (req, res) => {
  try {
    const { difficultySignal, scenarioNumber = 1, difficultyLevel = 5, previousThemes = [] } = req.body;

    const randomFormat = scenarioFormats[Math.floor(Math.random() * scenarioFormats.length)];
    const difficultyPrompt = getDifficultyPrompt(difficultyLevel);
    const adaptiveContext = getAdaptiveContext(difficultySignal, scenarioNumber);

    const diversityPrompt = previousThemes.length > 0 
      ? `\nCRITICAL DIVERSITY RULE: Do NOT use any of these previous themes or contexts: [${previousThemes.join(', ')}]. Pick a completely different industry, setting, or context to keep the user engaged.` 
      : '';

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a creative educational assessment designer for Pakistani university students (age 18-25).
You design real-world decision-making scenarios that reveal HOW students think — not what they know.
Every scenario must feel like something a real uni student in Pakistan could face TODAY.
Use names, places, and situations familiar to Pakistani culture (e.g., chai dhabas, semester exams, hostel life, family expectations, freelancing on Fiverr/Upwork, cricket matches, Daewoo bus trips).
Return ONLY valid JSON — no markdown, no backticks, no extra text.`,
        },
        {
          role: 'user',
          content: `Generate Scenario ${scenarioNumber} for a behavioral learning assessment.

FORMAT: ${randomFormat.format}
DESCRIPTION: ${randomFormat.prompt}

${difficultyPrompt}
${adaptiveContext}
${diversityPrompt}

TARGET AUDIENCE: Pakistani university students aged 18-25. Use relatable contexts — hostel life, group projects, family pressure, career decisions, social media, freelancing, campus politics, relationships, financial stress.

IMPORTANT RULES:
1. Create a SPECIFIC, vivid story with names, details, and emotional stakes
2. ALL questions must reference THIS specific story — no generic questions
3. Mix question types creatively across the 4 phases
4. The scenario should test decision-making ability, NOT academic knowledge
5. Make it feel REAL, not like a textbook exercise
6. Use Pakistani Rupees (Rs.) for any money amounts
7. Include cultural nuances where relevant (family expectations, social pressure, izzat/reputation)
8. Set timeLimit (in seconds) DYNAMICALLY based on each question's complexity:
   - Simple MCQs: 30-60s
   - Text analysis / short answer: 60-120s  
   - Multi-text planning (3 approaches): 90-180s
   - Urgent twist decisions: 30-45s
   - Reflection: 0 (unlimited)
9. Set totalTimeLimit for the entire scenario = sum of all question timeLimits + 30% buffer, rounded to nearest 30s

Return this JSON structure:
{
  "scenario": {
    "title": "[emoji] [Creative 4-6 word title]",
    "description": "[3-4 vivid sentences setting the scene. Make it feel urgent and personal.]",
    "context_details": "[Key facts: names, numbers, deadlines — bullet-point style]",
    "constraint": "[The core tension or impossible choice in one sentence]",
    "urgency": "[Why this can't wait — specific deadline or consequence]",
    "totalTimeLimit": "[Total seconds for the entire scenario — sum of all question times + 30% buffer, rounded to nearest 30]"
  },
  "questions": [
    {
      "id": 1,
      "phase": 1,
      "phaseName": "Understanding",
      "type": "text",
      "timeLimit": "[DYNAMIC: 60-120s based on complexity]",
      "question": "[Reference SPECIFIC scenario details. Ask them to identify the core problem.]",
      "hint": "[Helpful nudge using actual names/details from the scenario]"
    },
    {
      "id": 2,
      "phase": 1,
      "phaseName": "Understanding",
      "type": "mcq",
      "timeLimit": "[DYNAMIC: 30-60s based on complexity]",
      "question": "[Scenario-specific MCQ about what matters most here]",
      "options": ["[Option referencing scenario detail A]", "[Option B]", "[Option C]", "[Option D]"]
    },
    {
      "id": 3,
      "phase": 2,
      "phaseName": "Planning",
      "type": "multi-text",
      "timeLimit": "[DYNAMIC: 90-180s based on complexity]",
      "question": "[Ask for 3 different approaches to handle THIS specific situation]",
      "hint": "[Creative hint relevant to this scenario]"
    },
    {
      "id": 4,
      "phase": 2,
      "phaseName": "Planning",
      "type": "ranking",
      "timeLimit": "[DYNAMIC: 60-90s based on complexity]",
      "question": "[Rank their 3 approaches — reference scenario stakes]",
      "hint": "[What should they optimize for in this context?]"
    },
    {
      "id": 5,
      "phase": 3,
      "phaseName": "Execution",
      "type": "mcq-urgent",
      "timeLimit": "[DYNAMIC: 30-45s — keep it tight for urgency]",
      "urgentUpdate": "🚨 [A sudden twist UNIQUE to this story — new info, deadline change, someone's reaction]",
      "question": "[Quick decision about this twist]",
      "options": ["[Immediate action]", "[Cautious approach]", "[Stick to plan]", "[Creative alternative]"]
    },
    {
      "id": 6,
      "phase": 3,
      "phaseName": "Execution",
      "type": "text",
      "timeLimit": "[DYNAMIC: 60-120s based on complexity]",
      "context": "[Describe the aftermath — who's upset, what went wrong/right]",
      "question": "[How would you handle this specific person's reaction?]"
    },
    {
      "id": 7,
      "phase": 4,
      "phaseName": "Reflection",
      "type": "reflection",
      "timeLimit": 0,
      "question": "Looking back at everything in this scenario: (1) Rate your confidence 1-10. (2) What would you do differently?"
    }
  ]
}`,
        },
      ],
      temperature: 0.92,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    });

    const data = JSON.parse(completion.choices[0].message.content);

    // Ensure totalTimeLimit is a number
    if (data.scenario && typeof data.scenario.totalTimeLimit === 'string') {
      data.scenario.totalTimeLimit = parseInt(data.scenario.totalTimeLimit) || 600;
    }

    totalTokensUsed += completion.usage.total_tokens;
    const estimatedCost = (completion.usage.prompt_tokens * 0.00000015) + (completion.usage.completion_tokens * 0.0000006);

    console.log(
      `✅ S${scenarioNumber} | ${randomFormat.format} | Lvl ${difficultyLevel} | ${difficultySignal || 'standard'} | ${completion.usage.total_tokens} tokens | ~$${estimatedCost.toFixed(4)}`
    );

    res.json({
      success: true,
      scenario: data.scenario,
      questions: data.questions,
      format: randomFormat.format,
      usage: { tokens: completion.usage.total_tokens, estimatedCost },
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to generate scenario', message: error.message });
  }
});

// ─── EVALUATE SCENARIO (Accuracy & Cognitive Features) ─────────────────────────
app.post('/api/evaluate-scenario', async (req, res) => {
  try {
    const { scenario, questions, answers } = req.body;

    console.log('📬 [API] Received scenario title:', scenario?.title);
    console.log('📬 [API] Received answers:', JSON.stringify(answers));

    // Fast-fail for empty or severely incomplete answers
    const answeredCount = Object.keys(answers || {}).filter(k => {
      const ans = answers[k];
      if (Array.isArray(ans)) return ans.length > 0;
      return ans && ans.trim().length > 0;
    }).length;

    console.log('📬 [API] Calculated answeredCount:', answeredCount);

    if (!answers || answeredCount < 2) {
      console.log('⚠️ Insufficient answers for evaluation. Using penalty defaults.');
      return res.json({
        success: true,
        evaluation: {
          accuracy_score: 0.1,
          cognitive_features: {
            reflection_depth: 0.1,
            self_awareness: 0.1,
            learning_orientation: 0.1,
            creativity_score: 0.1,
            insights: ['Student skipped most questions or provided empty answers.'],
          }
        },
        usage: { tokens: 0, estimatedCost: 0 },
      });
    }

    // Format the inputs cleanly for GPT
    const formattedQuestionsAndAnswers = questions.map(q => {
      let studentAnswer = answers[q.id];
      if (Array.isArray(studentAnswer)) studentAnswer = studentAnswer.join(' | ');
      if (!studentAnswer || studentAnswer.trim() === '') studentAnswer = '[NO ANSWER PROVIDED]';
      return `Q${q.id} (${q.type}): ${q.question}\nStudent Answer: ${studentAnswer}`;
    }).join('\n\n');

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert behavioral assessor. You evaluate a student's performance on a decision-making scenario.
You will receive the scenario context, the questions asked, and the student's answers.

1. "accuracy_score" (0.0 to 1.0): Evaluate how pragmatic, logical, and effective their decisions were given the scenario constraints (e.g., budget, time, relationships). Did they make good choices?
2. "cognitive_features" (0.0 to 1.0 each):
   - reflection_depth: Did they think deeply and justify their reasoning?
   - self_awareness: Did they recognize their own biases, mistakes, or limitations in the final reflection?
   - learning_orientation: Do they show a desire to improve or learn from the outcome?
   - creativity_score: Did they propose novel, out-of-the-box solutions?
3. "insights": Provide 2-3 brief observations about their decision-making style.

Handle gibberish or nonsensical answers by assigning very low scores (0.1).
Return ONLY valid JSON.`
        },
        {
          role: 'user',
          content: `SCENARIO:
Title: ${scenario.title}
Description: ${scenario.description}
Constraint: ${scenario.constraint}

QUESTIONS & STUDENT ANSWERS:
${formattedQuestionsAndAnswers}

Return JSON format:
{
  "accuracy_score": 0.0-1.0,
  "cognitive_features": {
    "reflection_depth": 0.0-1.0,
    "self_awareness": 0.0-1.0,
    "learning_orientation": 0.0-1.0,
    "creativity_score": 0.0-1.0,
    "insights": ["obs 1", "obs 2"]
  }
}`
        }
      ],
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const evaluation = JSON.parse(completion.choices[0].message.content);
    totalTokensUsed += completion.usage.total_tokens;
    const estimatedCost = (completion.usage.prompt_tokens * 0.00000015) + (completion.usage.completion_tokens * 0.0000006);

    console.log(`🧠 Evaluation | Acc: ${evaluation.accuracy_score} | ${completion.usage.total_tokens} tokens | ~$${estimatedCost.toFixed(4)}`);
    res.json({ success: true, evaluation, usage: { tokens: completion.usage.total_tokens, estimatedCost } });

  } catch (error) {
    console.error('❌ Evaluation error:', error.message);
    res.json({
      success: true,
      evaluation: {
        accuracy_score: 0.3,
        cognitive_features: {
          reflection_depth: 0.3, self_awareness: 0.3,
          learning_orientation: 0.3, creativity_score: 0.3,
          insights: ['Analysis unavailable due to an error — default penalty applied'],
        }
      },
      usage: { tokens: 0, estimatedCost: 0 },
    });
  }
});

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: MODEL,
    totalTokensUsed,
    scenarioFormats: scenarioFormats.map(f => f.format),
    features: ['gpt-4o-mini', '6-scenario-formats', 'difficulty-1-10', 'adaptive', 'age-18-25'],
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AITA Server on http://localhost:${PORT}`);
  console.log(`🤖 Model: ${MODEL}`);
  console.log(`🎲 ${scenarioFormats.length} scenario formats: ${scenarioFormats.map(f => f.format).join(', ')}`);
  console.log(`🔑 API key: ${process.env.OPENAI_API_KEY ? '✅' : '❌ MISSING'}`);
});
