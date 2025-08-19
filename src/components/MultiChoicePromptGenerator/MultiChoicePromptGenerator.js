import React, { useState } from 'react';
import styles from './MultiChoicePromptGenerator.module.css';

const MultiChoicePromptGenerator = ({ toolData }) => {
  const [feedback, setFeedback] = useState({ message: '', type: 'idle' });

  const handleDebateClick = (topicValue) => {
    // A {{topic}} jelölőt kicseréljük a kiválasztott téma értékére
    const finalPrompt = toolData.systemPromptTemplate.replace(
      '{{topic}}',
      topicValue
    );

    navigator.clipboard.writeText(finalPrompt.trim()).then(() => {
        setFeedback({
            message: (
                <>
                    {toolData.successMessage}
                    <br/><br/>
                    <a href={toolData.linkUrl} target="_blank" rel="noopener noreferrer" className={styles.feedbackLink}>
                        {toolData.linkButtonText}
                    </a>
                    <br/><br/>
                    <small>{toolData.successNote}</small>
                </>
            ),
            type: 'success'
        });
    }).catch(err => {
        setFeedback({ 
            message: '❌ Hiba! A vágólapra másolás nem sikerült. Kérlek, próbáld újra!',
            type: 'error'
        });
    });
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{toolData.header}</h1>
        <p>{toolData.subheader}</p>
      </header>

      <div className={styles.topicGrid}>
        {toolData.choices.map((choice, index) => (
          <div key={index} className={styles.topicCard}>
            <h3>{choice.title}</h3>
            <p>{choice.description}</p>
            <button
              className={styles.btnDebate}
              onClick={() => handleDebateClick(choice.topicValue)}
            >
              {toolData.buttonText}
            </button>
          </div>
        ))}
      </div>
      
      {feedback.type !== 'idle' && (
         <div className={`${styles.feedbackMessage} ${styles[feedback.type]}`}>
            {feedback.message}
        </div>
      )}
    </div>
  );
};

export default MultiChoicePromptGenerator;