// Fájl: src/components/LessonView/LessonView.js

import React from 'react';
import styles from './LessonView.module.css';
import WorkshopContent from '../WorkshopContent/WorkshopContent'; // Ezt fogjuk használni a tartalomhoz

const LessonView = ({ title, toc, sections }) => {
  // Biztonsági ellenőrzés, ha hiányoznának az adatok
  if (!sections || sections.length === 0) {
    return <p className={styles.loadingError}>A tananyag fejezetei nem tölthetők be.</p>;
  }

  return (
    <div className={styles.container}>
      {toc && toc.length > 0 && (
        <nav className={styles.toc}>
          <h2>Tartalomjegyzék</h2>
          <ul>
            {toc.map(chapter => (
              <li key={chapter.id}>
                <a href={`#${chapter.id}`}>{chapter.title}</a>
                {chapter.subheadings && chapter.subheadings.length > 0 && (
                  <ul>
                    {chapter.subheadings.map(sub => (
                      <li key={sub.id}><a href={`#${sub.id}`}>{sub.title}</a></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
      
      <main className={styles.mainContent}>
        <h1>{title}</h1>
        {/* A fő tartalom megjelenítéséhez a javított WorkshopContent komponenst használjuk */}
        <WorkshopContent sections={sections} />
      </main>
    </div>
  );
};

export default LessonView;