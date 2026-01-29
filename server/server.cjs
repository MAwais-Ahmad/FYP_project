require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI with API key from .env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Cost tracking
let totalTokensUsed = 0;

/**
 * 10+ DIVERSE SCENARIO TYPES - Randomized for each quiz
 */
const scenarioTypes = [
  {
    type: "startup_funding",
    context: "You're a co-founder of a tech startup that just got Rs. 10 lakhs seed funding. 4 departments need money.",
    example: "Engineering team, Marketing, Product design, Legal/Admin"
  },
  {
    type: "charity_fundraiser",
    context: "You organized a charity event that raised Rs. 5 lakhs. 5 NGOs are requesting funds for different causes.",
    example: "Education for underprivileged, Medical camps, Animal shelter, Clean water project, Women empowerment"
  },
  {
    type: "family_vacation",
    context: "Your family saved Rs. 2 lakhs for vacation. Everyone wants to go somewhere different with different budgets.",
    example: "Beach resort, Mountain trekking, City sightseeing, Amusement park, Historical tour"
  },
  {
    type: "sports_tournament",
    context: "You're captain of your college sports committee. Got Rs. 3 lakhs sponsorship for multiple sports teams.",
    example: "Cricket, Football, Basketball, Badminton, Athletics"
  },
  {
    type: "hostel_renovation",
    context: "Your college hostel got Rs. 8 lakhs for improvements. Students want different upgrades.",
    example: "WiFi upgrade, Common room furniture, Kitchen equipment, Study room, Recreation area"
  },
  {
    type: "community_project",
    context: "Your neighborhood raised Rs. 4 lakhs. Residents want different community improvements.",
    example: "Park renovation, Street lights, Community center, Kids playground, Security systems"
  },
  {
    type: "wedding_budget",
    context: "You're helping plan your sibling's wedding with Rs. 15 lakhs budget. Multiple vendors need payment.",
    example: "Venue, Catering, Photography, Decoration, Entertainment"
  },
  {
    type: "college_fest",
    context: "You're organizing college annual fest with Rs. 6 lakhs budget. Different committees need funding.",
    example: "Stage/Sound, Celebrity performance, Food stalls, Marketing, Prizes"
  },
  {
    type: "department_equipment",
    context: "Your department got Rs. 12 lakhs for equipment. Different labs and facilities need upgrades.",
    example: "Computer lab, Chemistry lab, Library, Workshop, Audio-visual room"
  },
  {
    type: "hackathon_organization",
    context: "You're organizing a hackathon with Rs. 5 lakhs sponsorship. Need to allocate for various needs.",
    example: "Prize money, Venue, Food, Mentors, Marketing"
  },
  {
    type: "freelance_project",
    context: "You got a Rs. 3 lakh freelance project. Need to hire people and manage costs.",
    example: "Designer, Developer, Content writer, Marketing, Your profit margin"
  },
  {
    type: "small_business",
    context: "You're starting a small business with Rs. 7 lakhs. Need to allocate for different business needs.",
    example: "Inventory, Shop rent, Marketing, Staff salaries, Emergency fund"
  }
];

/**
 * GENERATE UNIQUE SCENARIO + QUESTIONS - RANDOMIZED EACH TIME
 */
app.post('/api/generate-scenario', async (req, res) => {
  try {
    // Pick random scenario type
    const randomScenario = scenarioTypes[Math.floor(Math.random() * scenarioTypes.length)];

    // Random question variations (so even same scenario type has different questions)
    const questionVariations = Math.floor(Math.random() * 3); // 0, 1, or 2

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an educational assessment designer creating UNIQUE decision-making scenarios. Return ONLY valid JSON, no markdown or backticks."
        },
        {
          role: "user",
          content: `Create a ${randomScenario.type} decision-making scenario.

Context: ${randomScenario.context}
Example stakeholders: ${randomScenario.example}

IMPORTANT RULES:
1. Create UNIQUE amounts and names (NOT exactly matching the example)
2. Make the scenario realistic for 18-25 year olds
3. Total requests should exceed budget by 20-40%
4. Use Indian Rupees (Rs. or ₹)
5. Variation mode: ${questionVariations} (vary question phrasing slightly)

Return JSON with EXACT structure:
{
  "scenario": {
    "title": "🎯 [Creative title with emoji]",
    "description": "[2-3 sentences describing situation]",
    "budget": "Rs. X",
    "stakeholders": [
      {"name": "...", "request": "Rs. X", "purpose": "..."},
      {"name": "...", "request": "Rs. X", "purpose": "..."},
      {"name": "...", "request": "Rs. X", "purpose": "..."},
      {"name": "...", "request": "Rs. X", "purpose": "..."},
      {"name": "...", "request": "Rs. X", "purpose": "..."}
    ],
    "constraint": "Total requests = Rs. X (Rs. X over budget!)",
    "urgency": "[Time pressure statement]"
  },
  "questions": [
    {
      "id": 1,
      "phase": 1,
      "phaseName": "Understanding",
      "type": "text",
      "timeLimit": 90,
      "question": "${questionVariations === 0 ? 'What is the core problem you need to solve? Explain what makes this decision difficult.' : questionVariations === 1 ? 'Describe the main challenge in this scenario. What are the key factors making this decision complex?' : 'In your own words, what is the primary issue you are facing? Why is this situation challenging?'}",
      "hint": "Think about: constraints, stakeholder needs, trade-offs"
    },
        {
          "id": 2,
          "phase": 1,
          "phaseName": "Understanding",
          "type": "mcq",
          "timeLimit": 60,
          "question": "${questionVariations === 0 ? 'Which information is MOST critical for making a good decision here?' : questionVariations === 1 ? 'What data would help you make the best choice?' : 'Which factor should you prioritize when deciding?'}",
          "options": [
            "${questionVariations === 0 ? 'Past spending patterns and outcomes' : 'Historical data on similar situations'}",
            "${questionVariations === 1 ? 'Stakeholder urgency levels' : 'Who needs the resources most urgently'}",
            "${questionVariations === 2 ? 'Personal relationships with stakeholders' : 'Which stakeholders you know best'}",
            "The order in which requests were submitted"
          ]
        },
        {
          "id": 3,
          "phase": 2,
          "phaseName": "Planning",
          "type": "multi-text",
          "timeLimit": 120,
          "question": "${questionVariations === 0 ? 'Propose THREE different strategies to handle this resource shortage. Be specific!' : questionVariations === 1 ? 'List 3 different approaches you could take to solve this problem.' : 'What are 3 possible solutions? Think creatively!'}",
          "hint": "Consider: cutting costs, raising more funds, phased allocation, priority-based distribution"
        },
        {
          "id": 4,
          "phase": 2,
          "phaseName": "Planning",
          "type": "ranking",
          "timeLimit": 90,
          "question": "${questionVariations === 0 ? 'Now rank your 3 solutions from BEST to WORST. Explain your ranking.' : questionVariations === 1 ? 'Which solution is best? Rank all 3 and justify your choice.' : 'Order your solutions by effectiveness. Why this order?'}",
          "hint": "Think about: fairness, practicality, long-term impact"
        },
        {
          "id": 5,
          "phase": 3,
          "phaseName": "Execution",
          "type": "mcq-urgent",
          "timeLimit": 45,
          "urgentUpdate": "🚨 BREAKING: One stakeholder found a 30-40% discount option!",
          "question": "${questionVariations === 0 ? 'You have 45 seconds. What do you do?' : questionVariations === 1 ? 'Quick decision needed! How do you respond?' : 'Time pressure! Your immediate action?'}",
          "options": [
            "Accept immediately - reallocate saved money",
            "Verify quality before accepting the discount",
            "Stick to original plan - avoid complications",
            "Ask all stakeholders to find similar discounts"
          ]
        },
        {
          "id": 6,
          "phase": 3,
          "phaseName": "Execution",
          "type": "text",
          "timeLimit": 0,
          "context": "After your final allocation, one stakeholder is very disappointed with their amount.",
          "question": "${questionVariations === 0 ? 'How would you explain your decision to them with empathy while maintaining your reasoning?' : questionVariations === 1 ? 'Write what you would tell the unhappy stakeholder to help them understand.' : 'You need to have a difficult conversation. What would you say?'}",
          "hint": "Balance empathy with logic"
        },
        {
          "id": 7,
          "phase": 4,
          "phaseName": "Reflection",
          "type": "reflection",
          "timeLimit": 0,
          "question": "${questionVariations === 0 ? 'Looking back at your entire decision-making process: (1) Rate your confidence 1-10, (2) What would you do differently?' : questionVariations === 1 ? 'Reflect on your approach: (1) How confident are you? (2) What would you improve?' : 'Think about your journey: (1) Confidence rating? (2) What to change next time?'}"
        }
      ]
    }

Make it UNIQUE and realistic!`
        }
      ],
      temperature: 0.9, // Higher temperature for more variety
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const data = JSON.parse(completion.choices[0].message.content);

    totalTokensUsed += completion.usage.total_tokens;
    const estimatedCost = (completion.usage.total_tokens / 1000) * 0.002;

    console.log(`✅ Quiz generated(${randomScenario.type}) | Tokens: ${completion.usage.total_tokens} | Cost: ~$${estimatedCost.toFixed(4)}`);

    res.json({
      success: true,
      scenario: data.scenario,
      questions: data.questions,
      usage: {
        tokens: completion.usage.total_tokens,
        estimatedCost: estimatedCost
      }
    });

  } catch (error) {
    console.error('❌ Error generating scenario:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate scenario',
      message: error.message
    });
  }
});


/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: 'gpt-3.5-turbo',
    totalTokensUsed: totalTokensUsed,
    estimatedCost: `$${(totalTokensUsed / 1000 * 0.002).toFixed(4)}`,
    scenarioTypes: scenarioTypes.length
  });
});

/**
 * Analyze reflection response using GPT
 * Extracts cognitive features from the student's final reflection (Q7)
 */
app.post('/api/analyze-reflection', async (req, res) => {
  try {
    const { reflectionText, confidenceRating, scenario } = req.body;

    if (!reflectionText || reflectionText.trim().length < 10) {
      return res.json({
        success: true,
        analysis: {
          reflection_depth: 0.3,
          self_awareness: 0.3,
          learning_orientation: 0.3,
          creativity_score: 0.3,
          insights: ["Response too short for detailed analysis"]
        },
        usage: { tokens: 0, estimatedCost: 0 }
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Analyze student reflection.Return JSON with scores 0.0 - 1.0:
  {
    "reflection_depth": 0.0 - 1.0(how deeply they thought about their process),
      "self_awareness": 0.0 - 1.0(do they acknowledge strengths AND weaknesses),
  "learning_orientation": 0.0 - 1.0(focus on growth and improvement),
    "creativity_score": 0.0 - 1.0(unconventional or creative thinking),
      "insights": ["2-3 short observations about their thinking style"]
}`
        },
        {
          role: "user",
          content: `Confidence rating: ${confidenceRating}/10
Reflection text: "${reflectionText}"
Analyze this and provide cognitive feature scores.`
        }
      ],
      temperature: 0.3,
      max_tokens: 250,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    totalTokensUsed += completion.usage.total_tokens;
    const estimatedCost = (completion.usage.total_tokens / 1000) * 0.002;

    console.log(`🧠 Reflection analyzed | Tokens: ${completion.usage.total_tokens} | Cost: ~$${estimatedCost.toFixed(4)} `);

    res.json({
      success: true,
      analysis: analysis,
      usage: {
        tokens: completion.usage.total_tokens,
        estimatedCost: estimatedCost
      }
    });

  } catch (error) {
    console.error('❌ Error analyzing reflection:', error.message);
    res.json({
      success: true,
      analysis: {
        reflection_depth: 0.5,
        self_awareness: 0.5,
        learning_orientation: 0.5,
        creativity_score: 0.5,
        insights: ["Analysis unavailable - using default values"]
      },
      usage: { tokens: 0, estimatedCost: 0 }
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`💰 Using GPT-3.5-turbo (most cost-efficient)`);
  console.log(`🎲 ${scenarioTypes.length} unique scenario types available`);
  console.log(`🔒 API key loaded: ${process.env.OPENAI_API_KEY ? '✅' : '❌'}`);
});
