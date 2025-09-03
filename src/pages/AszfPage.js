import React from 'react';
import styles from './AszfPage.module.css';

const AszfPage = () => {
    return (
        <div className={styles.legalContainer}>
            <h1>Általános Szerződési Feltételek (ÁSZF)</h1>
            <div className={styles.legalContent}>
                <p><em>Utolsó frissítés: [DÁTUM]</em></p>
                
                <h2>1. A Szolgáltató Adatai (Impresszum)</h2>
                <p><strong>Név:</strong> [Cégnév / Egyéni Vállalkozó Neve]</p>
                <p><strong>Székhely:</strong> [Székhely címe]</p>
                <p><strong>Adószám / Adóazonosító jel:</strong> [Adószámod]</p>
                <p><strong>Cégjegyzékszám / Nyilvántartási szám:</strong> [Nyilvántartási számod]</p>
                <p><strong>Kapcsolattartási E-mail:</strong> [Hivatalos e-mail címed]</p>

                <h2>2. A Szolgáltatás Leírása</h2>
                <p>[IDE KERÜL AZ ÁSZF SZÖVEGE...]</p>
                <p>A Fókusz Mester egy interaktív oktatási platform, amely online tananyagokat, kvízeket és eszközöket biztosít diákok és tanárok számára matematika, fizika és mesterséges intelligencia témakörökben.</p>
                
                {/* Itt folytasd a többi szekcióval, pl. Előfizetés, Fizetés, Lemondás stb. */}

            </div>
        </div>
    );
};

export default AszfPage;