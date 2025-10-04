// src/components/QuizLobby/SuggestedLearningPathModal.js

import React, { useState, useEffect } from 'react';
import styles from './SuggestedLearningPathModal.module.css';
import { FaTimes } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || '';

const SuggestedLearningPathModal = ({ isOpen, onClose, quizSlug }) => {
    const [activeTab, setActiveTab] = useState('easy'); // Alapértelmezett beállítás 'easy'-re
    const [lessons, setLessons] = useState({});
    const [selectedLessons, setSelectedLessons] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && quizSlug) {
            const fetchLearningPaths = async () => {
                setIsLoading(true);
                setError('');
                try {
                    const response = await fetch(`${API_URL}/api/learning-paths/${quizSlug}`);
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Hiba a tanulási útvonalak lekérdezésekor.');
                    }
                    const data = await response.json();
                    if (data.success) {
                        setLessons(data.learningPaths);
                    } else {
                        throw new Error(data.message || 'A tanulási útvonalak betöltése sikertelen.');
                    }
                } catch (err) {
                    setError(err.message);
                    console.error("Fetch error for learning paths:", err);
                    setLessons({});
                } finally {
                    setIsLoading(false);
                    setSelectedLessons([]);
                }
            };
            fetchLearningPaths();
        } else if (!isOpen) {
            setLessons({});
            setSelectedLessons([]);
            setActiveTab('easy'); // Alapértelmezett visszaállítása
            setError('');
        }
    }, [isOpen, quizSlug]);

    if (!isOpen) return null;

    const currentLessons = lessons[activeTab] || [];

    const handleCheckboxChange = (lessonId) => {
        setSelectedLessons(prevSelected =>
            prevSelected.includes(lessonId)
                ? prevSelected.filter(id => id !== lessonId)
                : [...prevSelected, lessonId]
        );
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <FaTimes />
                </button>
                <h2 className={styles.modalTitle}>Javasolt Tanulási Útvonal</h2>

                {isLoading ? (
                    <p className={styles.loadingText}>Tanulási útvonalak betöltése...</p>
                ) : error ? (
                    <p className={styles.errorText}>Hiba: {error}</p>
                ) : (
                    <>
                        <div className={styles.tabContainer}>
                            {['easy', 'medium', 'hard'].map(tab => (
                                <button
                                    key={tab}
                                    className={`${styles.tabButton} ${activeTab === tab ? styles.activeTab : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className={styles.lessonListContainer}>
                            {currentLessons.length > 0 ? (
                                currentLessons.map(lesson => (
                                    <div key={lesson.id} className={styles.lessonItem}>
                                        <input
                                            type="checkbox"
                                            id={`lesson-${lesson.id}`}
                                            checked={selectedLessons.includes(lesson.id)}
                                            onChange={() => handleCheckboxChange(lesson.id)}
                                            className={styles.lessonCheckbox}
                                        />
                                        <label htmlFor={`lesson-${lesson.id}`} className={styles.lessonLabel}>
                                            <Link to={`/lesson/${lesson.content_slug}`} onClick={onClose} className={styles.lessonLink}>
                                                <span className={styles.lessonTitle}>{lesson.title}</span>
                                                <span className={styles.lessonDescription}>{lesson.description}</span>
                                            </Link>
                                        </label>
                                    </div>
                                ))
                            ) : (
                                <p className={styles.noLessonsText}>Nincsenek elérhető leckék ehhez a szinthez.</p>
                            )}
                        </div>

                        <button className={styles.startLearningButton} disabled={selectedLessons.length === 0}>
                            Kiválasztott leckék indítása ({selectedLessons.length})
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default SuggestedLearningPathModal;