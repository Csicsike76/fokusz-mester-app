import React from 'react';
import styles from './QuestionStyles.module.css';

const SingleChoiceQuestion = ({ question, userAnswer, onAnswerChange, showResults }) => {
    let options = [];

    // 🔐 Biztonságosan kezeljük az opciókat
    if (Array.isArray(question.options)) {
        options = question.options;
    } else {
        try {
            options = JSON.parse(question.options);
        } catch (e) {
            console.error("Nem sikerült feldolgozni a kérdés opcióit:", question.options, e);
        }
    }

    return (
        <div className={styles.questionBlock}>
            <p className={styles.description}>{question.description}</p>
            <div className={styles.optionsGrid}>
                {options.map((option, index) => {
                    let labelClass = styles.optionLabel;
                    const isSelected = userAnswer === option;
                    const isCorrect = question.answer === option;

                    if (showResults) {
                        if (isCorrect) {
                            labelClass += ` ${styles.correct}`;
                        } else if (isSelected && !isCorrect) {
                            labelClass += ` ${styles.incorrect}`;
                        }
                    } else if (isSelected) {
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
                                disabled={showResults}
                            />
                            {option}
                        </label>
                    );
                })}
            </div>

            {/* Magyarázat minden kérdés alatt, ha vége a kvíznek */}
            {showResults && (
                <div className={styles.explanation}>
                    {question.explanation || "Ehhez a kérdéshez nincs magyarázat."}
                </div>
            )}
        </div>
    );
};

export default SingleChoiceQuestion;
