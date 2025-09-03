import React from 'react';
import styles from './AszfPage.module.css'; // Ugyanazt a stílust használjuk az egyszerűség kedvéért

const AdatkezelesiPage = () => {
    return (
        <div className={styles.legalContainer}>
            <h1>Adatkezelési Tájékoztató</h1>
            <div className={styles.legalContent}>
                <p><em>Hatályos: [DÁTUM]-tól</em></p>

                <h2>1. Az Adatkezelő</h2>
                <p><strong>Név:</strong> [Cégnév / Egyéni Vállalkozó Neve]</p>
                <p><strong>Székhely:</strong> [Székhely címe]</p>
                <p><strong>E-mail:</strong> [Hivatalos e-mail címed]</p>

                <h2>2. A Kezelt Adatok Köre és Célja</h2>
                <p>[IDE KERÜL AZ ADATKEZELÉSI TÁJÉKOZTATÓ SZÖVEGE...]</p>
                <p>A regisztráció során kezelt adatok (név, e-mail cím) célja a szolgáltatás nyújtása és a kapcsolattartás. A diákok haladási adatait a tanulási folyamat támogatása érdekében kezeljük.</p>

                {/* Itt folytasd a többi szekcióval, pl. Adatfeldolgozók, Jogorvoslat stb. */}

            </div>
        </div>
    );
};

export default AdatkezelesiPage;