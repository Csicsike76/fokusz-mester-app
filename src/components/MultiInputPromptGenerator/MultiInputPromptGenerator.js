import React, { useState } from 'react';
import styles from './MultiInputPromptGenerator.module.css';

const MultiInputPromptGenerator = ({ toolData }) => {
  // Dinamikusan létrehozzuk a kezdeti state-t a JSON-ben definiált mezők alapján
  const initialFormState = toolData.fields.reduce((acc, field) => {
    acc[field.id] = '';
    return acc;
  }, {});

  const [formData, setFormData] = useState(initialFormState);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState(toolData.resultArea.copyButtonText);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Ellenőrizzük, hogy minden kötelező mező ki van-e töltve
    for (const field of toolData.fields) {
      if (field.required && !formData[field.id].trim()) {
        alert(`Kérlek, töltsd ki a(z) "${field.label}" mezőt!`);
        return;
      }
    }

    let finalPrompt = toolData.systemPromptTemplate;

    // Kicseréljük az összes placeholder-t a form adataira
    Object.keys(formData).forEach(key => {
        let replacement = formData[key].trim();
        if (key === 'ervek') { // Az érveket külön formázzuk
            replacement = replacement.split('\n').map(erv => `- ${erv.trim()}`).join('\n');
        }
        finalPrompt = finalPrompt.replace(`{{${key}}}`, replacement);
    });

    setGeneratedPrompt(finalPrompt.trim());
    setShowResult(true);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopyButtonText(toolData.resultArea.copyButtonSuccessText);
    setTimeout(() => {
      setCopyButtonText(toolData.resultArea.copyButtonText);
    }, 2000);
  };
  
  return (
    <div className={styles.container}>
        <h2 className={styles.sectionTitle}>{toolData.icon} {toolData.header}</h2>
        <p className={styles.sectionSubtitle}>{toolData.subheader}</p>

        <div className={styles.vazlatoloForm}>
            {toolData.fields.map(field => (
                <div key={field.id}>
                    <label htmlFor={field.id}>{field.label}</label>
                    {field.type === 'textarea' ? (
                        <textarea
                            id={field.id}
                            rows="4"
                            placeholder={field.placeholder}
                            value={formData[field.id]}
                            onChange={handleInputChange}
                        />
                    ) : (
                        <input
                            type={field.type}
                            id={field.id}
                            placeholder={field.placeholder}
                            value={formData[field.id]}
                            onChange={handleInputChange}
                        />
                    )}
                </div>
            ))}
            <button type="button" onClick={handleSubmit} className={styles.btn}>
                {toolData.buttonText}
            </button>
        </div>

        {showResult && (
            <div className={styles.eredmenyKontener}>
                <h3>{toolData.resultArea.header}</h3>
                <p>{toolData.resultArea.subheader}</p>
                <textarea value={generatedPrompt} readOnly />
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button onClick={handleCopy} className={styles.btn}>
                        {copyButtonText}
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default MultiInputPromptGenerator;