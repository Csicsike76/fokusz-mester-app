const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://fokuszmester.com'; // Az Ön weboldalának alap URL-je
const SLUGS_FILE = path.join(__dirname, 'slugs.txt'); // A slugs.txt fájl elérési útja
const SITEMAP_FILE = path.join(__dirname, 'public', 'sitemap.xml'); // A generált sitemap.xml fájl elérési útja

// Statikus oldalak, amik nincsenek a slugs.txt-ben, de részei a weboldalnak
const staticRoutes = [
    '/',
    '/bejelentkezes',
    '/regisztracio',
    '/interaktiv-matematika',
    '/sugo',
    '/kapcsolat',
    '/elfelejtett-jelszo',
    '/aszf',
    '/adatkezeles',
    '/alkalmazas-letoltese',
    // Ha a /profil vagy /admin oldalak bejelentkezéshez kötöttek,
    // akkor általában nem javasolt őket a sitemap-be tenni.
    // De a kérés alapján, ha ezek is indexelhetőek, akkor hozzá kell adni.
    // Példák:
    // '/profil',
    // '/dashboard/teacher',
    // '/admin',
];

async function generateSitemap() {
    try {
        // Ellenőrizzük, hogy a public mappa létezik-e, ha nem, hozzuk létre
        const publicDir = path.join(__dirname, 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir);
        }

        const slugs = fs.readFileSync(SLUGS_FILE, 'utf8')
                            .split(/\r?\n/)
                            .map(line => line.trim())
                            .filter(line => line !== ''); // Üres sorok szűrése

        let urls = new Set(); // Set használata az duplikációk elkerülésére

        // Statikus oldalak hozzáadása
        staticRoutes.forEach(route => {
            urls.add(`${BASE_URL}${route}`);
        });

        // Minden slug hozzáadása a /tananyag/ útvonallal
        // Az összes slugs.txt bejegyzést egyedi, indexelhető tartalomnak tekintjük.
        slugs.forEach(slug => {
            urls.add(`${BASE_URL}/tananyag/${slug}`);
        });

        const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from(urls).map(url => `<url><loc>${url}</loc></url>`).join('')}
</urlset>`;

        fs.writeFileSync(SITEMAP_FILE, sitemapContent, 'utf8');
        console.log(`Sitemap sikeresen generálva: ${SITEMAP_FILE}`);
    } catch (error) {
        console.error('Hiba a sitemap generálásakor:', error);
    }
}

generateSitemap();