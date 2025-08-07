import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero/Hero';
import styles from './HomePage.module.css';
import ConditionalLink from '../components/ConditionalLink/ConditionalLink';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const HomePage = () => {
    const [content, setContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHomePageContent = async () => {
            try {
                const response = await fetch(`${API_URL}/api/curriculums`);
                const data = await response.json();
                if (!data.success) throw new Error('Hiba az adatok betöltésekor.');
                setContent(data.data);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHomePageContent();
    }, []);

    const renderCard = (item, type) => (
        <div key={item.slug} className={`${styles.card} ${styles[type]}`}>
            <h4>{item.title}</h4>
            <p>{item.description || `PIN: ${item.id + 100000}`}</p> {/* Leírás, vagy ha nincs, akkor PIN */}
            <ConditionalLink to={`/kviz/${item.slug}`} className={`${styles.btn} ${styles[type + 'Btn']}`}>
                {type.includes('lesson') ? 'Ingyenes Lecke →' : 'Tovább →'}
            </ConditionalLink>
        </div>
    );

    return (
        <div>
            <Hero />
            {isLoading ? (
                <p style={{ textAlign: 'center', color: 'white' }}>Tartalom betöltése...</p>
            ) : content && (
                <main className={styles.mainContent}>
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Próbáld ki Ingyen!</h2>
                        {Object.keys(content.freeLessons).map(subject => (
                            <div key={subject}>
                                <h3 className={`${styles.subjectTitle} ${styles[subject]}`}>{subject}</h3>
                                <div className={styles.cardGrid}>
                                    {content.freeLessons[subject].map(item => renderCard(item, 'freeLesson'))}
                                </div>
                            </div>
                        ))}
                    </section>
                    
                    {content.freeTools.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Ingyenes Interaktív Eszközök</h2>
                            <div className={styles.cardGrid}>
                                {content.freeTools.map(item => renderCard(item, 'freeTool'))}
                            </div>
                        </section>
                    )}
                    
                    {content.premiumCourses.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Teljes Kurzusok (Prémium)</h2>
                            <div className={styles.cardGrid}>
                                {content.premiumCourses.map(item => renderCard(item, 'premiumCourse'))}
                            </div>
                        </section>
                    )}

                    {/* Ide jöhet a többi szekció is a minta alapján... */}
                </main>
            )}
        </div>
    );
};

export default HomePage;