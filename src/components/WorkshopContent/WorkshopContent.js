import React from 'react';
import styles from './WorkshopContent.module.css';

const WorkshopContent = ({ sections }) => {
  if (!sections || sections.length === 0) {
    return <p>A tananyag tartalma jelenleg nem elérhető.</p>;
  }

  const copyPromptAndOpenGemini = (promptText, buttonElement) => {
    navigator.clipboard.writeText(promptText).then(() => {
      const originalText = buttonElement.textContent;
      buttonElement.textContent = '✅ Másolva!';
      window.open('https://gemini.google.com/app', '_blank');
      setTimeout(() => {
        buttonElement.textContent = originalText;
      }, 3000);
    }).catch(err => {
      console.error('Hiba a másolás során:', err);
      alert('Hiba történt a vágólapra másolás során.');
    });
  };

  return (
    <div className={styles.workshopContainer}>
      {sections.map((section, index) => (
        <section key={index} className={styles.workshopSection}>
          <h2>{section.title}</h2>

          {/* Dinamikus renderelés: tömb vagy HTML string kezelése */}
          {section.content && (
            <div>
              {Array.isArray(section.content) ? (
                section.content.map((item, itemIndex) => (
                  <div key={itemIndex} className={styles.taskCard}>
                    <h3>{item.title}</h3>
                    {item.htmlContent && (
                      <div dangerouslySetInnerHTML={{ __html: item.htmlContent }} />
                    )}
                  </div>
                ))
              ) : (
                <div dangerouslySetInnerHTML={{ __html: section.content }} />
              )}
            </div>
          )}

          {/* Eredeti tasks_section és prompts logika - nem kvízként jelenik meg */}
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