import React from 'react';
import styles from './WorkshopStyles.module.css'; // Ezt a fájlt a következő lépésben hozzuk létre

const WorkshopContent = ({ sections }) => {
  if (!sections || sections.length === 0) {
    return <p>A tananyag tartalma jelenleg nem elérhető.</p>;
  }

  // Ez a funkció másolja a promptot a vágólapra
  const copyPrompt = (promptText, buttonElement) => {
    navigator.clipboard.writeText(promptText).then(() => {
      const originalText = buttonElement.textContent;
      buttonElement.textContent = '✅ Másolva!';
      setTimeout(() => {
        buttonElement.textContent = originalText;
      }, 2000);
    }).catch(err => console.error('Hiba a másolás során', err));
  };

  return (
    <div className={styles.workshopContainer}>
      {sections.map((section, index) => (
        <section key={index} className={styles.workshopSection}>
          <h2>{section.title}</h2>

          {/* Sima tartalom megjelenítése (veszélyes, de a te esetedben a forrás megbízható) */}
          {section.content && (
            <div dangerouslySetInnerHTML={{ __html: section.content }} />
          )}

          {/* Feladatok (task-ok) megjelenítése, ha vannak */}
          {section.type === 'tasks_section' && section.tasks && (
            <div>
              {section.tasks.map((task, taskIndex) => (
                <div key={taskIndex} className={styles.taskCard}>
                  <h3>{task.title}</h3>
                  <div dangerouslySetInnerHTML={{ __html: task.content }} />
                  
                  {/* Promptok megjelenítése a feladaton belül */}
                  {task.prompts && task.prompts.map((prompt, promptIndex) => (
                    <div key={promptIndex} className={styles.promptContainer}>
                      <pre className={styles.promptExample}>{prompt}</pre>
                      <button 
                        className={styles.copyButton}
                        onClick={(e) => copyPrompt(prompt, e.target)}
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