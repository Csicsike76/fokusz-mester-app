const fs = require('fs');
const path = require('path');

const quizzesDirectory = path.join(__dirname, 'data', 'quizzes');


fs.readdir(quizzesDirectory, (err, files) => {
  if (err) {
    console.error('Nem tudom beolvasni a könyvtárat:', err);
    return;
  }

  files
    .filter(file => file.endsWith('.json'))
    .forEach(file => {
      const filePath = path.join(quizzesDirectory, file);
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        let data = JSON.parse(raw);

        if (!data.title) data.title = path.parse(file).name;
        if (!data.subject) data.subject = 'ismeretlen';
        if (!data.grade) data.grade = 0;
        if (!data.category) data.category = 'free';
        if (!Array.isArray(data.questions)) data.questions = [];

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✔️ Javítva: ${file}`);
      } catch (e) {
        console.error(`❌ Hiba a(z) ${file} fájlban: ${e.message}`);
      }
    });
});
