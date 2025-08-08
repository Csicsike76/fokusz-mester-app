import React, { useState, useEffect, useMemo } from 'react';
import Hero from '../components/Hero/Hero';
import styles from './HomePage.module.css';
import ConditionalLink from '../components/ConditionalLink/ConditionalLink';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const homePageLayout = {
    freeLessons: {
        matematika: ['kviz_muveletek_tortekkel', 'termeszetes_szamok_5'],
        fizika: ['kviz_halmazallapot_valtozasok'],
        ai: ['muhely_kepalkotas', 'muhely_jatektervezes', 'muhely_prompt-alapok']
    },
    freeTools: ['idoutazo_csevego', 'jovokutato_szimulator', 'celkituzo', 'iranytu'],
    premiumCourses: ['Interaktív_Fizika_Gyűjtemény'], // Példa
    premiumTools: []
};

const HomePage = () => {
    const [groupedContent, setGroupedContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHomePageContent = async () => {
            try {
                const response = await fetch(`${API_URL}/api/curriculums`);
                const data = await response.json();
                if (!data.success) throw new Error('Hiba az adatok betöltésekor.');
                setGroupedContent(data.data); 
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHomePageContent();
    }, []);

    const allCurriculumsList = useMemo(() => {
        if (!groupedContent) return [];
        
        let list = [];
        Object.values(groupedContent.freeLessons || {}).forEach(arr => list = [...list, ...arr]);
        list = [...list, ...(groupedContent.freeTools || [])];
        list = [...list, ...(groupedContent.premiumCourses || [])];
        list = [...list, ...(groupedContent.premiumTools || [])];
        
        return list;
    }, [groupedContent]);
    
    const findDataBySlug = (slug) => {
        return allCurriculumsList.find(item => item.slug === slug);
    };

    const renderCard = (slug, typeClass) => {
        const curriculumData = findDataBySlug(slug);
        if (!curriculumData) return null;

        const pathPrefix = curriculumData.category.includes('tool') ? '/eszkoz' : '/kviz';
        
        return (
            <div key={curriculumData.slug} className={`${styles.card} ${styles[typeClass]}`}>
                <h4>{curriculumData.grade > 0 ? `${curriculumData.grade}. osztály - ${curriculumData.title}` : curriculumData.title}</h4>
                <p>{curriculumData.description || `PIN: ${curriculumData.id + 100000}`}</p>
                <ConditionalLink to={`${pathPrefix}/${curriculumData.slug}`} className={`${styles.btn} ${styles[typeClass + 'Btn']}`}>
                    Tovább →
                </ConditionalLink>
            </div>
        );
    };

    if (isLoading) return <p style={{ textAlign: 'center' }}>Tartalom betöltése...</p>;
    if (error) return <p style={{ textAlign: 'center', color: 'red' }}>Hiba: {error}</p>;

    return (
        <div>
            <Hero />
            <main className={styles.mainContent}>
                <section id="ingyenes-leckek" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Próbáld ki Ingyen!</h2>
                    {Object.keys(homePageLayout.freeLessons).map(subject => (
                        <div key={subject}>
                            <h3 className={`${styles.subjectTitle} ${styles[subject]}`}>{subject}</h3>
                            <div className={styles.cardGrid}>
                                {homePageLayout.freeLessons[subject].map(slug => renderCard(slug, 'freeLesson'))}
                            </div>
                        </div>
                    ))}
                </section>
                <section id="ingyenes-eszkozok" className={styles.section}>
                    <h2 className={styles.sectionTitle}>Ingyenes Interaktív Eszközök</h2>
                    <div className={styles.cardGrid}>
                        {homePageLayout.freeTools.map(slug => renderCard(slug, 'freeTool'))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default HomePage;