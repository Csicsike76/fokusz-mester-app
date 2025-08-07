import React from 'react';
import styles from './QuestionStyles.module.css';

const SingleChoiceQuestion = ({ question, userAnswer, onAnswerChange, showResults }) => {
    let options = [];

    if (Array.isArray(question.options)) {
        options = question.options; // már tömb
    } else {
        try {
            const parsedOptions = JSON.parse(question.options);
            if (Array.isArray(parsedOptions)) {
                options = parsedOptions;
            } else {
                console.error("Nem tömb típusú opciók:", question.options);
            }
        } catch (e) {
            console.error("Nem sikerült feldolgozni a JSON opciókat:", question.options, e);
        }
    }

    const getIcon = (isCorrect, isSelected) => {
        if (!showResults) return null;
        if (isCorrect) return <span className={styles.icon}>✔</span>;
        if (isSelected && !isCorrect) return <span className={styles.icon}>✘</span>;
        return null;
    };

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

                    const icon = getIcon(isCorrect, isSelected);

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
                            {option} {icon}
                        </label>
                    );
                })}
            </div>
            {showResults && question.explanation && (
                <div className={styles.explanation}>
                    {question.explanation}
                </div>
            )}
        </div>
    );
};

export default SingleChoiceQuestion;
