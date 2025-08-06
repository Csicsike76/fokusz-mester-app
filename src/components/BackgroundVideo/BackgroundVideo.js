import React from 'react';
import styles from './BackgroundVideo.module.css';
import videoSource from '../../assets/video.mp4';

const BackgroundVideo = () => {
  return (
    <video 
      autoPlay 
      loop 
      muted 
      className={styles.video}
    >
      <source src={videoSource} type="video/mp4" />
    </video>
  );
};

export default BackgroundVideo;