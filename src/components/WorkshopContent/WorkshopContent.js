import React from 'react';
import styles from './WorkshopStyles.module.css';

const WorkshopContent = ({ sections }) => {
  if (!sections || sections.length === 0) {
    return <p>A tananyag tartalma jelenleg nem elérhető.</p>;
  }

  // === ITT A JAVÍTÁS ===
  // A funkciót kiegészítjük a window.open paranccsal.
  const copyPromptAndOpenGemini = (promptText, buttonElement) => {
    navigator.clipboard.writeText(promptText).then(() => {
      const originalText = buttonElement.textContent;
      buttonElement.textContent = '✅ Másolva!';
      
      // Új sor: Megnyitja a Gemini-t egy új fülön.
      window.open('https://gemini.google.com/app', '_blank');
      
      setTimeout(() => {
        buttonElement.textContent = originalText;
      }, 3000); // 3 másodperc után visszaáll a gomb szövege
    }).catch(err => {
      console.error('Hiba a másolás során:', err);
      // Opcionális: Hiba esetén jelezhetünk a felhasználónak
      alert('Hiba történt a vágólapra másolás során.');
    });
  };

  return (
    <div className={styles.workshopContainer}>
      {sections.map((section, index) => (
        <section key={index} className={styles.workshopSection}>
          <h2>{section.title}</h2>

          {section.content && (
            <div dangerouslySetInnerHTML={{ __html: section.content }} />
          )}

          {section.type === 'tasks_section' && section.tasks && (
            <div>
              {section.tasks.map((task, taskIndex) => (
                <div key={taskIndex} className={styles.taskCard}>
                  <h3>{task.title}</h3>
                  <div dangerouslySetInnerHTML={{ __html: task.content }} />
                  
                  {task.prompts && task.prompts.map((prompt, promptIndex) => (
                    <div key={promptIndex} className={styles.promptContainer}>
                      <pre className={styles.promptExample}>{prompt}</pre>
                      <button 
                        className={styles.copyButton}
                        // A gomb most már az új, kiegészített funkciót hívja meg.
                        onClick={(e) => copyPromptAndOpenGemini(prompt, e.target)}
                      >
                        Másolás
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
};

export default WorkshopContent;