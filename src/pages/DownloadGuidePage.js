// src/pages/DownloadGuidePage.js
import React from 'react';
import styles from './DownloadGuidePage.module.css';

const DownloadGuidePage = () => {
  const googleDriveLink = "https://drive.google.com/drive/folders/1uieUWYNV-BYfIaXtvdjaBFMtfhALoffO?usp=drive_link"; // CSERÉLJE KI EZT AZ URL-T A GOOGLE DRIVE MAPPÁJÁRA
  // A felhasználó által megadott link (com.mtv.sai) egy másik alkalmazáshoz tartozik.
  // A legelterjedtebb és javasolt Split APKs Installer (SAI) az alábbi linkről érhető el:
  const saiPlayStoreLink = "https://play.google.com/store/apps/details?id=com.mtv.sai"; 

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📲 Fókusz Mester – Telepítési útmutató (Android)</h1>

      <p className={styles.intro}>Kedves Felhasználó!</p>
      <p className={styles.intro}>Az alábbi lépések segítségével könnyedén telepítheted a Fókusz Mester alkalmazást Android telefonodra vagy táblagépedre.</p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Alkalmazás letöltése</h2>
        <p>Nyisd meg a Fókusz Mester weboldalát.</p>
        <p>Kattints az „Alkalmazás letöltése” gombra.</p>
        <p>Választhatsz a két telepítőfájl közül:</p>
        <ul className={styles.list}>
          <li><strong>APK fájl (fokuszmester.apk)</strong></li>
          <li><strong>AAB fájl (fokuszmester.aab)</strong></li>
        </ul>
        <p className={styles.tip}>👉 A legtöbb felhasználónak az APK ajánlott, mert közvetlenül telepíthető.</p>
        <p className={styles.tip}>👉 Az AAB fejlettebb, gyorsabb betöltést és kisebb fájlméretet adhat, de telepítéséhez általában külső segédprogram szükséges, például: <a href={saiPlayStoreLink} target="_blank" rel="noopener noreferrer" className={styles.inlineButtonLink}>Split APKs Installer (SAI)</a>.</p>

        <div className={styles.downloadButtonContainer}>
          <a
            href={googleDriveLink}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.downloadButton}
          >
            Tovább a Letöltésekhez (Google Drive)
          </a>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Ismeretlen forrásból származó alkalmazások engedélyezése</h2>
        <p>Mivel az app nem a Play Áruházból származik, egyszer engedélyezned kell a telepítést.</p>
        <p>A letöltés után kattints a fájlra (.apk vagy .aab).</p>
        <p>Ha figyelmeztetés jelenik meg:</p>
        <p>Nyomd meg: <strong>Beállítások → engedélyezd az „Ismeretlen forrásokból való telepítést”</strong> a böngésző vagy fájlkezelő számára.</p>
        <p>Ezután lépj vissza, és folytasd a telepítést.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Alkalmazás telepítése</h2>
        <h3>Ha APK-t választottál</h3>
        <ul className={styles.list}>
          <li>Kattints a letöltött <code>fokuszmester.apk</code> fájlra.</li>
          <li>A megjelenő telepítő ablakban válaszd a <strong>Telepítés</strong> gombot.</li>
          <li>Várj a folyamat végéig, majd válassz:
            <ul className={styles.subList}>
              <li><strong>Megnyitás</strong> → azonnal indítsd el az appot.</li>
              <li><strong>Kész</strong> → később a főképernyőről vagy alkalmazáslistából nyisd meg.</li>
            </ul>
          </li>
        </ul>
        <h3>Ha AAB-t választottál</h3>
        <ul className={styles.list}>
          <li>Telepíts egy segédprogramot, mint a <a href={saiPlayStoreLink} target="_blank" rel="noopener noreferrer" className={styles.inlineButtonLink}>Split APKs Installer (SAI)</a> az Android eszközödre.</li>
          <li>Nyisd meg a SAI-t, majd válaszd ki a letöltött <code>fokuszmester.aab</code> fájlt.</li>
          <li>Kövesd a telepítő lépéseit, amíg az alkalmazás fel nem kerül a készülékedre.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Első indítás</h2>
        <ul className={styles.list}>
          <li>Keresd meg az ikonok között a Fókusz Mester alkalmazást.</li>
          <li>Indítsd el.</li>
          <li>Jelentkezz be vagy regisztrálj, majd élvezd az alkalmazás teljes funkcionalitását.</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Frissítések</h2>
        <p>Ha új verzió jelenik meg, a weboldalunkon mindig elérhető lesz a friss .apk és .aab fájl.</p>
        <p>A frissítéshez töltsd le az új verziót, majd telepítsd a meglévő fölé (nem törlődnek az adataid).</p>
      </section>

      <p className={`${styles.importantNotice} ${styles.warning}`}>
        ⚠️ Fontos: Csak a Fókusz Mester hivatalos weboldaláról származó fájlokat töltsd le és telepítsd!
      </p>
    </div>
  );
};

export default DownloadGuidePage;