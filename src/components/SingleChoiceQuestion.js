
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

    return (
        <div className={styles.questionBlock}>
            <p className={styles.description}>{question.description}</p>
            <div className={styles.optionsGrid}>
                {options.map((option, index) => {
                    let classNames = styles.optionLabel;
                    const isSelected = userAnswer === option;
                    const isCorrect = question.answer === option;
                    let icon = null;

                    if (showResults) {
                        if (isCorrect) {
                            classNames += ` ${styles.correct}`;
                            icon = <span className={styles.icon}>✔</span>;
                        } else if (isSelected && !isCorrect) {
                            classNames += ` ${styles.incorrect}`;
                            icon = <span className={styles.icon}>✘</span>;
                        }
                    } else if (isSelected) {
                        classNames += ` ${styles.selected}`;
                    }

                    return (
                        <label key={index} className={classNames}>
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
        </div>
    );
};

export default SingleChoiceQuestion;
