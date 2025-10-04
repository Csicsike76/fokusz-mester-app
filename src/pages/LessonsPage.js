// src/pages/LessonPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './LessonPage.module.css'; // Új CSS fájl a leckék oldalhoz
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import LessonView from '../components/LessonView/LessonView'; // Feltételezve, hogy LessonView kezeli a lecke tartalmát

const LessonPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { canUsePremium, token } = useAuth(); // Felhasználó authentikációs státusza
    const [lessonData, setLessonData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchLessonData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Kérjük le a lecke tartalmát a backendről
            const res = await fetch(`${API_URL}/api/quiz/${slug}`, { headers }); // Ugyanazt a végpontot használjuk, mint a quiz/content

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Hálózati hiba: ${res.statusText}`);
            }
            const data = await res.json();

            if (!data.success || !data.data) {
                throw new Error(data.message || 'A lecke adatai hiányosak.');
            }

            // Ellenőrizzük, hogy prémium tartalom-e, és van-e hozzáférés
            const isPremiumContent =
                data.data.category &&
                (data.data.category.startsWith('premium_') ||
                 data.data.category === 'workshop' ||
                 data.data.category === 'premium_course' ||
                 data.data.category === 'premium_tool');

            if (isPremiumContent && !canUsePremium) {
                navigate('/bejelentkezes', {
                    state: {
                        from: window.location.pathname,
                        message: 'A tartalom megtekintéséhez bejelentkezés és prémium hozzáférés szükséges.',
                    },
                });
                return;
            }

            setLessonData(data.data);
        } catch (err) {
            setError(err.message);
            console.error('Hiba a lecke tartalom betöltésekor:', err);
        } finally {
            setIsLoading(false);
        }
    }, [slug, canUsePremium, navigate, token]);

    useEffect(() => {
        fetchLessonData();
    }, [fetchLessonData]);

    if (isLoading) return <div className={styles.container}>Lecke tartalmának betöltése...</div>;
    if (error) return <div className={styles.container}><p className={styles.errorMessage}>{error}</p></div>;
    if (!lessonData) return <div className={styles.container}><p>A lecke tartalom nem elérhető.</p></div>;

    return (
        <div className={styles.container}>
            <div className={styles.lessonWrapper}>
                {/* Itt feltételezzük, hogy van egy LessonView komponens, ami rendereli a lecke tartalmát */}
                {lessonData.toc ? (
                    <LessonView lessonData={lessonData} />
                ) : (
                    <div className={styles.defaultContent}>
                        <h1>{lessonData.title}</h1>
                        <p>{lessonData.description}</p>
                        <p>Ez egy alapértelmezett nézet, mert a lecke nem rendelkezik TOC (Tartalomjegyzék) adatokkal.</p>
                        {/* Itt lehetne egyéb tartalom megjelenítése is, ha a lessonData tartalmaz ilyesmit */}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LessonPage;