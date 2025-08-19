import React from 'react';
import { Link } from 'react-router-dom';
import styles from './HubPageTool.module.css';

const HubPageTool = ({ toolData }) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{toolData.header}</h1>
        <p>{toolData.subheader}</p>
      </div>

      {toolData.sections.map((section, index) => (
        <div key={index} className={styles.sectionWrapper}>
          <div className={styles.titleWrapper}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
          </div>
          <div className={styles.cardGrid}>
            {section.cards.map((card, cardIndex) => (
              <Link to={card.link} key={cardIndex} className={`${styles.card} ${styles[card.styleType]}`}>
                <div className={styles.mainText}>{card.mainText}</div>
                <div className={styles.subText}>{card.subText}</div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default HubPageTool;