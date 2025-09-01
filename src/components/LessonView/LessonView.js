import React, { useState, useEffect } from 'react';
import styles from './LessonView.module.css';
import WorkshopContent from '../WorkshopContent/WorkshopContent';
import { useAuth } from '../../context/AuthContext'; // HOZZÁADVA: AuthContext importálása
import { API_URL } from '../../config/api'; // HOZZÁADVA: API URL importálása

const LessonView = ({ lessonData }) => {
    const { token, user } = useAuth(); // HOZZÁADVA: Token és user adatok lekérése
    const [tocOpen, setTocOpen] = useState(false);
    const [expandedChapters, setExpandedChapters] = useState({});

    useEffect(() => {
        if (window.innerWidth > 1024 && lessonData && lessonData.toc) {
            const allChapterIds = lessonData.toc.reduce((acc, chapter) => {
                acc[chapter.id] = true;
                return acc;
            }, {});
            setExpandedChapters(allChapterIds);
        }
    }, [lessonData]);

    // HOZZÁADVA: useEffect a lecke megtekintésének rögzítésére
    useEffect(() => {
        const logLessonView = async () => {
            // Csak bejelentkezett diákok esetén fusson le
            if (token && user?.role === 'student' && lessonData?.slug) {
                try {
                    await fetch(`${API_URL}/api/lesson/viewed`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ slug: lessonData.slug })
                    });
                    console.log(`Lecke megtekintése rögzítve: ${lessonData.slug}`);
                } catch (error) {
                    console.error('Hiba a lecke megtekintésének rögzítésekor:', error);
                }
            }
        };

        logLessonView();
    }, [token, user, lessonData?.slug]); // A függőségi lista biztosítja, hogy csak egyszer fusson le betöltéskor

    const handleAnchorClick = (e, id) => {
        e.preventDefault();
        const target = document.getElementById(id);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window.innerWidth <= 1024) {
                setTocOpen(false);
            }
        }
    };

    const toggleChapterExpansion = (e, chapterId) => {
        e.preventDefault();
        e.stopPropagation();
        setExpandedChapters(prev => ({
            ...prev,
            [chapterId]: !prev[chapterId],
        }));
    };

    if (!lessonData || !lessonData.toc || !lessonData.questions) {
        return <p className={styles.loadingError}>A tananyag adatai hiányosak vagy nem tölthetők be.</p>;
    }
    
    return (
        <div className={styles.container}>
            <button
                className={styles.tocToggle}
                onClick={() => setTocOpen(!tocOpen)}
                aria-expanded={tocOpen}
                aria-controls="toc-nav"
            >
                📚 Tartalomjegyzék
            </button>

            <div
                className={`${styles.tocOverlay} ${tocOpen ? styles.open : ''}`}
                onClick={() => setTocOpen(false)}
            />

            <nav id="toc-nav" className={`${styles.toc} ${tocOpen ? styles.open : ''}`}>
                <h2>Tartalomjegyzék</h2>
                <ul>
                    {lessonData.toc.map((chapter) => (
                        <li key={chapter.id}>
                            <a
                                href={`#${chapter.id}`}
                                onClick={(e) => handleAnchorClick(e, chapter.id)}
                                className={styles.chapterTitle}
                            >
                                {chapter.title}
                            </a>

                            {chapter.subheadings && chapter.subheadings.length > 0 && (
                                <>
                                    <button 
                                        onClick={(e) => toggleChapterExpansion(e, chapter.id)} 
                                        className={styles.expandButton}
                                        aria-expanded={!!expandedChapters[chapter.id]}
                                    >
                                        {expandedChapters[chapter.id] ? '−' : '+'}
                                    </button>
                                    <ul className={`${styles.subList} ${expandedChapters[chapter.id] ? styles.expanded : ''}`}>
                                        {chapter.subheadings.map((sub) => (
                                            <li key={sub.id}>
                                                <a href={`#${sub.id}`} onClick={(e) => handleAnchorClick(e, sub.id)}>
                                                    {sub.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>

            <main className={styles.mainContent}>
                <h1>{lessonData.title}</h1>
                <WorkshopContent sections={lessonData.questions} />
            </main>
        </div>
    );
};

export default LessonView;