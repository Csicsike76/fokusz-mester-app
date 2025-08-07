import React, { useState, useEffect, useCallback } from 'react';
import styles from './LessonsPage.module.css'; // Ezt a stíluslapot fogja használni, ami már létezik
import ConditionalLink from '../components/ConditionalLink/ConditionalLink';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const LessonsPage = () => {
    // Az 'lessons' állapot most egy objektum lesz, ami tantárgyakat tárol
    const [lessonsBySubject, setLessonsBySubject] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAllLessons = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // A backend fő /api/curriculums végpontját hívjuk, szűrők nélkül
            const response = await fetch(`${API_URL}/api/curriculums`);
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Hiba a tananyagok lekérésekor.');
            }
            // A backend már csoportosítva adja vissza az adatokat, ha nincs szűrés
            setLessonsBySubject(data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllLessons();
    }, [fetchAllLessons]);

    if (isLoading) return <div className={styles.container}><p>Tananyagok betöltése...</p></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>Hiba: {error}</p></div>;

    return (
        <div className={styles.container}>
            <h1>Tananyagok és Kvízek</h1>
            
            {/* Végigmegyünk a tantárgyakon (pl. 'matematika', 'fizika') */}
            {Object.keys(lessonsBySubject).map(subject => (
                <section key={subject} className={styles.subjectSection}>
                    <h2 className={styles.subjectTitle}>{subject.charAt(0).toUpperCase() + subject.slice(1)}</h2>
                    <div className={styles.cardGrid}>
                        {/* Az adott tantárgyhoz tartozó leckéken megyünk végig */}
                        {lessonsBySubject[subject].map(lesson => (
                            <div key={lesson.id} className={styles.lessonCard}>
                                <h3>{lesson.title}</h3>
                                <p className={styles.pin}>PIN: {lesson.id + 100000}</p>
                                <ConditionalLink to={`/kviz/${lesson.slug}`} className={styles.lessonLink}>
                                    Tovább a kvízhez →
                                </ConditionalLink>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default LessonsPage;