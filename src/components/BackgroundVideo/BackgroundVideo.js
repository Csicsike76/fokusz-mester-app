import React from 'react';
import styles from './BackgroundVideo.module.css';

// JAVÍTVA: A videó forrásának importálása a `public` mappából.
// Mivel a `video.mp4` a `public` mappában található,
// az útvonalat a `process.env.PUBLIC_URL` segítségével kell felépíteni.
const videoSource = `${process.env.PUBLIC_URL}/video.mp4`; 

const BackgroundVideo = () => {
  return (
    <video 
      autoPlay 
      loop 
      muted 
      playsInline /* A playsInline attribútum segíthet mobilon a videó automatikus lejátszásában */
      className={styles.video}
    >
      <source src={videoSource} type="video/mp4" />
      A böngésződ nem támogatja a videó lejátszását.
    </video>
  );
};

export default BackgroundVideo;