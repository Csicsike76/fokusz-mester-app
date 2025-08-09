import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero/Hero';
import styles from './HomePage.module.css';
import ConditionalLink from '../components/ConditionalLink/ConditionalLink';

const API_URL = 'http://localhost:3001';

// Define the layout of the homepage along with human‑readable titles and
// descriptions. These entries are used both when curriculum data is
// available from the backend and as fallbacks for the static version of
// the site. The `titleOverride` field supersedes the title from the
// curriculum and is also used when no curriculum exists. A `description`
// field is provided for items that have meaningful copy – for example
// many of the AI workshops and tools. If the backend supplies its own
// description then that will take precedence.
const homePageLayout = {
    freeLessons: {
        matematika: [
            {
                slug: 'kviz_muveletek_tortekkel',
                grade: '5. Osztály',
                titleOverride: 'Törtek és Tizedestörtek',
                // Leírás: jelenleg nincs részletes leírás ehhez a feladathoz.
            },
            {
                slug: 'kviz_aranyok',
                grade: '6. Osztály',
                titleOverride: 'Százalékszámítás',
            },
            {
                slug: 'kviz_termeszetes_negyzetgyok',
                grade: '7. Osztály',
                titleOverride: 'Természetes számok négyzetének négyzetgyöke',
            },
            {
                slug: 'kviz_halmazok_meghataroza',
                grade: '8. Osztály',
                titleOverride: 'Halmazok meghatározása elemeik közös tulajdonságával',
            },
        ],
        fizika: [
            {
                slug: 'kviz_halmazallapot_valtozasok',
                grade: '6. Osztály',
                titleOverride: 'Halmazállapot‑változások',
            },
            {
                slug: 'kviz_fizikai_mennyisegek_es_jelensegek',
                grade: '7. Osztály',
                titleOverride: 'A fizikában használt matematikai eljárások és modellek',
            },
            {
                slug: 'kviz_elektromossag_alapjai',
                grade: '8. Osztály',
                titleOverride: 'Elektromosság alapjai',
            },
        ],
        'mesterséges intelligencia': [
            {
                slug: 'muhely_kepalkotas',
                titleOverride: 'Képalkotás MI‑vel',
                description: 'Változtasd a szavakat lenyűgöző képekké! Próbáld ki az első kreatív műhelyt!',
            },
            {
                slug: 'muhely_jatektervezes',
                titleOverride: 'Játéktervezés 101',
                description: 'Tervezd meg a saját videójátékod koncepcióját az ötlettől a karakterig az MI‑vel!',
            },
            {
                slug: 'muhely_prompt-alapok',
                titleOverride: 'A Promptolás Alapjai',
                description: 'Tanulj meg hatékonyan „beszélgetni” az MI‑vel, és írj egy rövid történetet közösen!',
            },
        ],
    },
    freeTools: [
        {
            slug: 'idoutazo_csevego',
            titleOverride: 'Időutazó Csevegő',
            description: 'Beszélgess Newtonnal a gravitációról vagy Turinggal a kódfejtésről.',
        },
        {
            slug: 'jovokutato_szimulator',
            titleOverride: 'Jövőkutató Szimulátor',
            description: 'Kérdezz a holnapról egy MI‑szakértőtől! Milyen lesz az élet a Marson?',
        },
        {
            slug: 'celkituzo',
            titleOverride: 'Személyes Célkitűző',
            description: 'Bontsd le a nagy álmaidat apró, elérhető lépésekre az MI segítségével.',
        },
        {
            slug: 'iranytu',
            titleOverride: 'Tudás Iránytű',
            description: 'Elakadtál? Írd le a problémád, és az MI útvonalat javasol a Tudástárból.',
        },
    ],
    premiumCourses: [
        {
            slug: 'interaktiv_matematika_gyujtemeny',
            titleOverride: 'Teljes Matematika Kurzus',
            description: 'Hozzáférés az összes évfolyam (5‑8.) minden interaktív leckéjéhez és képletgyűjteményéhez.',
        },
        {
            slug: 'interaktiv_fizika_gyujtemeny',
            titleOverride: 'Teljes Fizika Kurzus',
            description: 'Hozzáférés az összes évfolyam (6‑8.) minden interaktív leckéjéhez és képletgyűjteményéhez.',
        },
        {
            slug: 'interaktiv_aimi1_gyujtemeny',
            titleOverride: 'Teljes Interaktív Mesterséges Intelligencia',
            description: 'Hozzáférés az összes haladó műhelyhez, a projekt kézikönyvhöz és az extra tartalmakhoz.',
        },
    ],
    premiumTools: [
        {
            slug: 'kepletgyujtemeny',
            titleOverride: 'Interaktív Képlet‑ és Tételtár',
            description: 'Egy teljes, interaktív tudásbázis matekból és fizikából, részletes magyarázatokkal, példákkal és beépített MI‑segítséggel.',
        },
        {
            slug: 'napi_kihivas',
            titleOverride: 'A Napi Kihívás',
            description: 'Egy gyors, napi logikai vagy matematikai agytorna, hogy a gondolkodásod mindig éles maradjon.',
        },
        {
            slug: 'tutor',
            titleOverride: 'CSICSIKE Tutor',
            description: 'A Tutor nem adja meg a kész választ, hanem rávezető kérdésekkel segít neked megérteni a megoldást.',
        },
        {
            slug: 'hazi_hos',
            titleOverride: 'Házifeladat Hős',
            description: 'Illeszd be a szöveges feladatodat, és az MI lépésről‑lépésre végigvezet a gondolkodás folyamatán.',
        },
        {
            slug: 'vita_arena',
            titleOverride: 'AI Vita Aréna',
            description: 'Nézd meg, hogyan vitáznak a gépek! Elemezd két, ellentétes nézőpontú MI érvelését.',
        },
        {
            slug: 'vizsga_szimulator',
            titleOverride: 'AI Vizsga Szimulátor',
            description: 'Generálj végtelen számú, egyedi próbafeladatsort a témazáróidra a beépített tudásbázis alapján!',
        },
        {
            slug: 'konkretizalo',
            titleOverride: 'Absztrakt‑>Konkrét Fordító',
            description: 'Nem értesz egy bonyolult fogalmat? Az MI egy hétköznapi analógiával magyarázza el neked!',
        },
        {
            slug: 'essze_vazlatolo',
            titleOverride: 'Esszé Vázlatoló',
            description: 'Segít a diákoknak a legnehezebb részben: egy fogalmazás vagy esszé logikus szerkezetének felépítésében.',
        },
    ],
};

const HomePage = () => {
    const [allCurriculums, setAllCurriculums] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAllCurriculums = async () => {
            try {
                const response = await fetch(`${API_URL}/api/curriculums`);
                const data = await response.json();
                if (!data.success) throw new Error('Hiba az adatok betöltésekor.');
                setAllCurriculums(data.data); 
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllCurriculums();
    }, []);

    const findDataBySlug = (slug) => {
        if (!Array.isArray(allCurriculums)) return null;
        return allCurriculums.find(item => item.slug === slug);
    };

    /**
     * Render a single card on the homepage.
     *
     * This helper tries to gracefully fall back to sensible defaults when no
     * curriculum data is available. The original implementation returned
     * `null` whenever the API did not return a matching record which resulted
     * in missing cards on the static version of the site. With this change
     * the card will always render using whatever information is available
     * from the `itemConfig` parameter. If the backend provides matching
     * curriculum data then the title, description and link prefix will be
     * derived from that record, otherwise we use the slug and optional
     * overrides from the configuration.
     */
    const renderCard = (itemConfig, typeClass) => {
        const curriculumData = findDataBySlug(itemConfig.slug);
        // Determine title: use override if provided, then curriculum title, then
        // derive from slug as a last resort by replacing underscores with spaces.
        const title = itemConfig.titleOverride
            || (curriculumData && curriculumData.title)
            || (itemConfig.title)
            || itemConfig.slug.replace(/_/g, ' ');

        // Determine description: prefer curriculum description, otherwise use
        // optional description in itemConfig, otherwise generate a PIN if
        // curriculum id exists, otherwise leave empty. This ensures that
        // cards always display some text instead of disappearing entirely.
        let description = '';
        if (curriculumData && curriculumData.description) {
            description = curriculumData.description;
        } else if (itemConfig.description) {
            description = itemConfig.description;
        } else if (curriculumData && typeof curriculumData.id === 'number') {
            description = `PIN: ${curriculumData.id + 100000}`;
        }

        // Determine the link prefix. If a curriculum category is defined and
        // includes "tool" then use the `/eszkoz` prefix, otherwise default to
        // `/kviz`. When no curriculum data exists we assume quizzes for free
        // lessons and tools for others based on the typeClass naming.
        let pathPrefix;
        if (curriculumData && curriculumData.category && curriculumData.category.includes('tool')) {
            pathPrefix = '/eszkoz';
        } else if (typeClass.toLowerCase().includes('tool')) {
            pathPrefix = '/eszkoz';
        } else {
            pathPrefix = '/kviz';
        }

        // Build the URL using the slug from itemConfig. Do not rely on
        // curriculumData.slug here so that the link works even if the API did
        // not return data.
        const linkTarget = `${pathPrefix}/${itemConfig.slug}`;

        return (
            <div key={itemConfig.slug} className={`${styles.card} ${styles[typeClass]}`}> 
                <h4>{itemConfig.grade ? `${itemConfig.grade} - ` : ''}{title}</h4>
                {description && <p>{description}</p>}
                <ConditionalLink to={linkTarget} className={`${styles.btn} ${styles[typeClass + 'Btn']}`}>
                    Tovább →
                </ConditionalLink>
            </div>
        );
    };

    if (isLoading) return <p style={{ textAlign: 'center', padding: '2rem' }}>Tartalom betöltése...</p>;
    if (error) return <p style={{ textAlign: 'center', color: 'red', padding: '2rem' }}>Hiba: {error}</p>;

    return (
        <div>
            <Hero />
            <main className={styles.mainContent}>
                {/* Ingyenes leckék szekció */}
                <section id="ingyenes-leckek" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Próbáld ki Ingyen!</h2>
                    {Object.keys(homePageLayout.freeLessons).map(subject => {
                        // Map the raw subject string to a CSS class name. Replace
                        // spaces with hyphens so that subjects like "mesterséges intelligencia"
                        // match the corresponding CSS module entry (e.g. `.mesterséges-intelligencia`).
                        const subjectClassName = subject.replace(/\s+/g, '-');
                        return (
                            <div key={subject}>
                                <h3 className={`${styles.subjectTitle} ${styles[subjectClassName] || ''}`}>{subject}</h3>
                                <div className={styles.cardGrid}>
                                    {homePageLayout.freeLessons[subject].map(itemConfig => renderCard(itemConfig, 'freeLesson'))}
                                </div>
                            </div>
                        );
                    })}
                </section>
                {/* Ingyenes eszközök szekció */}
                <section id="ingyenes-eszkozok" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Ingyenes Interaktív Eszközök</h2>
                    <div className={styles.cardGrid}>
                        {homePageLayout.freeTools.map(itemConfig => renderCard(itemConfig, 'freeTool'))}
                    </div>
                </section>
                {/* Prémium kurzusok szekció */}
                <section id="premium-kurzusok" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Teljes Kurzusok (Prémium)</h2>
                    <div className={styles.cardGrid}>
                        {homePageLayout.premiumCourses.map(itemConfig => renderCard(itemConfig, 'premiumCourse'))}
                    </div>
                </section>
                {/* Prémium eszközök szekció */}
                <section id="premium-eszkozok" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Exkluzív Prémium Eszközök</h2>
                    <div className={styles.cardGrid}>
                        {homePageLayout.premiumTools.map(itemConfig => renderCard(itemConfig, 'premiumTool'))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default HomePage;