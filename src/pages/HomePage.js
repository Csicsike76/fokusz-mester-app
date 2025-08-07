import React from 'react';
import Hero from '../components/Hero/Hero';
import styles from './HomePage.module.css';
import ConditionalLink from '../components/ConditionalLink/ConditionalLink';

const HomePage = () => {
  return (
    <div>
      <Hero />

      {/* Ingyenes leckék szekció */}
      <div className={styles.section}>
        <h2>Ingyenes Leckék és Műhelyek</h2>

        <h3>Matematika</h3>
        <ul className={styles.cardList}>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            5. osztály – Törtek és Tizedestörtek <br /> PIN: 100001 <br />
            <ConditionalLink to="/lecke/matematika/5/tortek" className={styles.link}>Ingyenes Lecke →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            6. osztály – Százalékszámítás <br /> PIN: 100001 <br />
            <ConditionalLink to="/lecke/matematika/6/szazalek" className={styles.link}>Ingyenes Lecke →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            7. osztály – Természetes számok négyzetének négyzetgyöke <br /> PIN: 100001 <br />
            <ConditionalLink to="/lecke/matematika/7/gyok" className={styles.link}>Ingyenes Lecke →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            8. osztály – Halmazok meghatározása elemeik közös tulajdonságával <br /> PIN: 100001 <br />
            <ConditionalLink to="/lecke/matematika/8/halmaz" className={styles.link}>Ingyenes Lecke →</ConditionalLink>
          </li>
        </ul>

        <h3>Fizika</h3>
        <ul className={styles.cardList}>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            6. osztály – Halmazállapot-változások <br /> PIN: 100001 <br />
            <ConditionalLink to="/lecke/fizika/6/halmazallapot" className={styles.link}>Ingyenes Lecke →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            7. osztály – A fizikában használt matematikai eljárások és modellek <br /> PIN: 100001 <br />
            <ConditionalLink to="/lecke/fizika/7/modell" className={styles.link}>Ingyenes Lecke →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            8. osztály – Elektromosság alapjai <br /> PIN: 100001 <br />
            <ConditionalLink to="/lecke/fizika/8/elektromossag" className={styles.link}>Ingyenes Lecke →</ConditionalLink>
          </li>
        </ul>

        <h3>Mesterséges Intelligencia</h3>
        <ul className={styles.cardList}>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            Képalkotás MI-vel – Változtasd a szavakat lenyűgöző képekké! <br />
            <ConditionalLink to="/workshop/aimi/kepek" className={styles.link}>Ingyenes Műhely →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            Játéktervezés 101 – Tervezd meg a saját videójátékod koncepcióját! <br />
            <ConditionalLink to="/workshop/aimi/jatek" className={styles.link}>Ingyenes Műhely →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            A Promptolás Alapjai – Tanulj meg hatékonyan "beszélgetni" az MI-vel! <br />
            <ConditionalLink to="/workshop/aimi/prompt" className={styles.link}>Ingyenes Műhely →</ConditionalLink>
          </li>
        </ul>

        <h3>Ingyenes Interaktív Eszközök</h3>
        <ul className={styles.cardList}>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            Időutazó Csevegő 🕰️ <br />
            <ConditionalLink to="/eszkozok/idochat" className={styles.link}>Csevegő Indítása →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            Jövőkutató Szimulátor 🚀 <br />
            <ConditionalLink to="/eszkozok/jovokutato" className={styles.link}>Szimulátor Indítása →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            Személyes Célkitűző 🎯 <br />
            <ConditionalLink to="/eszkozok/celkituzo" className={styles.link}>Tervezés Indítása →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.free}`}>
            <div className={`${styles.badge} ${styles['badge-free']}`}>INGYENES</div>
            Tudás Iránytű 🧭 <br />
            <ConditionalLink to="/eszkozok/utvonal" className={styles.link}>Útvonal Keresése →</ConditionalLink>
          </li>
        </ul>
      </div>

      {/* Prémium szekció */}
      <div className={styles.sectionPremium}>
        <h2>Teljes Kurzusok (Prémium)</h2>
        <ul className={styles.cardList}>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            Teljes Matematika Kurzus<br />
            Hozzáférés az összes évfolyam (5–8.) minden interaktív leckéjéhez és képletgyűjteményéhez.<br />
            <ConditionalLink to="/premium/matematika" className={styles.link}>Részletek →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            Teljes Fizika Kurzus<br />
            Hozzáférés az összes évfolyam (6–8.) minden interaktív leckéjéhez és képletgyűjteményéhez.<br />
            <ConditionalLink to="/premium/fizika" className={styles.link}>Részletek →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            Teljes Interaktív AIMI1 Gyűjtemény<br />
            Hozzáférés az összes haladó műhelyhez, a projekt kézikönyvhöz és az extra tartalmakhoz.<br />
            <ConditionalLink to="/premium/aimi1" className={styles.link}>Részletek →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            Teljes Interaktív AIMI2 Gyűjtemény<br />
            Hozzáférés az összes haladó műhelyhez, a projekt kézikönyvhöz és az extra tartalmakhoz.<br />
            <ConditionalLink to="/premium/aimi2" className={styles.link}>Részletek →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            Teljes Interaktív Szuperképesség Gyűjtemény<br />
            Hozzáférés az összes haladó műhelyhez, a projekt kézikönyvhöz és az extra tartalmakhoz.<br />
            <ConditionalLink to="/premium/szuperkepesseg" className={styles.link}>Részletek →</ConditionalLink>
          </li>
        </ul>

        <h2>Exkluzív Prémium Eszközök</h2>
        <ul className={styles.cardList}>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            Interaktív Képlet- és Tételtár 📚<br />
            Tudásbázis matekból és fizikából, MI-segítséggel.<br />
            <ConditionalLink to="/eszkozok/tudastar" className={styles.link}>Tudástár Megnyitása →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            A Napi Kihívás 🧠<br />
            <ConditionalLink to="/eszkozok/kihivas" className={styles.link}>Kihívás Indítása →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            CSICSIKE Tutor 💡<br />
            <ConditionalLink to="/eszkozok/tutor" className={styles.link}>Tutor Indítása →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            Házifeladat Hős 🦸<br />
            <ConditionalLink to="/eszkozok/hazi" className={styles.link}>Hős Indítása →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            AI Vita Aréna 🏛️<br />
            <ConditionalLink to="/eszkozok/vita" className={styles.link}>Aréna Megnyitása →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            AI Vizsga Szimulátor 📝<br />
            <ConditionalLink to="/eszkozok/vizsga" className={styles.link}>Szimulátor Indítása →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            Absztrakt → Konkrét Fordító 🔬<br />
            <ConditionalLink to="/eszkozok/fordito" className={styles.link}>Fordító Indítása →</ConditionalLink>
          </li>
          <li className={`${styles.card} ${styles.premium}`}>
            <div className={`${styles.badge} ${styles['badge-premium']}`}>PRÉMIUM</div>
            Esszé Vázlatoló ✍️<br />
            <ConditionalLink to="/eszkozok/essze" className={styles.link}>Vázlatoló Indítása →</ConditionalLink>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default HomePage;
