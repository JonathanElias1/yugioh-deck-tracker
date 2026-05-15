const fs = require('fs');

let content = fs.readFileSync('decks.js', 'utf-8');

// Fix the specific problematic patterns by escaping inner quotes
const fixes = [
  // Change quoted words within strings to use single quotes instead
  { from: /"([^"]*)"([^"]*)"([^"]*)"([^"]*)"/, to: (match, p1, p2, p3, p4) => `"${p1}'${p2}'${p3}'${p4}"` }
];

// Split into lines and process each
const lines = content.split('\n');
const fixed = lines.map((line, index) => {
  // If line contains strategy: with nested quotes
  if (line.includes('strategy:') && line.includes('"')) {
    // Count quotes
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount > 2) {
      // Has nested quotes - need to escape them
      // Match pattern: strategy: "text "inner" text",
      line = line.replace(/strategy: "([^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3) => {
        return `strategy: "${p1}'${p2}'${p3}"`;
      });
      // Handle more complex cases with multiple nested quotes
      let quoteCounter = 0;
      let result = '';
      let inString = false;
      let isStrategyLine = line.trim().startsWith('strategy:');

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && isStrategyLine && i > line.indexOf(':') + 1) {
          quoteCounter++;
          if (quoteCounter === 1) {
            // First quote - start of string
            result += char;
            inString = true;
          } else if (quoteCounter === 2 && inString && (i === line.length - 1 || line[i + 1] === ',')) {
            // Last quote - end of string
            result += char;
            inString = false;
          } else {
            // Middle quotes - replace with single quote
            result += "'";
          }
        } else {
          result += char;
        }
      }
      return result;
    }
  }
  return line;
});

fs.writeFileSync('decks.js', fixed.join('\n'));
console.log('✅ Fixed nested quotes in decks.js!');
