import React from 'react';
    import styles from './QuestionStyles.module.css'; // Egy közös stíluslapot fogunk használni

    const SingleChoiceQuestion = ({ question, userAnswer, onAnswerChange }) => {
        const options = JSON.parse(question.options || '[]');

        return (
            <div className={styles.questionBlock}>
                <p className={styles.description}>{question.description}</p>
                <div className={styles.optionsGrid}>
                    {options.map((option, index) => (
                        <label 
                            key={index} 
                            className={`${styles.optionLabel} ${userAnswer === option ? styles.selected : ''}`}
                        >
                            <input
                                type="radio"
                                name={`question-${question.id}`}
                                value={option}
                                checked={userAnswer === option}
                                onChange={() => onAnswerChange(question.id, option)}
                                style={{ display: 'none' }}
                            />
                            {option}
                        </label>
                    ))}
                </div>
            </div>
        );
    };
    export default SingleChoiceQuestion;