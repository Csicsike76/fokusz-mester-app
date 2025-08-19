// Fájl: src/components/GoalPlannerTool/GoalPlannerTool.js

import React, { useState } from 'react';
import styles from './GoalPlannerTool.module.css';

const GoalPlannerTool = ({ toolData }) => {
    const [mainGoal, setMainGoal] = useState('');
    const [currentSituation, setCurrentSituation] = useState('');
    const [timeCommitment, setTimeCommitment] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isError, setIsError] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();
        
        const template = toolData.systemPromptTemplate;

        // Behelyettesítjük az űrlap adatait a sablonba
        const finalPrompt = template
            .replace('{{main-goal}}', mainGoal)
            .replace('{{current-situation}}', currentSituation || 'Nincs megadva')
            .replace('{{time-commitment}}', timeCommitment || 'Nincs megadva');

        navigator.clipboard.writeText(finalPrompt.trim()).then(() => {
            setFeedback('Szuper! A személyre szabott tervedet a vágólapra másoltam. Csak illeszd be (Ctrl+V) a megnyíló Gemini ablakba!');
            setIsError(false);
            window.open('https://gemini.google.com/app', '_blank');

            setTimeout(() => setFeedback(''), 5000); // 5 mp után eltűnik az üzenet

        }).catch(err => {
            setFeedback('Hoppá! A másolás nem sikerült. Kérlek, próbáld újra!');
            setIsError(true);
            console.error('Hiba a másolás során: ', err);
        });
    };

    return (
        <div className={styles.plannerCard}>
            <form onSubmit={handleSubmit}>
                {toolData.steps.map(step => (
                    <div key={step.step} className={styles.plannerStep}>
                        <h2><span className={styles.stepNumber}>{step.step}</span>{step.title}</h2>
                        
                        {step.fields && step.fields.map(field => (
                            <div key={field.id} className={styles.formGroup}>
                                <label htmlFor={field.id}>{field.label}</label>
                                {field.type === 'textarea' ? (
                                    <textarea
                                        id={field.id}
                                        rows={field.rows}
                                        placeholder={field.placeholder}
                                        value={currentSituation}
                                        onChange={(e) => setCurrentSituation(e.target.value)}
                                    />
                                ) : (
                                    <input
                                        type={field.type}
                                        id={field.id}
                                        placeholder={field.placeholder}
                                        required={field.required}
                                        value={field.id === 'main-goal' ? mainGoal : timeCommitment}
                                        onChange={(e) => {
                                            if (field.id === 'main-goal') setMainGoal(e.target.value);
                                            if (field.id === 'time-commitment') setTimeCommitment(e.target.value);
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                        
                        {step.content && (
                            <div dangerouslySetInnerHTML={{ __html: step.content }} />
                        )}

                        {step.buttonText && (
                            <button type="submit" className={styles.btnSubmit}>
                                {step.buttonText}
                            </button>
                        )}
                    </div>
                ))}
                {feedback && (
                    <div className={`${styles.feedbackMessage} ${isError ? styles.feedbackError : ''}`}>
                        {feedback}
                    </div>
                )}
            </form>
        </div>
    );
};

export default GoalPlannerTool;