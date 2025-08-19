// Fájl: src/components/TopicSelector/TopicSelector.js (FRISSÍTETT KÓD)

import React from 'react';
import { Link } from 'react-router-dom';
import styles from './TopicSelector.module.css';

const TopicSelector = ({ data }) => {
  // === ITT A BŐVÍTETT LOGIKA ===
  // Ellenőrizzük, hogy a kapott adat 'topics' (csoportosított) vagy 'characters' (sima) struktúrájú-e.

  // 1. Csoportosított nézet (Képletgyűjtemény)
  if (data.topics && Array.isArray(data.topics)) {
    return (
      <div className={styles.topicContainer}>
        <h1 className={styles.mainTitle}>{data.title}</h1>
        <p className={styles.subTitle}>{data.description}</p>
        
        {data.topics.map((topic, index) => (
          <section key={index} className={styles.topicSection}>
            <h3 className={styles.topicTitle} style={{ color: topic.color, borderColor: topic.color }}>
              {topic.title}
            </h3>
            <div className={styles.cardGrid}>
              {topic.items.map((item, itemIndex) => (
                <div key={itemIndex} className={styles.card}>
                  {item.disabled ? (
                    <div className={`${styles.btn} ${styles.disabledBtn}`} style={{ backgroundColor: '#ccc' }}>
                      {item.title} <span className={styles.btnText}>{item.text}</span>
                    </div>
                  ) : (
                    <Link to={item.link} className={styles.btn} style={{ backgroundColor: topic.color }}>
                      {item.title} <span className={styles.btnText}>{item.text}</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // 2. Karakterválasztó nézet (pl. Időutazó) - Ez a régi, jól működő rész
  if (data.characters) {
    return (
      <div className={styles.characterSelection}>
        <h2 className={styles.mainTitle}>{data.title}</h2>
        <p className={styles.subTitle}>{data.description}</p>
        <div className={styles.characterGrid}>
            {Object.keys(data.characters).map(key => {
                const character = data.characters[key];
                return (
                    <div key={key} className={styles.characterCard} style={{ backgroundColor: character.color }}>
                        <img src={character.imageUrl || '/images/default-avatar.png'} alt={character.name} className={styles.characterImage} />
                        <h3 className={styles.characterName}>{character.name}</h3>
                        <p className={styles.characterTitle}>{character.title}</p>
                        <p className={styles.characterQuote}>"{character.quote}"</p>
                        {/* A gombot itt nem jelenítjük meg, mert a ContentPage kezeli a kattintást */}
                    </div>
                );
            })}
        </div>
      </div>
    );
  }

  // Fallback, ha egyik séma sem illik
  return <div>Ismeretlen adatformátum.</div>;
};

export default TopicSelector;