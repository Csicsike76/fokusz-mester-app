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
        console.error("Hiba az opciók feldolgozásakor:", question.description, e);
    }

    return (
        <div className={styles.questionBlock}>
            <p className={styles.description}>{question.description}</p>
            <div className={styles.optionsGrid}>
                {options.map((option, index) => {
                    // Itt határozzuk meg a stílusokat a kiértékelés után
                    let labelClass = styles.optionLabel;
                    const isSelected = userAnswer === option;
                    const isCorrect = question.answer === option;

                    if (showResults) {
                        if (isCorrect) {
                            // A helyes válasz mindig zöld lesz
                            labelClass += ` ${styles.correct}`;
                        } else if (isSelected && !isCorrect) {
                            // A felhasználó által adott ROSSZ válasz piros lesz
                            labelClass += ` ${styles.incorrect}`;
                        }
                    } else if (isSelected) {
                        // Választás közben kék marad
                        labelClass += ` ${styles.selected}`;
                    }

                    return (
                        <label key={index} className={labelClass}>
                            <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={option}
                                checked={isSelected}
                                onChange={() => onAnswerChange(question.id, option)}
                                style={{ display: 'none' }}
                                disabled={showResults} // Letiltjuk a további választást
                            />
                            {option}
                        </label>
                    );
                })}
            </div>
            {/* A MAGYARÁZAT MEGJELENÍTÉSE */}
            {/* Ez a rész csak akkor jelenik meg, ha a showResults igaz */}
            {showResults && question.explanation && (
                <div className={styles.explanation}>
                    {question.explanation}
                </div>
            )}
        </div>
    );
};

export default SingleChoiceQuestion;