import React from 'react';
import styles from './QuestionStyles.module.css';

const SingleChoiceQuestion = ({ question, userAnswer, onAnswerChange, showResults }) => {
  let options = [];
  try {
    const parsedOptions = JSON.parse(question.options);
    if (Array.isArray(parsedOptions)) {
      options = parsedOptions;
    }
  } catch (e) {
    console.error("Hiba az opciók JSON feldolgozása közben a kérdésnél:", question.description, e);
  }

  // Segítő függvény ikonokhoz
  const getIcon = (isCorrect) => {
    return isCorrect ? '✔' : '✘';
  };

  return (
    <div className={styles.questionBlock}>
      <p className={styles.description}>{question.description}</p>
      <div className={styles.optionsGrid}>
        {options.map((option, index) => {
          // Kiértékelés csak ha mutatjuk az eredményt
          let className = styles.optionLabel;
          let icon = null;

          if (showResults) {
            if (option === question.answer) {
              className += ` ${styles.correct}`;  // zöld háttér
              icon = getIcon(true);
            } else if (option === userAnswer && userAnswer !== question.answer) {
              className += ` ${styles.incorrect}`; // piros háttér
              icon = getIcon(false);
            }
          } else {
            // Nincs eredmény megjelenítés, csak a kijelölt válasz jelölése
            if (userAnswer === option) {
              className += ` ${styles.selected}`;
            }
          }

          return (
            <label key={index} className={className}>
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option}
                checked={userAnswer === option}
                onChange={() => onAnswerChange(question.id, option)}
                disabled={showResults}
                style={{ display: 'none' }}
              />
              {option} {icon && <span className={styles.icon}>{icon}</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default SingleChoiceQuestion;
