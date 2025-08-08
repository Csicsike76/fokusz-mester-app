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
            setIsLoading(true);
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

    const renderCard = (item, typeClass) => {
        if (!item) return null;
        const pathPrefix = item.category.includes('tool') ? '/eszkoz' : '/kviz';
        return (
            <div key={item.slug} className={`${styles.card} ${styles[typeClass]}`}>
                <h4>{item.grade > 0 ? `${item.grade}. osztály - ${item.title}` : item.title}</h4>
                <p>{item.description || `PIN: ${item.id + 100000}`}</p>
                <ConditionalLink to={`${pathPrefix}/${item.slug}`} className={`${styles.btn} ${styles[typeClass + 'Btn']}`}>
                    Tovább →
                </ConditionalLink>
            </div>
        );
    };

    const renderSection = (title, items, typeClass) => {
        if (!items || items.length === 0) return null;
        return (
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{title}</h2>
                <div className={styles.cardGrid}>
                    {items.map(item => renderCard(item, typeClass))}
                </div>
            </section>
        );
    };

    const renderSubjectSections = (title, subjectsData, typeClass) => {
        if (!subjectsData || Object.keys(subjectsData).length === 0) return null;
        return (
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>{title}</h2>
                {Object.keys(subjectsData).map(subject => (
                    subjectsData[subject].length > 0 && (
                        <div key={subject}>
                            <h3 className={`${styles.subjectTitle} ${styles[subject]}`}>{subject}</h3>
                            <div className={styles.cardGrid}>
                                {subjectsData[subject].map(item => renderCard(item, typeClass))}
                            </div>
                        </div>
                    )
                ))}
            </section>
        );
    };

    return (
        <div>
            <Hero />
            <main className={styles.mainContent}>
                {isLoading && (<p style={{ textAlign: 'center' }}>Tartalom betöltése...</p>)}
                {error && (<p style={{ textAlign: 'center', color: 'red' }}>Hiba: {error}</p>)}
                {content && (
                    <>
                        {renderSubjectSections("Próbáld ki Ingyen!", content.freeLessons, 'freeLesson')}
                        {renderSection("Ingyenes Interaktív Eszközök", content.freeTools, 'freeTool')}
                        {renderSection("Teljes Kurzusok (Prémium)", content.premiumCourses, 'premiumCourse')}
                        {renderSection("Exkluzív Prémium Eszközök", content.premiumTools, 'premiumTool')}
                    </>
                )}
            </main>
        </div>
    );
};

export default HomePage;