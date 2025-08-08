import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styles from './SubjectPage.module.css';
import ConditionalLink from '../components/ConditionalLink/ConditionalLink';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const SubjectPage = () => {
    const { subjectName } = useParams(); // Az URL-ből csak a tantárgy nevét olvassuk ki
    const [pageData, setPageData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchPageData = useCallback(async () => {
        // A "slug"-ot a tantárgy neve alapján, a konvenciónk szerint hozzuk létre.
        // Például, ha az URL /targy/fizika, a slug 'interaktiv_fizika_gyujtemeny' lesz.
        const slug = `interaktiv_${subjectName}_gyujtemeny`;
        
        setIsLoading(true);
        setError('');
        try {
            // A kvíz végpontot hívjuk meg, mert az adja vissza a teljes tananyag objektumot.
            const response = await fetch(`${API_URL}/api/quiz/${slug}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || `A(z) '${subjectName}' tantárgy főoldala nem található.`);
            }
            setPageData(data.quiz); // A 'quiz' kulcs alatt kapjuk meg a teljes objektumot
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [subjectName]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    if (isLoading) return <div className={styles.container}><p>Oldal betöltése...</p></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;
    if (!pageData || !pageData.content) return <div className={styles.container}><p>Az oldal tartalma nem tölthető be.</p></div>;

    const { content } = pageData;

    return (
        <div className={styles.container}>
            <h1>{pageData.title}</h1>
            <p className={styles.subtitle}>{content.subtitle}</p>
            
            {content.sections.map((section, index) => (
                <section key={index} className={styles.section}>
                    <h2>{section.sectionTitle}</h2>
                    <div className={styles.cardGrid}>
                        {section.cards.map((card, cardIndex) => (
                            <div key={cardIndex} className={styles.card}>
                                <h3>{card.grade} {card.text}</h3>
                                {/* A link a kártyában megadott 'slug'-ra mutat */}
                                <ConditionalLink to={`/kviz/${card.link.replace('.html', '')}`} className={styles.button}>
                                    Tovább →
                                </ConditionalLink>
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default SubjectPage;