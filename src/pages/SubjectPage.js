import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styles from './LessonsPage.module.css';
import ConditionalLink from '../components/ConditionalLink/ConditionalLink';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const SubjectPage = () => {
    const { subjectName, grade } = useParams();
    const [content, setContent] = useState({ lessons: [], collections: [], assessments: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchContent = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/curriculums?subject=${subjectName}&grade=${grade}`);
            const data = await response.json();
            if (!data.success) throw new Error(data.message);
            setContent(data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [subjectName, grade]);

    useEffect(() => { fetchContent(); }, [fetchContent]);

    if (isLoading) return <div className={styles.container}><p>Betöltés...</p></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;

    const formattedSubjectName = subjectName.charAt(0).toUpperCase() + subjectName.slice(1);

    return (
        <div className={styles.container}>
            <h1>{formattedSubjectName} - {grade}. Osztály</h1>
            <p>Digitális segédlet és gyakorlórendszer</p>
            
            {/* Szekció 1: Tananyagok */}
            <section className={styles.subjectSection}>
                <h2 className={styles.subjectTitle}>Tananyagok</h2>
                <div className={styles.cardGrid}>
                    {content.lessons.map(item => (
                         <div key={item.id} className={styles.lessonCard}>
                            <h3>{item.title}</h3>
                            <ConditionalLink to={`/kviz/${item.slug}`} className={styles.lessonLink}>
                                Kvíz Indítása →
                            </ConditionalLink>
                        </div>
                    ))}
                </div>
            </section>
            
            {/* Szekció 2: Képletgyűjtemények */}
            <section className={styles.subjectSection}>
                <h2 className={styles.subjectTitle}>Képletgyűjtemények</h2>
                <div className={styles.cardGrid}>
                    {content.collections.map(item => (
                         <div key={item.id} className={styles.lessonCard}>
                            <h3>{item.title}</h3>
                            <ConditionalLink to={`/kviz/${item.slug}`} className={styles.lessonLink}>
                                Megnyitás →
                            </ConditionalLink>
                        </div>
                    ))}
                </div>
            </section>
            
            {/* Szekció 3: Felmérők */}
            <section className={styles.subjectSection}>
                <h2 className={styles.subjectTitle}>Év Végi Felmérők</h2>
                <div className={styles.cardGrid}>
                    {content.assessments.map(item => (
                         <div key={item.id} className={styles.lessonCard}>
                            <h3>{item.title}</h3>
                            <ConditionalLink to={`/kviz/${item.slug}`} className={styles.lessonLink}>
                                Felmérő Indítása →
                            </ConditionalLink>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default SubjectPage;