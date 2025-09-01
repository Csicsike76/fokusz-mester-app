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
      {sections.map((section) => (
        <section key={section.id} id={section.id} className={styles.workshopSection}>
          <h2>{section.title}</h2>

          {/* A `kepletek-5-osztaly.json` struktúrájának megfelelő renderelés */}
          {section.content && Array.isArray(section.content) && (
            <div>
              {section.content.map((item) => (
                <div key={item.id} id={item.id} className={styles.taskCard}>
                  <h3>{item.title}</h3>
                  {/* JAVÍTÁS: A JSON-ban `htmlContent` a helyes property név */}
                  {item.htmlContent && (
                    <div dangerouslySetInnerHTML={{ __html: item.htmlContent }} />
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Fallback egyéb, nem tömb `content` property-re */}
          {section.content && !Array.isArray(section.content) && (
             <div dangerouslySetInnerHTML={{ __html: section.content }} />
          )}

          {/* Eredeti tasks_section és prompts logika */}
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