import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './Search.module.css';

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const Search = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (searchTerm.length > 2) {
                setIsLoading(true);
                setShowResults(true);
                try {
                    const response = await fetch(`${API_URL}/api/curriculums?q=${searchTerm}`);
                    const data = await response.json();
                    if (data.success) {
                        setResults(data.data);
                    } else {
                        setResults([]);
                    }
                } catch (error) {
                    console.error("Keresési hiba:", error);
                    setResults([]);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
                if (searchTerm.length > 0) {
                    setShowResults(true); // Mutatjuk a "írj többet" üzenetet
                } else {
                    setShowResults(false);
                }
            }
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const getLinkPath = (item) => {
        const pathPrefix = item.category.includes('tool') ? '/eszkoz' : '/kviz';
        return `${pathPrefix}/${item.slug}`;
    };

    return (
        <div className={styles.searchContainer} ref={searchRef}>
            <input
                type="text"
                placeholder="Keress a tananyagban..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.length > 0 && setShowResults(true)}
            />
            {showResults && (
                <div className={styles.resultsDropdown}>
                    {isLoading ? (
                        <div className={styles.resultItem}>Keresés...</div>
                    ) : results.length > 0 ? (
                        results.map(item => (
                            <Link 
                                to={getLinkPath(item)} 
                                key={item.slug} 
                                className={styles.resultItem}
                                onClick={() => setShowResults(false)}
                            >
                                {item.title}
                            </Link>
                        ))
                    ) : (
                        <div className={styles.resultItem}>
                            {searchTerm.length > 2 ? 'Nincs találat.' : 'Írj be legalább 3 karaktert...'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Search;