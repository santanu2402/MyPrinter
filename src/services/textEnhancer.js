/**
 * Text Enhancer Service
 * Restructures, formats, and optimizes text for A4 document printing
 */

/**
 * Enhance raw text - clean up, structure, and format
 */
function enhanceText(rawText, options = {}) {
  const { preserveFormatting = false } = options;
  
  let text = rawText;
  
  if (!preserveFormatting) {
    // Clean up whitespace
    text = cleanWhitespace(text);
    
    // Fix common issues
    text = fixPunctuation(text);
    
    // Detect and format structure
    text = detectAndFormatStructure(text);
  }
  
  return {
    original: rawText,
    enhanced: text,
    stats: analyzeText(text),
  };
}

/**
 * Clean up whitespace issues
 */
function cleanWhitespace(text) {
  // Remove excessive blank lines (keep max 2)
  text = text.replace(/\n{4,}/g, '\n\n\n');
  
  // Remove trailing whitespace from lines
  text = text.replace(/[ \t]+$/gm, '');
  
  // Remove leading whitespace from lines (except indented lists)
  text = text.replace(/^[ \t]+(?![•\-\*\d])/gm, '');
  
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n');
  
  return text.trim();
}

/**
 * Fix common punctuation issues
 */
function fixPunctuation(text) {
  // Add space after period if missing (except in numbers like 3.14)
  text = text.replace(/\.(?=[A-Z])/g, '. ');
  
  // Fix double spaces
  text = text.replace(/ {2,}/g, ' ');
  
  // Ensure sentences start with capital letter after period
  text = text.replace(/\.\s+([a-z])/g, (match, letter) => `. ${letter.toUpperCase()}`);
  
  // Fix common issues
  text = text.replace(/\s+,/g, ',');
  text = text.replace(/\s+\./g, '.');
  text = text.replace(/\s+;/g, ';');
  text = text.replace(/\s+:/g, ':');
  
  return text;
}

/**
 * Detect structure in text (headings, lists, paragraphs)
 */
function detectAndFormatStructure(text) {
  const lines = text.split('\n');
  const structured = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Detect potential headings (short lines followed by longer content)
    if (line.length > 0 && line.length < 60 && !line.endsWith('.') && !line.endsWith(',')) {
      const nextLine = lines[i + 1] || '';
      if (nextLine.length > line.length * 2 || nextLine === '') {
        // Likely a heading - capitalize it
        if (line === line.toUpperCase() && line.length > 3) {
          // Already uppercase - title case it
          line = toTitleCase(line);
        }
      }
    }
    
    // Detect bullet points and normalize
    if (/^[\-\*•]\s/.test(line)) {
      line = line.replace(/^[\-\*•]\s+/, '• ');
    }
    
    // Detect numbered lists
    if (/^\d+[\.\)]\s/.test(line)) {
      // Keep as is, it's already a numbered list
    }
    
    structured.push(line);
  }
  
  return structured.join('\n');
}

/**
 * Convert to title case
 */
function toTitleCase(str) {
  const smallWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'in', 'of'];
  return str.toLowerCase().split(' ').map((word, index) => {
    if (index === 0 || !smallWords.includes(word)) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  }).join(' ');
}

/**
 * Analyze text for statistics
 */
function analyzeText(text) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const chars = text.length;
  
  return {
    characters: chars,
    words: words.length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
    estimatedReadingTime: Math.ceil(words.length / 200), // minutes
  };
}

/**
 * Split text into pages based on layout parameters
 */
function splitTextIntoPages(text, charsPerLine, linesPerPage) {
  const words = text.split(/(\s+)/);
  const pages = [];
  let currentPage = [];
  let currentLine = '';
  let lineCount = 0;
  
  for (const word of words) {
    if (word === '\n' || word === '\n\n') {
      currentPage.push(currentLine);
      currentLine = '';
      lineCount++;
      
      if (word === '\n\n') {
        currentPage.push(''); // blank line for paragraph break
        lineCount++;
      }
      
      if (lineCount >= linesPerPage) {
        pages.push(currentPage.join('\n'));
        currentPage = [];
        lineCount = 0;
      }
      continue;
    }
    
    if ((currentLine + word).length > charsPerLine) {
      currentPage.push(currentLine);
      currentLine = word.trimStart();
      lineCount++;
      
      if (lineCount >= linesPerPage) {
        pages.push(currentPage.join('\n'));
        currentPage = [];
        lineCount = 0;
      }
    } else {
      currentLine += word;
    }
  }
  
  if (currentLine) currentPage.push(currentLine);
  if (currentPage.length > 0) pages.push(currentPage.join('\n'));
  
  return pages;
}

module.exports = {
  enhanceText,
  analyzeText,
  splitTextIntoPages,
  cleanWhitespace,
  fixPunctuation,
  detectAndFormatStructure,
};
