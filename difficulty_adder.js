const fs = require('fs');
const path = require('path');

// A tananyag JSON fájlok mappája
const TANANYAG_DIR = path.join(__dirname, 'backend', 'data', 'tananyag');

// A slug fájl, amit a gyökérbe írunk
const SLUG_FILE = path.join(__dirname, 'slugs.txt');

// Ellenőrizzük, hogy a mappa létezik-e
if (!fs.existsSync(TANANYAG_DIR)) {
  console.error(`A mappa nem található: ${TANANYAG_DIR}`);
  process.exit(1);
}

// Beolvassuk a tananyag fájlokat
const files = fs.readdirSync(TANANYAG_DIR).filter(f => f.endsWith('.json'));

// Slugok tárolására
const slugs = [];

files.forEach(file => {
  const filePath = path.join(TANANYAG_DIR, file);
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const jsonData = JSON.parse(rawData);

  // Ellenőrizzük, hogy van-e questions tömb
  if (jsonData.questions && Array.isArray(jsonData.questions)) {
    jsonData.questions.forEach(q => {
      // Ha még nincs difficulty mező, adjuk hozzá
      if (!q.difficulty) {
        q.difficulty = 'Easy'; // alapértelmezett szint
      }
    });

    // Mentjük vissza a JSON fájlt
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
  }

  // Slug generálás: a link, vagy a title alapján
  if (jsonData.toolData && jsonData.toolData.sections) {
    jsonData.toolData.sections.forEach(section => {
      if (section.cards && Array.isArray(section.cards)) {
        section.cards.forEach(card => {
          if (card.link && !slugs.includes(card.link)) {
            slugs.push(card.link);
          }
        });
      }
    });
  }
});

// Slugokat kiírjuk a gyökérbe
fs.writeFileSync(SLUG_FILE, slugs.join('\n'), 'utf-8');

console.log(`Kész! ${files.length} fájl feldolgozva, ${slugs.length} slug generálva.`);
