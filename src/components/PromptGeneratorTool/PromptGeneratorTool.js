import React, { useState } from 'react';
import styles from './PromptGeneratorTool.module.css';

const PromptGeneratorTool = ({ toolData }) => {
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState({ message: '', type: 'idle' });

  const handleSubmit = (event) => {
    event.preventDefault();

    // A {{userInput}} jelölőt kicseréljük a felhasználó által beírt szövegre
    const finalPrompt = toolData.systemPromptTemplate.replace(
      '{{userInput}}',
      userInput
    );

    navigator.clipboard.writeText(finalPrompt.trim()).then(() => {
        setFeedback({
            message: (
                <>
                    {toolData.successMessage}
                    <br/><br/>
                    <a href={toolData.linkUrl} target="_blank" rel="noopener noreferrer" className={`${styles.btn} ${styles.btnOpen}`}>
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
    <div className={styles.compassCard}>
      <div className={styles.compassHeader}>
        <div className={styles.icon}>{toolData.icon}</div>
        <h1>{toolData.header}</h1>
        <p>{toolData.subheader}</p>
      </div>
      <div className={styles.compassBody}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="user-problem">{toolData.label}</label>
            <textarea
              id="user-problem"
              rows="4"
              placeholder={toolData.placeholder}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              required
            ></textarea>
          </div>
          <button type="submit" className={`${styles.btn} ${styles.btnPrepare}`}>
            {toolData.buttonText}
          </button>
          
          {feedback.type !== 'idle' && (
             <div className={`${styles.feedbackMessage} ${styles[feedback.type]}`}>
                {feedback.message}
            </div>
          )}

        </form>
      </div>
    </div>
  );
};

export default PromptGeneratorTool;