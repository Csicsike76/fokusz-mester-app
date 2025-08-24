import React, { useState, useEffect, useCallback } from 'react';
import styles from './LessonsPage.module.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || '';

const LessonsPage = () => {
    const [lessonsData, setLessonsData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const { canUsePremium } = useAuth();

    const fetchAllLessons = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/curriculums`);
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Hiba a tananyagok lekérésekor.');
            }
            setLessonsData(data.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllLessons();
    }, [fetchAllLessons]);
    
    const renderLessonCard = (lesson) => {
        const isPremium = lesson.category.startsWith('premium_');
        const userHasAccess = canUsePremium;
        const linkTarget = (isPremium && !userHasAccess) ? '/bejelentkezes' : `/tananyag/${lesson.slug}`;

        return (
            <div key={lesson.slug} className={styles.lessonCard}>
                <h3>
                    {isPremium && !userHasAccess && <span className={styles.lockIcon}>🔒 </span>}
                    {lesson.title}
                </h3>
                {lesson.description && <p>{lesson.description}</p>}
                <Link to={linkTarget} className={styles.lessonLink}>
                    Tovább →
                </Link>
            </div>
        );
    };

    if (isLoading) return <div className={styles.container}><p>Tananyagok betöltése...</p></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>Hiba: {error}</p></div>;

    return (
        <div className={styles.container}>
            <h1>Minden Tananyag</h1>
            
            {lessonsData.freeLessons && Object.keys(lessonsData.freeLessons).length > 0 && (
                <section className={styles.subjectSection}>
                    <h2 className={styles.subjectTitle}>Ingyenes Leckék</h2>
                    {Object.entries(lessonsData.freeLessons).map(([subject, lessons]) => (
                        <div key={subject}>
                            <h3 className={styles.subCategoryTitle}>{subject.charAt(0).toUpperCase() + subject.slice(1)}</h3>
                            <div className={styles.cardGrid}>
                                {lessons.map(renderLessonCard)}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {lessonsData.freeTools && lessonsData.freeTools.length > 0 && (
                 <section className={styles.subjectSection}>
                    <h2 className={styles.subjectTitle}>Ingyenes Eszközök</h2>
                    <div className={styles.cardGrid}>
                        {lessonsData.freeTools.map(renderLessonCard)}
                    </div>
                </section>
            )}

            {lessonsData.premiumCourses && lessonsData.premiumCourses.length > 0 && (
                 <section className={styles.subjectSection}>
                    <h2 className={styles.subjectTitle}>Prémium Kurzusok</h2>
                    <div className={styles.cardGrid}>
                        {lessonsData.premiumCourses.map(renderLessonCard)}
                    </div>
                </section>
            )}

            {lessonsData.premiumTools && lessonsData.premiumTools.length > 0 && (
                 <section className={styles.subjectSection}>
                    <h2 className={styles.subjectTitle}>Prémium Eszközök</h2>
                    <div className={styles.cardGrid}>
                        {lessonsData.premiumTools.map(renderLessonCard)}
                    </div>
                </section>
            )}
        </div>
    );
};

export default LessonsPage;