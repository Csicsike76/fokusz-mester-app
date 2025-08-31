import React, { useState, useEffect, useCallback } from 'react';
import styles from './HelpCenterPage.module.css';
import { API_URL } from '../config/api'; // JAVÍTVA: Importálás a központi konfigurációból

const HelpArticle = ({ article }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className={styles.article}>
            <button className={styles.question} onClick={() => setIsOpen(!isOpen)}>
                {article.question}
                <span className={isOpen ? styles.arrowUp : styles.arrowDown}>▼</span>
            </button>
            {isOpen && <div className={styles.answer} dangerouslySetInnerHTML={{ __html: article.answer }} />}
        </div>
    );
};

const HelpCenterPage = () => {
    const [articles, setArticles] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchArticles = useCallback(async () => {
        setIsLoading(true);
        // A lekérdezési URL összeállítása a központi API_URL változóval
        const url = new URL(`${API_URL}/api/help`);
        if (searchTerm.trim().length > 2) {
            url.searchParams.append('q', searchTerm.trim());
        }

        try {
            const response = await fetch(url.toString());
            const data = await response.json();
            if (data.success) {
                setArticles(data.data);
            } else {
                setArticles({});
            }
        } catch (error) {
            console.error("Hiba a súgó cikkek lekérdezésekor:", error);
            setArticles({});
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm]);

    useEffect(() => {
        // Debounce mechanizmus, hogy ne fusson le minden karakter leütésekor a keresés
        const debounceFetch = setTimeout(() => {
            fetchArticles();
        }, 300);
        return () => clearTimeout(debounceFetch);
    }, [searchTerm, fetchArticles]);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Súgó Központ</h1>
                <input
                    type="search"
                    placeholder="Keress a kérdések között..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {isLoading ? (
                <p>Betöltés...</p>
            ) : (
                Object.keys(articles).length > 0 ? (
                    Object.keys(articles).map(category => (
                        <section key={category} className={styles.categorySection}>
                            {/* A kategória nevének formázása */}
                            <h2>{category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h2>
                            {articles[category].map((article, index) => (
                                <HelpArticle key={`${category}-${index}`} article={article} />
                            ))}
                        </section>
                    ))
                ) : (
                    <p>{searchTerm.length > 2 ? 'Nincs találat a keresésre.' : 'Kezdj el gépelni a kereséshez...'}</p>
                )
            )}
        </div>
    );
};

export default HelpCenterPage;