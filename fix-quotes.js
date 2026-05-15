const fs = require('fs');

let content = fs.readFileSync('decks.js', 'utf-8');

// Replace smart/curly quotes with straight quotes
content = content.replace(/"/g, '"');
content = content.replace(/"/g, '"');
content = content.replace(/'/g, "'");
content = content.replace(/'/g, "'");

fs.writeFileSync('decks.js', content);
console.log('✅ Fixed all smart quotes in decks.js!');
