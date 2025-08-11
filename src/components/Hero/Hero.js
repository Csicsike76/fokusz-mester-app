// src/components/Hero/Hero.js

import React from 'react';
import styles from './Hero.module.css';

const Hero = ({ title, subtitle, buttonText, scrollToId }) => {

  const handleScroll = (e) => {
    e.preventDefault();
    const element = document.getElementById(scrollToId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.hero}>
      <div className={styles.content}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {buttonText && scrollToId && (
          <a href={`#${scrollToId}`} className={styles.ctaButton} onClick={handleScroll}>
            {buttonText}
          </a>
        )}
      </div>
    </div>
  );
};

export default Hero;