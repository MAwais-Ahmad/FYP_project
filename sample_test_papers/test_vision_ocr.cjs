const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testVisionOCR() {
  const imagePath = path.join(__dirname, 'sample_paper_camera_scan.png');
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64Image}`;

  console.log('Sending image to OpenAI gpt-4o-mini Vision for OCR text & paper extraction...');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe all text from this exam paper image accurately. Include all question text, marks, options, time limits, and correct answers.' },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '';
    console.log('=== VISION OCR EXTRACTED TEXT ===');
    console.log(text);
    console.log('=== END VISION OCR EXTRACTED TEXT ===');
  } catch (err) {
    console.error('Vision OCR Error:', err.message || err);
  }
}

testVisionOCR();
