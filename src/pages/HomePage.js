// src/pages/HomePage.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero/Hero';
import styles from './HomePage.module.css';

// EZ AZ EGYETLEN SOR A JAVÍTÁS: Az API cím mostantól dinamikusan,
// a környezetnek megfelelően kerül beállításra.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// A statikus elrendezési objektum, ami a főoldal vázát adja. (Ez az Ön eredeti logikája)
const homePageLayout = {
    freeLessons: {
        matematika: [
            { slug: 'kviz_muveletek_tortekkel', grade: '5. Osztály', titleOverride: 'Törtek és Tizedestörtek' },
            { slug: 'kviz_aranyok', grade: '6. Osztály', titleOverride: 'Százalékszámítás' },
            { slug: 'kviz_termeszetes_negyzetgyok', grade: '7. Osztály', titleOverride: 'Természetes számok négyzetének négyzetgyöke' },
            { slug: 'kviz_halmazok_meghataroza', grade: '8. Osztály', titleOverride: 'Halmazok meghatározása elemeik közös tulajdonságával' },
        ],
        fizika: [
            { slug: 'kviz_halmazallapot_valtozasok', grade: '6. Osztály', titleOverride: 'Halmazállapot-változások' },
            { slug: 'kviz_fizikai_mennyisegek_es_jelensegek', grade: '7. Osztály', titleOverride: 'A fizikában használt matematikai eljárások és modellek' },
            { slug: 'kviz_elektromossag_alapjai', grade: '8. Osztály', titleOverride: 'Elektromosság alapjai' },
        ],
        'mesterseges intelligencia': [
            { slug: 'muhely_kepalkotas', titleOverride: 'Képalkotás MI-vel', description: 'Változtasd a szavakat lenyűgöző képekké! Próbáld ki az első kreatív műhelyt!' },
            { slug: 'muhely_jatektervezes', titleOverride: 'Játéktervezés 101', description: 'Tervezd meg a saját videójátékod koncepcióját az ötlettől a karakterig az MI-vel!' },
            { slug: 'muhely_prompt-alapok', titleOverride: 'A Promptolás Alapjai', description: 'Tanulj meg hatékonyan „beszélgetni” az MI-vel, és írj egy rövid történetet közösen!' },
        ],
    },
    freeTools: [
        { slug: 'idoutazo_csevego', titleOverride: 'Időutazó Csevegő', description: 'Beszélgess Newtonnal a gravitációról vagy Turinggal a kódfejtésről.' },
        { slug: 'jovokutato_szimulator', titleOverride: 'Jövőkutató Szimulátor', description: 'Kérdezz a holnapról egy MI-szakértőtől! Milyen lesz az élet a Marson?' },
        { slug: 'celkituzo', titleOverride: 'Személyes Célkitűző', description: 'Bontsd le a nagy álmaidat apró, elérhető lépésekre az MI segítségével.' },
        { slug: 'iranytu', titleOverride: 'Tudás Iránytű', description: 'Elakadtál? Írd le a problémád, és az MI útvonalat javasol a Tudástárból.' },
    ],
    premiumCourses: [
        { slug: 'interaktiv_matematika_gyujtemeny', titleOverride: 'Teljes Matematika Kurzus', description: 'Hozzáférés az összes évfolyam (5-8.) minden interaktív leckéjéhez és képletgyűjteményéhez.' },
        { slug: 'interaktiv_fizika_gyujtemeny', titleOverride: 'Teljes Fizika Kurzus', description: 'Hozzáférés az összes évfolyam (6-8.) minden interaktív leckéjéhez és képletgyűjteményéhez.' },
        { slug: 'interaktiv_aimi1_gyujtemeny', titleOverride: 'Teljes Interaktív Mesterséges Intelligencia', description: 'Hozzáférés az összes haladó műhelyhez, a projekt kézikönyvhöz és az extra tartalmakhoz.' },
    ],
    premiumTools: [
        { slug: 'kepletgyujtemeny', titleOverride: 'Interaktív Képlet- és Tételtár', description: 'Egy teljes, interaktív tudásbázis matekból és fizikából, részletes magyarázatokkal, példákkal és beépített MI-segítséggel.' },
        { slug: 'napi_kihivas', titleOverride: 'A Napi Kihívás', description: 'Egy gyors, napi logikai vagy matematikai agytorna, hogy a gondolkodásod mindig éles maradjon.' },
        { slug: 'tutor', titleOverride: 'CSICSIKE Tutor', description: 'A Tutor nem adja meg a kész választ, hanem rávezető kérdésekkel segít megérteni a megoldást.' },
        { slug: 'hazi_hos', titleOverride: 'Házifeladat Hős', description: 'Illeszd be a feladatodat, és az MI lépésről-lépésre végigvezet a gondolkodáson.' },
        { slug: 'vita_arena', titleOverride: 'AI Vita Aréna', description: 'Nézd meg, hogyan vitáznak a gépek! Elemezd két, ellentétes nézőpontú MI érvelését.' },
        { slug: 'vizsga_szimulator', titleOverride: 'AI Vizsga Szimulátor', description: 'Generálj végtelen számú, egyedi próbafeladatsort a témazáróidra!' },
        { slug: 'konkretizalo', titleOverride: 'Absztrakt->Konkrét Fordító', description: 'Bonyolult fogalmat magyaráz el hétköznapi analógiával.' },
        { slug: 'essze_vazlatolo', titleOverride: 'Esszé Vázlatoló', description: 'Segít egy fogalmazás vagy esszé logikus szerkezetének felépítésében.' },
    ],
};

const HomePage = () => {
    const [allCurriculumsMap, setAllCurriculumsMap] = useState(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAllCurriculums = async () => {
            try {
                const response = await fetch(`${API_URL}/api/curriculums`);
                const data = await response.json();
                if (!data.success) throw new Error('Hiba az adatok betöltésekor.');
                
                const curriculumMap = new Map();
                const allContent = data.data;

                const processItems = (items) => {
                    if (Array.isArray(items)) {
                        items.forEach(item => item && item.slug && curriculumMap.set(item.slug, item));
                    }
                };

                processItems(allContent.freeTools);
                processItems(allContent.premiumCourses);
                processItems(allContent.premiumTools);

                if (typeof allContent.freeLessons === 'object' && allContent.freeLessons !== null) {
                    Object.values(allContent.freeLessons).forEach(subjectArray => processItems(subjectArray));
                }
                
                setAllCurriculumsMap(curriculumMap);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllCurriculums();
    }, []);

    const renderCard = (itemConfig, typeClass) => {
        const dynamicData = allCurriculumsMap.get(itemConfig.slug.replace(/_/g, '-'));
        if (!dynamicData) return null;

        const title = itemConfig.titleOverride || dynamicData.title;
        const description = itemConfig.description || dynamicData.description;
        const linkTarget = `/tananyag/${itemConfig.slug.replace(/_/g, '-')}`;
        
        const buttonTextMap = {
            freeLesson: 'Ingyenes Lecke →',
            freeTool: 'Eszköz Indítása →',
            premiumCourse: 'Részletek →',
            premiumTool: 'Indítás →'
        };

        return (
            <div key={itemConfig.slug} className={`${styles.card} ${styles[typeClass]}`}>
                <h4>{itemConfig.grade ? `${itemConfig.grade} - ` : ''}{title}</h4>
                {description && <p>{description}</p>}
                <Link to={linkTarget} className={`${styles.btn} ${styles[typeClass + 'Btn']}`}>
                    {buttonTextMap[typeClass] || 'Tovább →'}
                </Link>
            </div>
        );
    };

    if (isLoading) return <p style={{ textAlign: 'center', padding: '2rem' }}>Tartalom betöltése...</p>;
    if (error) return <p style={{ textAlign: 'center', color: 'red', padding: '2rem' }}>Hiba: {error}</p>;

    return (
        <div>
            <Hero />
            <main className={styles.mainContent}>
                <section id="ingyenes-leckek" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Próbáld ki Ingyen!</h2>
                    {Object.keys(homePageLayout.freeLessons).map(subject => {
                        const subjectClassName = subject.replace(/\s+/g, '-').toLowerCase();
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
                <section id="ingyenes-eszkozok" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Ingyenes Interaktív Eszközök</h2>
                    <div className={styles.cardGrid}>
                        {homePageLayout.freeTools.map(itemConfig => renderCard(itemConfig, 'freeTool'))}
                    </div>
                </section>
                <section id="premium-kurzusok" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Teljes Kurzusok (Prémium)</h2>
                    <div className={styles.cardGrid}>
                        {homePageLayout.premiumCourses.map(itemConfig => renderCard(itemConfig, 'premiumCourse'))}
                    </div>
                </section>
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