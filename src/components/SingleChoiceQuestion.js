import React from 'react';
import styles from './QuestionStyles.module.css';

const SingleChoiceQuestion = ({ question, userAnswer, onAnswerChange }) => {
    // EZ A RÉSZ A KULCS:
    // Létrehozunk egy 'options' változót, alapból üres tömbként.
    let options = [];

    try {
        // A 'question.options' egy string formátumú tömb, pl.: '["válasz A", "válasz B"]'.
        // A JSON.parse() paranccsal alakítjuk át valódi JavaScript tömbbé.
        const parsedOptions = JSON.parse(question.options);
        
        // Biztosra megyünk, hogy az eredmény valóban egy tömb, mielőtt használnánk.
        if (Array.isArray(parsedOptions)) {
            options = parsedOptions;
        }
    } catch (e) {
        // Ha bármilyen hiba történik a feldolgozás során (pl. hibás a JSON formátum),
        // a konzolra kiírjuk a hibát, de az oldal nem omlik össze,
        // az 'options' tömb pedig üres marad.
        console.error("Hiba a kérdés opcióinak feldolgozásakor:", question.description, e);
    }

    return (
        <div className={styles.questionBlock}>
            <p className={styles.description}>{question.description}</p>
            <div className={styles.optionsGrid}>
                {/* Most már a helyesen feldolgozott 'options' tömbön megyünk végig,
                    és minden elemhez létrehozunk egy kattintható 'label'-t. */}
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
                            style={{ display: 'none' }} // A böngésző rádiógombját elrejtjük
                        />
                        {option} {/* Maga a válasz szövege */}
                    </label>
                ))}
            </div>
        </div>
    );
};

export default SingleChoiceQuestion;