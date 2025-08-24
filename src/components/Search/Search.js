import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './Search.module.css';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || '';

const Search = () => {
    const { token } = useAuth();
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
                    const headers = { 'Content-Type': 'application/json' };
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                    
                    // VÉGLEGES JAVÍTÁS: A kérés az új, dedikált /api/search végpontra mutat
                    const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(searchTerm)}`, { headers });
                    const data = await response.json();
                    
                    if (data.success && Array.isArray(data.data)) {
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
                    setShowResults(true); 
                } else {
                    setShowResults(false);
                }
            }
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, token]);

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
        return `/tananyag/${item.slug}`;
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