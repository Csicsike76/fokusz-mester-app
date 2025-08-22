import React, { useState, useEffect, useCallback } from 'react';
import styles from './HelpCenterPage.module.css';

// VÉGLEGES JAVÍTÁS: Az API cím dinamikus beállítása a környezet alapján
const API_URL = process.env.NODE_ENV === 'production'
    ? 'https://fokusz-mester-backend.onrender.com'
    : 'http://localhost:3001';

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
        const url = searchTerm.length > 2 ? `${API_URL}/api/help?q=${searchTerm}` : `${API_URL}/api/help`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                setArticles(data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm]);

    useEffect(() => {
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
                            <h2>{category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h2>
                            {articles[category].map(article => (
                                <HelpArticle key={article.id} article={article} />
                            ))}
                        </section>
                    ))
                ) : (
                    <p>Nincs találat a keresésre.</p>
                )
            )}
        </div>
    );
};

export default HelpCenterPage;