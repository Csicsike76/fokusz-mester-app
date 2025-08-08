const fs = require('fs/promises');
const path = require('path');

const dataDirectory = path.join(__dirname, '..', 'backend', 'data');

async function findInvalidJsonFiles() {
    console.log(`Fájlok ellenőrzése a következő mappában: ${dataDirectory}`);
    let invalidFiles = [];

    try {
        const files = await fs.readdir(dataDirectory);
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        for (const fileName of jsonFiles) {
            const filePath = path.join(dataDirectory, fileName);
            const fileContent = await fs.readFile(filePath, 'utf-8');

            try {
                const data = JSON.parse(fileContent);

                // Ellenőrzés: a 'grade' egy szám?
                // A Number.isInteger() a legbiztosabb ellenőrzés.
                if (data.grade === undefined || !Number.isInteger(data.grade)) {
                    invalidFiles.push({ file: fileName, reason: `'grade' értéke hiányzik vagy nem egész szám (aktuális: ${data.grade})` });
                }
                
                // Ellenőrizhetünk más kötelező mezőket is
                if (!data.title || !data.subject || !data.category) {
                    invalidFiles.push({ file: fileName, reason: `Egy vagy több kötelező metaadat (title, subject, category) hiányzik.` });
                }

            } catch (e) {
                invalidFiles.push({ file: fileName, reason: 'Érvénytelen JSON formátum.' });
            }
        }

        if (invalidFiles.length > 0) {
            console.log('\n❌ A következő hibás fájlokat találtam:');
            // A duplikációk eltávolítása a szebb kimenetért
            const uniqueInvalidFiles = [...new Map(invalidFiles.map(item => [item['file'], item])).values()];
            uniqueInvalidFiles.forEach(item => {
                console.log(`- ${item.file}: ${item.reason}`);
            });
        } else {
            console.log('\n✅ Minden .json fájl érvényesnek tűnik!');
        }

    } catch (error) {
        console.error('Hiba történt a fájlok ellenőrzése során:', error);
    }
}

findInvalidJsonFiles();