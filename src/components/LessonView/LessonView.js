import React, { useState } from 'react';
import styles from './LessonView.module.css';
import WorkshopContent from '../WorkshopContent/WorkshopContent';

const LessonView = ({ lessonData }) => {
    const [tocOpen, setTocOpen] = useState(false);
    const [expandedChapters, setExpandedChapters] = useState({});

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
                {lessonData.questions.map((section) => (
                    <section key={section.id} id={section.id} className={styles.contentSection}>
                        <h2>{section.title}</h2>
                        <WorkshopContent sections={section.content} />
                    </section>
                ))}
            </main>
        </div>
    );
};

export default LessonView;