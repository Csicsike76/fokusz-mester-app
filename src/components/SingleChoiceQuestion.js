import React, { useEffect, useState } from 'react';
import styles from './QuestionStyles.module.css';

const SingleChoiceQuestion = ({ question, userAnswer, onAnswerChange, showResults }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (showResults) setIsCollapsed(false);
  }, [showResults]);

  // --- KEZDŐDIK A JAVÍTÁS ---
  // "Adapter" logika, ami normalizálja a bejövő `question` objektumot.
  // Eldönti, hogy régi vagy új formátumú-e, és átalakítja egy egységes formára.
  const getNormalizedQuestion = (q) => {
    // Ha a 'description' kulcs létezik, akkor ez az új formátum, nincs teendő.
    if (q.description && Array.isArray(q.options)) {
      return {
        id: q.id,
        description: q.description,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
      };
    }
    
    // Ha a 'question' kulcs létezik, akkor ez a régi formátum, átalakítjuk.
    if (q.question && typeof q.answers === 'object') {
      return {
        id: q.id,
        description: q.question, // 'question' -> 'description'
        options: Object.values(q.answers), // {a:"...", b:"..."} -> ["...", "..."]
        answer: q.answers[q.correct], // a helyes válasz kulcs ("b") alapján kikeresi a tényleges választ
        explanation: q.explanation,
      };
    }

    // Ha egyik sem, visszatérünk egy üres struktúrával a hibák elkerülése végett.
    console.error("Ismeretlen kérdés formátum:", q);
    return { id: 'unknown', description: 'Hiba a kérdés betöltésekor.', options: [], answer: '', explanation: '' };
  };

  const normalizedQuestion = getNormalizedQuestion(question);
  // --- EDDIG TART A JAVÍTÁS ---


  // Innentől a kód többi része a `normalizedQuestion` objektumot használja,
  // ami már garantáltan a helyes formátumú.
  
  return (
    <div className={styles.questionBlock}>
      <p className={styles.description}>{normalizedQuestion.description}</p>

      <div className={styles.optionsGrid}>
        {normalizedQuestion.options.map((option, index) => {
          let labelClass = styles.optionLabel;
          const isSelected = userAnswer === option;
          const isCorrect = normalizedQuestion.answer === option;

          if (showResults) {
            if (isCorrect) labelClass += ` ${styles.correct}`;
            else if (isSelected && !isCorrect) labelClass += ` ${styles.incorrect}`;
          } else if (isSelected) {
            labelClass += ` ${styles.selected}`;
          }

          return (
            <label key={index} className={labelClass}>
              <input
                type="radio"
                name={`question-${normalizedQuestion.id}`}
                value={option}
                checked={isSelected}
                onChange={() => onAnswerChange(normalizedQuestion.id, option)}
                style={{ display: 'none' }}
                disabled={showResults}
              />
              {option}
            </label>
          );
        })}
      </div>

      {showResults && (
        <div className={styles.expWrapper}>
          <button
            type="button"
            className={styles.expToggle}
            onClick={() => setIsCollapsed(v => !v)}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? 'Magyarázat megnyitása' : 'Magyarázat elrejtése'}
          </button>

          <div className={`${styles.explanation} ${isCollapsed ? styles.explanationCollapsed : ''}`}>
            {normalizedQuestion.explanation && String(normalizedQuestion.explanation).trim().length > 0
              ? normalizedQuestion.explanation
              : "Ehhez a kérdéshez nincs magyarázat."}
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleChoiceQuestion;