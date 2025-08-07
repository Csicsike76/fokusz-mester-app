import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero/Hero';
import styles from './HomePage.module.css';
import ConditionalLink from '../components/ConditionalLink/ConditionalLink';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const HomePage = () => {
    const [content, setContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHomePageContent = async () => {
            try {
                const response = await fetch(`${API_URL}/api/curriculums`);
                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.message || 'Hiba az adatok betöltésekor.');
                }
                setContent(data.data);
            } catch (err) {
                setError(err.message);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHomePageContent();
    }, []);

    const renderCard = (item, typeClass) => (
        <div key={item.slug} className={`${styles.card} ${styles[typeClass]}`}>
            <h4>{item.grade > 0 ? `${item.grade}. osztály - ${item.title}` : item.title}</h4>
            <p>{item.description || `PIN: ${item.id + 100000}`}</p>
            <ConditionalLink to={`/kviz/${item.slug}`} className={`${styles.btn} ${styles[typeClass + 'Btn']}`}>
                Tovább →
            </ConditionalLink>
        </div>
    );

    return (
        <div>
            <Hero />
            <main className={styles.mainContent}>
                {isLoading && (
                    <p style={{ textAlign: 'center' }}>Tartalom betöltése...</p>
                )}
                {error && (
                    <p style={{ textAlign: 'center', color: 'red' }}>Hiba: {error}</p>
                )}
                {content && (
                    <>
                        <section id="ingyenes-leckek" className={styles.section}>
                            <h2 className={styles.sectionTitle}>Próbáld ki Ingyen!</h2>
                            {Object.keys(content.freeLessons || {}).map(subject => (
                                <div key={subject}>
                                    <h3 className={`${styles.subjectTitle} ${styles[subject]}`}>{subject}</h3>
                                    <div className={styles.cardGrid}>
                                        {(content.freeLessons[subject] || []).map(item => renderCard(item, 'freeLesson'))}
                                    </div>
                                </div>
                            ))}
                        </section>

                        {content.freeTools && content.freeTools.length > 0 && (
                            <section id="ingyenes-eszkozok" className={styles.section}>
                                <h2 className={styles.sectionTitle}>Ingyenes Interaktív Eszközök</h2>
                                <div className={styles.cardGrid}>
                                    {content.freeTools.map(item => renderCard(item, 'freeTool'))}
                                </div>
                            </section>
                        )}

                        {content.premiumCourses && content.premiumCourses.length > 0 && (
                            <section id="premium-kurzusok" className={styles.section}>
                                <h2 className={styles.sectionTitle}>Teljes Kurzusok (Prémium)</h2>
                                <div className={styles.cardGrid}>
                                    {content.premiumCourses.map(item => renderCard(item, 'premiumCourse'))}
                                </div>
                            </section>
                        )}

                        {content.premiumTools && content.premiumTools.length > 0 && (
                            <section id="premium-eszkozok" className={styles.section}>
                                <h2 className={styles.sectionTitle}>Exkluzív Prémium Eszközök</h2>
                                <div className={styles.cardGrid}>
                                    {content.premiumTools.map(item => renderCard(item, 'premiumTool'))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default HomePage;