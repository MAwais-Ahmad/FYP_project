const fs = require('fs');
const path = require('path');
const officeParser = require('officeparser');

async function testImageOCR() {
  const imagePath = path.join(__dirname, 'sample_paper_camera_scan.png');
  const buffer = fs.readFileSync(imagePath);

  console.log('Testing officeParser.parseOffice with OCR on image PNG...');
  try {
    const ast = await officeParser.parseOffice(buffer, { ocr: true, fileType: 'png' });
    const text = ast ? ast.toText() : '';
    console.log('--- EXTRACTED TEXT FROM IMAGE ---');
    console.log(text || '[NO TEXT EXTRACTED]');
    console.log('--- END EXTRACTED TEXT ---');
    console.log('Character count:', text.length);
  } catch (err) {
    console.error('Error during image OCR test:', err.message || err);
  }
}

testImageOCR();
