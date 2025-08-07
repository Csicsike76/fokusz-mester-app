import React from 'react';
import styles from './QuestionStyles.module.css';

const SingleChoiceQuestion = ({ question, userAnswer, onAnswerChange }) => {
    // JAVÍTÁS ITT: Biztonságos módon feldolgozzuk az opciókat
    let options = [];
    try {
        // A question.options egy string (pl. '["válasz1", "válasz2"]').
        // A JSON.parse() alakítja át valódi tömbbé: ["válasz1", "válasz2"].
        const parsedOptions = JSON.parse(question.options);
        
        // Ellenőrizzük, hogy az eredmény valóban egy tömb-e
        if (Array.isArray(parsedOptions)) {
            options = parsedOptions;
        }
    } catch (e) {
        console.error("Hiba a JSON opciók feldolgozása közben:", e);
        // Ha hiba történik (pl. a question.options nem valid JSON),
        // az 'options' egy üres tömb marad, így az oldal nem omlik össze.
    }

    return (
        <div className={styles.questionBlock}>
            <p className={styles.description}>{question.description}</p>
            <div className={styles.optionsGrid}>
                {/* Most már az 'options' tömbön végigmegyünk, amiben benne vannak a válaszlehetőségek */}
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
                            style={{ display: 'none' }} // A radio gombot elrejtjük, a label-re kattintunk
                        />
                        {option}
                    </label>
                ))}
            </div>
        </div>
    );
};
export default SingleChoiceQuestion;