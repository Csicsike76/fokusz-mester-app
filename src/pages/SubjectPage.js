// src/pages/SubjectPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import styles from './SubjectPage.module.css';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const SubjectPage = () => {
  const { subjectName } = useParams();
  const [pageData, setPageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPageData = useCallback(async () => {
    const slug = `interaktiv_${subjectName}_gyujtemeny`;

    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/quiz/${slug}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || `A(z) '${subjectName}' tantárgy főoldala nem található.`);
      }
      setPageData(data.quiz || data.data || null);
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
            {section.cards.map((card, cardIndex) => {
              const raw = (card.link || '').replace('.html', '');
              const slug = raw.replace(/_/g, '-'); // backend-hez kötőjeles slug kell
              return (
                <div key={cardIndex} className={styles.card}>
                  <h3>{card.grade} {card.text}</h3>
                  <Link to={`/tananyag/${slug}`} className={styles.button}>
                    Tovább →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default SubjectPage;
