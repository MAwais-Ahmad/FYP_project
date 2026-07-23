const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testEndpointLogic() {
  const imagePath = path.join(__dirname, 'sample_paper_camera_scan.png');
  const buffer = fs.readFileSync(imagePath);
  const base64 = buffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64}`;

  console.log('1. Extracting text from PNG image via Vision AI...');
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Transcribe all text from this exam paper image accurately. Retain all question headers, numbers, options, marks, time limits, and answer keys.' },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ],
    max_tokens: 4000,
  });

  const extractedText = response.choices[0]?.message?.content || '';
  console.log('--- EXTRACTED TEXT FROM IMAGE ---');
  console.log(extractedText);
  console.log('--- END EXTRACTED TEXT ---\n');

  console.log('2. Testing parse-paper prompt with extracted text...');
  const prompt = `You are an expert exam parser. The following text is an exam paper. Extract every question.

RULES:
- A question with multiple choices → type "mcq" with options ["A) …","B) …","C) …","D) …"]. Include "correctAnswer" letter if an answer key is present, else "".
- A question asking for a brief written/explanatory answer (no choices) → type "short" with NO options. Add 2-3 "keyPoints" capturing what a correct answer should mention.
- A question asking for an extended explanation → type "long" with NO options. Add 4-6 "keyPoints".
- If marks are specified per question (e.g. "[Marks: 2]"), use that value. Otherwise default to 1 for MCQ, 3 for short, 6 for long.
- Calculate totalMarks from all questions.

Respond ONLY with valid JSON:
{
  "examTitle": "Parsed Exam Paper",
  "totalMarks": 20,
  "questions": []
}

EXAM PAPER TEXT:
${extractedText}`;

  const parseResp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  console.log('=== PARSED EXAM JSON RESULT ===');
  console.log(JSON.stringify(JSON.parse(parseResp.choices[0]?.message?.content || '{}'), null, 2));
  console.log('=== END PARSED EXAM JSON RESULT ===');
}

testEndpointLogic();
