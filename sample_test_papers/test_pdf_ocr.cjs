const fs = require('fs');
const path = require('path');
const officeParser = require('officeparser');
const { PDFParse } = require('pdf-parse');

async function testPdfOCR() {
  const pdfPath = path.join(__dirname, 'sample_paper_camera_scan.pdf');
  const buffer = fs.readFileSync(pdfPath);

  console.log('1. Trying fast text-layer extraction with pdf-parse...');
  let text = '';
  try {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    text = data.text || '';
    await parser.destroy();
  } catch (err) {
    console.log('pdf-parse failed:', err.message);
  }
  console.log('Fast path extracted length:', text.trim().length, 'chars');

  if (text.trim().length < 40) {
    console.log('2. Text length < 40 chars! Triggering officeParser OCR fallback on scanned image PDF...');
    try {
      const ast = await officeParser.parseOffice(buffer, { ocr: true, fileType: 'pdf' });
      text = ast ? ast.toText() : '';
      console.log('--- OCR EXTRACTED TEXT ---');
      console.log(text || '[NO TEXT EXTRACTED]');
      console.log('--- END OCR EXTRACTED TEXT ---');
      console.log('Extracted character count:', text.length);
    } catch (err) {
      console.error('officeParser OCR error:', err.message || err);
    }
  }
}

testPdfOCR();
