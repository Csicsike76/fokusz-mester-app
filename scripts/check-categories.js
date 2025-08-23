require('dotenv').config();
const path = require('path');
const fs = require('fs');

const allowedCategories = [
  'free_lesson','free_tool','premium_course','premium_tool',
  'lesson','practice','exam','workshop','premium_lesson','hub_page'
];

function readJsonFolder(folderAbsPath) {
  if (!fs.existsSync(folderAbsPath)) return [];
  const files = fs.readdirSync(folderAbsPath).filter(f => f.toLowerCase().endsWith('.json'));
  const items = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(folderAbsPath, file), 'utf8');
      const parsed = JSON.parse(raw);
      const slugFromFile = path.basename(file, '.json');
      if (Array.isArray(parsed)) {
          parsed.forEach(p => {
              if(!p.slug) p.slug = slugFromFile;
              items.push(p)
          });
      } else if (parsed && typeof parsed === 'object') {
        if(!parsed.slug) parsed.slug = slugFromFile;
        items.push(parsed);
      }
    } catch (e) {
      console.warn(`⚠️ JSON olvasási hiba: ${file}: ${e.message}`);
    }
  }
  return items;
}

function checkCategories(folderPath) {
  const items = readJsonFolder(folderPath);
  const invalidItems = items.filter(item => !allowedCategories.includes(item.category));
  if (invalidItems.length === 0) {
    console.log('✅ Minden tananyag kategóriája rendben van.');
  } else {
    console.log(`⚠️ ${invalidItems.length} tananyagban van érvénytelen kategória:`);
    invalidItems.forEach(item => {
      console.log(`- ${item.slug || item.title}: "${item.category}"`);
    });
  }
}

const rootDir = path.resolve(__dirname, '..');
const dataTananyagDir = path.join(rootDir, 'backend', 'data', 'tananyag');

checkCategories(dataTananyagDir);
