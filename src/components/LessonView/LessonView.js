// src/components/LessonView/LessonView.js

import React, { useState, useEffect } from 'react';
import styles from './LessonView.module.css';
import WorkshopContent from '../WorkshopContent/WorkshopContent';

const LessonView = ({ lessonData }) => {
    const [tocOpen, setTocOpen] = useState(false);

    // Smooth scroll horgonyokra
    const handleAnchorClick = (e, id) => {
        e.preventDefault();
        const target = document.getElementById(id);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (tocOpen) setTocOpen(false); // mobilon automatikusan becsukjuk
        }
    };

    return (
        <div className={styles.container}>
            {/* TOC Hamburger mobilra */}
            <button 
                className={styles.tocToggle} 
                onClick={() => setTocOpen(!tocOpen)}
            >
                📚 Tartalomjegyzék
            </button>

            {/* TOC panel */}
            <nav className={`${styles.toc} ${tocOpen ? styles.open : ''}`}>
                <h2>Tartalomjegyzék</h2>
                <ul>
                    {lessonData.toc.map((chapter) => (
                        <li key={chapter.id}>
                            <a href={`#${chapter.id}`} onClick={(e) => handleAnchorClick(e, chapter.id)}>
                                {chapter.title}
                            </a>
                            {chapter.subheadings && chapter.subheadings.length > 0 && (
                                <ul>
                                    {chapter.subheadings.map((sub) => (
                                        <li key={sub.id}>
                                            <a href={`#${sub.id}`} onClick={(e) => handleAnchorClick(e, sub.id)}>
                                                {sub.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Fő tartalom */}
            <main className={styles.mainContent}>
                <h1>{lessonData.title}</h1>
                {lessonData.questions.map((chapter) => (
                    <section key={chapter.id} id={chapter.id}>
                        <h2>{chapter.title}</h2>
                        {chapter.content.map((item) => (
                            <div key={item.id} id={item.id}>
                                <WorkshopContent contentItem={item} />
                            </div>
                        ))}
                    </section>
                ))}
            </main>
        </div>
    );
};

export default LessonView;
