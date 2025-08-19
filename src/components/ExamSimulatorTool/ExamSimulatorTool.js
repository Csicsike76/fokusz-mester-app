import React, { useState, useEffect } from 'react';
import styles from './ExamSimulatorTool.module.css';

const ExamSimulatorTool = ({ toolData }) => {
  // State-ek az űrlap mezőinek tárolására
  const [formData, setFormData] = useState({
    subject: toolData.fields.find(f => f.id === 'subject').options[0],
    grade: '',
    numQuestions: toolData.fields.find(f => f.id === 'numQuestions').defaultValue || '10',
    focusTopics: '',
  });

  // State a visszajelző üzenetnek
  const [feedback, setFeedback] = useState({ message: '', type: 'idle' });

  // Dinamikusan frissítjük az évfolyam listát, ha a tantárgy változik
  useEffect(() => {
    const availableGrades = toolData.gradeDependencyMap[formData.subject] || [];
    setFormData(prev => ({ ...prev, grade: availableGrades[0] }));
  }, [formData.subject, toolData.gradeDependencyMap]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let finalPrompt = toolData.systemPromptTemplate;
    
    // Placeholder-ek cseréje a template-ben
    finalPrompt = finalPrompt.replace('{{subject}}', formData.subject);
    finalPrompt = finalPrompt.replace('{{grade}}', formData.grade);
    finalPrompt = finalPrompt.replace(/{{numQuestions}}/g, formData.numQuestions); // /g a globális cseréhez
    finalPrompt = finalPrompt.replace('{{focusTopics}}', formData.focusTopics || toolData.focusTopicsDefault);
    finalPrompt = finalPrompt.replace('{{knowledgeBase}}', toolData.knowledgeBase);
    
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
    <div className={styles.simulatorCard}>
        <div className={styles.simulatorHeader}>
            <div className={styles.icon}>{toolData.icon}</div>
            <h1>{toolData.header}</h1>
            <p>{toolData.subheader}</p>
        </div>
        <div className={styles.simulatorBody}>
            <form onSubmit={handleSubmit}>
                {/* Tantárgy */}
                <div className={styles.formGroup}>
                    <label htmlFor="subject">{toolData.fields.find(f => f.id === 'subject').label}</label>
                    <select id="subject" value={formData.subject} onChange={handleInputChange}>
                        {toolData.fields.find(f => f.id === 'subject').options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
                {/* Évfolyam */}
                <div className={styles.formGroup}>
                    <label htmlFor="grade">{toolData.fields.find(f => f.id === 'grade').label}</label>
                    <select id="grade" value={formData.grade} onChange={handleInputChange}>
                        {(toolData.gradeDependencyMap[formData.subject] || []).map(grade => <option key={grade} value={grade}>{grade}</option>)}
                    </select>
                </div>
                {/* Kérdések száma */}
                <div className={styles.formGroup}>
                    <label htmlFor="numQuestions">{toolData.fields.find(f => f.id === 'numQuestions').label}</label>
                    <select id="numQuestions" value={formData.numQuestions} onChange={handleInputChange}>
                        {toolData.fields.find(f => f.id === 'numQuestions').options.map(opt => <option key={opt.value} value={opt.value}>{opt.text}</option>)}
                    </select>
                </div>
                {/* Fókusz Témakörök */}
                <div className={styles.formGroup}>
                    <label htmlFor="focusTopics">{toolData.fields.find(f => f.id === 'focusTopics').label}</label>
                    <input type="text" id="focusTopics" value={formData.focusTopics} onChange={handleInputChange} placeholder={toolData.fields.find(f => f.id === 'focusTopics').placeholder} />
                </div>
                <button type="submit" className={styles.btnSubmit}>{toolData.buttonText}</button>
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

export default ExamSimulatorTool;