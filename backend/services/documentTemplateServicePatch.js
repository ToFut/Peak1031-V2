// Patch for documentTemplateService.js to handle the broken template
// This adds preprocessing to fix the specific template issue

const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

/**
 * Preprocess DOCX content to fix known template issues
 */
function preprocessDocxContent(zip) {
  const files = Object.keys(zip.files);
  
  files.forEach(fileName => {
    if (fileName.endsWith('.xml') && !fileName.includes('rels')) {
      let content = zip.files[fileName].asText();
      let modified = false;
      
      // Fix the specific issue in header1.xml
      if (fileName === 'word/header1.xml') {
        // Look for the problematic pattern: E-#</w:t>...Matter.Number...#
        const problematicPattern = /<w:t>Exchange #: E-#<\/w:t><\/w:r>.*?<w:t>Matter\.Number<\/w:t><\/w:r>.*?<w:t>#<\/w:t>/s;
        
        if (problematicPattern.test(content)) {
          console.log(`🔧 Fixing unclosed tag in ${fileName}`);
          // Replace with a properly closed tag
          content = content.replace(problematicPattern, '<w:t>Exchange #: E-#Matter.Number#</w:t>');
          modified = true;
        }
      }
      
      // General fix: Look for orphaned # characters
      // This regex finds # followed by XML tags before the closing #
      const orphanedHashPattern = /#<\/w:t><\/w:r>(?!.*#)/g;
      if (orphanedHashPattern.test(content)) {
        console.log(`🔧 Fixing orphaned # in ${fileName}`);
        content = content.replace(orphanedHashPattern, '#PLACEHOLDER#</w:t></w:r>');
        modified = true;
      }
      
      if (modified) {
        zip.file(fileName, content);
      }
    }
  });
  
  return zip;
}

/**
 * Enhanced processDocxTemplate method
 */
async function processDocxTemplateEnhanced(fileData, data) {
  try {
    console.log('📄 Processing DOCX template with docxtemplater...');
    
    // Convert Blob to Buffer
    let buffer;
    if (fileData instanceof Blob) {
      console.log('📄 Converting Blob to Buffer...');
      const arrayBuffer = await fileData.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (fileData instanceof ArrayBuffer) {
      buffer = Buffer.from(fileData);
    } else {
      buffer = fileData;
    }
    
    // Create ZIP
    let zip;
    try {
      zip = new PizZip(buffer);
    } catch (zipError) {
      console.error('❌ Error creating PizZip:', zipError);
      throw new Error('Invalid DOCX file format');
    }
    
    // Preprocess to fix known issues
    console.log('🔄 Preprocessing template to fix known issues...');
    zip = preprocessDocxContent(zip);
    
    let doc;
    try {
      // Try with # delimiters first
      doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '#',
          end: '#'
        }
      });
    } catch (error) {
      if (error.message && error.message.includes('Unclosed tag')) {
        console.log('⚠️  Template still has unclosed tags, attempting alternative fix...');
        
        // Try converting to standard {} delimiters
        const files = Object.keys(zip.files);
        files.forEach(fileName => {
          if (fileName.endsWith('.xml') && !fileName.includes('rels')) {
            let content = zip.files[fileName].asText();
            // Convert #placeholder# to {placeholder}
            content = content.replace(/#([A-Za-z0-9_.]+)#/g, '{$1}');
            zip.file(fileName, content);
          }
        });
        
        // Try again with standard delimiters
        doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true
        });
      } else {
        throw error;
      }
    }
    
    // Set data and render
    doc.setData(data);
    doc.render();
    
    const outputBuffer = doc.getZip().generate({ 
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
    
    return {
      buffer: outputBuffer,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      filename: 'generated-document.docx'
    };
    
  } catch (error) {
    console.error('❌ Error processing DOCX template:', error);
    throw new Error(`Failed to process DOCX template: ${error.message}`);
  }
}

module.exports = {
  preprocessDocxContent,
  processDocxTemplateEnhanced
};