const fs = require('fs/promises');
const path = require('path');

const inputFile = path.resolve(__dirname, '..', 'slugs.txt');
const outputDir = path.resolve(__dirname, '..', 'backend', 'data');

async function parseAndGenerateFiles() {
    try {
        console.log(`Fájllista beolvasása innen: ${inputFile}`);
        const data = await fs.readFile(inputFile, 'utf-8');
        const slugs = data.split(/\r?\n/).filter(line => line.trim() !== '');

        await fs.mkdir(outputDir, { recursive: true });

        for (const slug of slugs) {
            const cleanSlug = slug.trim();
            if (!cleanSlug) continue;

            const { title, subject, grade, category, description } = guessMetadata(cleanSlug);
            const jsonData = { title, subject, grade, category, description, questions: [] };
            const outputPath = path.join(outputDir, `${cleanSlug}.json`);
            
            try {
                await fs.access(outputPath);
            } catch (error) {
                await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2));
            }
        }
        console.log(`✅ A .json fájlok generálása/ellenőrzése befejeződött.`);
    } catch (error) {
        console.error('❌ Hiba történt a fájlok generálása során:', error);
    }
}

function guessMetadata(slug) {
    let title = slug.replace(/_/g, ' ').replace(/-/g, ' ');
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    let subject = 'altalanos';
    if (slug.includes('matek') || slug.includes('matematika')) subject = 'matematika';
    if (slug.includes('fizika')) subject = 'fizika';
    if (slug.includes('aimi') || slug.includes('szuperkepesseg')) subject = 'ai';

    let grade = 0;
    const gradeMatch = slug.match(/_(\d+)/);
    if (gradeMatch && gradeMatch[1]) {
        grade = parseInt(gradeMatch[1], 10);
    }

    let category = 'premium_course';
    if (slug.includes('muhely') || slug.includes('eszkoz') || slug.includes('csevego')) {
        category = 'premium_tool';
    }

    return { title, subject, grade, category, description: `Ez a(z) "${title}" című tananyag.` };
}

parseAndGenerateFiles();