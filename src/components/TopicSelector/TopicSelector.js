// Fájl: src/components/TopicSelector/TopicSelector.js

import React from 'react';
import styles from './TopicSelector.module.css';

const TopicSelector = ({ data }) => {

  const handleCardClick = (topic) => {
    // A prompt összerakása
    const fullPrompt = `${data.basePrompt}\n\nA mostani beszélgetésünk fókuszában ez a téma áll: "${topic.title}". Kezdjük azzal, hogy röviden bemutatod ezt a területet, majd tedd fel a kérdést: "Mi érdekel a leginkább a(z) ${topic.title} témakörével kapcsolatban?"`;

    // Másolás és Gemini megnyitása
    navigator.clipboard.writeText(fullPrompt.trim()).then(() => {
      alert('✅ Prompt a vágólapra másolva! A Gemini megnyílik egy új ablakban.');
      window.open('https://gemini.google.com/app', '_blank');
    }).catch(err => {
      console.error('Hiba a másolás során:', err);
    });
  };

  const topics = data.topics || [];
  const characters = data.characters ? Object.values(data.characters) : [];
  const items = topics.length > 0 ? topics : characters;

  return (
    <div>
      <h1 className={styles.mainTitle}>{data.title}</h1>
      <p className={styles.subTitle}>{data.description}</p>
      <div className={styles.grid}>
        {items.map((item, index) => (
          <div
            key={item.id || index}
            className={styles.card}
            style={{ backgroundImage: `url(${item.backgroundImageUrl || item.imageUrl})` }}
            onClick={() => handleCardClick(item)}
          >
            <div className={styles.cardContent}>
              <h3>{item.title || item.name}</h3>
              <p>{item.description || item.quote}</p>
              <span className={styles.button}>Beszélgetés Indítása →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopicSelector;