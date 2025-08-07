import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styles from './LessonsPage.module.css';
import ConditionalLink from '../components/ConditionalLink/ConditionalLink';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const SubjectPage = () => {
    const { subjectName, grade } = useParams();
    const [lessons, setLessons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchSubjectLessons = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/curriculums?subject=${subjectName}&grade=${grade}`);
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Hiba a tananyagok lekérésekor.');
            }
            setLessons(data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [subjectName, grade]);

    useEffect(() => {
        fetchSubjectLessons();
    }, [fetchSubjectLessons]);

    if (isLoading) return <div className={styles.container}><p>Tananyagok betöltése...</p></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>Hiba: {error}</p></div>;

    const formattedSubjectName = subjectName ? subjectName.charAt(0).toUpperCase() + subjectName.slice(1) : '';

    return (
        <div className={styles.container}>
            <h1>{formattedSubjectName} - {grade}. Osztály</h1>
            {lessons.length > 0 ? (
                <div className={styles.cardGrid}>
                    {lessons.map(lesson => (
                        <div key={lesson.id} className={styles.lessonCard}>
                            <h3>{lesson.title}</h3>
                            <p className={styles.pin}>PIN: {lesson.id + 100000}</p>
                            <ConditionalLink to={`/kviz/${lesson.slug}`} className={styles.lessonLink}>
                                Tovább a kvízhez →
                            </ConditionalLink>
                        </div>
                    ))}
                </div>
            ) : (
                <p>Ehhez a tantárgyhoz és évfolyamhoz jelenleg nincsenek feltöltve tananyagok.</p>
            )}
        </div>
    );
};

export default SubjectPage;