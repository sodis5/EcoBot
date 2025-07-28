const fs = require('fs');
const path = require('path');

const inputDir = path.join(__dirname, 'data/questions/OpenTriviaQA');
const outputFile = path.join(__dirname, 'data/questions/openTriviaQuestions.json');

const all = [];

fs.readdirSync(inputDir).forEach(file => {
  const lines = fs.readFileSync(path.join(inputDir, file), 'utf8').split('\n');
  let q = null, a = null;
  lines.forEach(line => {
    if (line.startsWith('#Q ')) q = line.slice(3).trim();
    else if (line.startsWith('^ ')) {
      a = line.slice(2).trim();
      if (q && a) {
        all.push({
          question: q,
          answer: a,
          difficulty: "medium",
          category: file.replace(".txt", "")
        });
        q = null;
        a = null;
      }
    }
  });
});

fs.writeFileSync(outputFile, JSON.stringify(all, null, 2));
console.log(`✅ Converted ${all.length} questions to ${outputFile}`);