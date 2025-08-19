import React from 'react';
import styles from './PreloadedPromptLauncher.module.css';

const PreloadedPromptLauncher = ({ toolData }) => {
  // A promptot URL-barát formátumra kódoljuk
  const encodedPrompt = encodeURIComponent(toolData.systemPrompt);

  // Létrehozzuk a végső linket a Google Gemini-hez
  const geminiUrl = `${toolData.geminiBaseUrl}${encodedPrompt}`;

  return (
    <div className={styles.tutorCard}>
      <div className={styles.tutorHeader}>
        <div className={styles.icon} dangerouslySetInnerHTML={{ __html: toolData.icon }} />
        <h1 dangerouslySetInnerHTML={{ __html: toolData.header }} />
        <p dangerouslySetInnerHTML={{ __html: toolData.subheader }} />
      </div>

      <div className={styles.tutorBody}>
        {toolData.sections.map((section, index) => (
          <div key={index}>
            <h3 style={{ color: section.titleColor || 'inherit' }}>
              {section.title}
            </h3>
            <div dangerouslySetInnerHTML={{ __html: section.content }} />
          </div>
        ))}

        <a href={geminiUrl} target="_blank" rel="noopener noreferrer" className={styles.startChatBtn}>
          {toolData.buttonText}
        </a>
        <p className={styles.disclaimer}>{toolData.disclaimer}</p>
      </div>
    </div>
  );
};

export default PreloadedPromptLauncher;