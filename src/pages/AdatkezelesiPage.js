import React from 'react';
import styles from './AszfPage.module.css';

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
                <p>A Fókusz Mester (<a href="https://fokusz-mester-app.onrender.com">https://fokusz-mester-app.onrender.com</a>) egy online oktatási platform, amely matematika, fizika és mesterséges intelligencia tananyagokat biztosít diákok és tanárok számára.</p>
                <p>Az adatkezelés célja:</p>
                <ul>
                    <li>Regisztráció és belépés biztosítása</li>
                    <li>Előfizetések kezelése és számlázás</li>
                    <li>Tanulási folyamat nyomon követése</li>
                    <li>Ajánlói és osztálykedvezmény rendszer működtetése</li>
                    <li>Kapcsolattartás, ügyfélszolgálat</li>
                    <li>Jogszabályi kötelezettségek teljesítése</li>
                </ul>

                <h2>3. Kezelt adatok köre</h2>
                <ul>
                    <li><strong>Regisztrációkor:</strong> név, e-mail cím, jelszó (titkosítva), osztálykód (opcionális)</li>
                    <li><strong>Előfizetéskor:</strong> név, számlázási adatok, bankkártya adatok (Stripe kezeli, Adatkezelő nem tárolja)</li>
                    <li><strong>Tanulási folyamat:</strong> leckékhez kapcsolódó előrehaladás, kvízeredmények, gyakorlási adatok</li>
                    <li><strong>Ajánlói rendszer:</strong> ajánlókód, ajánlott felhasználók azonosítója</li>
                    <li><strong>Kapcsolattartás:</strong> e-mail üzenetek, támogatási jegyek</li>
                </ul>

                <h2>4. Az adatkezelés jogalapja</h2>
                <ul>
                    <li><strong>Szerződés teljesítése (GDPR 6. cikk (1) b)):</strong> a szolgáltatás nyújtásához szükséges</li>
                    <li><strong>Jogi kötelezettség (GDPR 6. cikk (1) c)):</strong> számlázási adatok megőrzése</li>
                    <li><strong>Hozzájárulás (GDPR 6. cikk (1) a)):</strong> hírlevélre vagy marketing üzenetre való feliratkozás esetén</li>
                    <li><strong>Jogos érdek (GDPR 6. cikk (1) f)):</strong> rendszerbiztonság, csalás megelőzés</li>
                </ul>

                <h2>5. Adattárolás időtartama</h2>
                <ul>
                    <li>Felhasználói fiók adatai: a fiók törléséig</li>
                    <li>Számlázási adatok: a számviteli jogszabályok által előírt 8 évig</li>
                    <li>Próbaidő és ajánlói adatok: az előfizetés megszűnését követő 1 évig</li>
                    <li>Hírlevél adatok: a leiratkozásig</li>
                </ul>

                <h2>6. Adatokhoz hozzáférők</h2>
                <p>Az adatokhoz az Adatkezelő munkatársai férhetnek hozzá kizárólag a feladatellátáshoz szükséges mértékben.</p>

                <h2>7. Adatfeldolgozók</h2>
                <ul>
                    <li>Render.com – weboldal tárhelyszolgáltató</li>
                    <li>Stripe Payments Europe Ltd. – bankkártyás fizetések kezelője</li>
                    <li>Google LLC (Gmail SMTP) – e-mail küldési szolgáltató</li>
                </ul>

                <h2>8. Adatok továbbítása harmadik országba</h2>
                <p>Az adatok az Európai Unión kívül is tárolódhatnak (pl. Stripe, Google), de ezek minden esetben az EU–USA adatvédelmi keretrendszer (Data Privacy Framework) alapján történnek.</p>

                <h2>9. Érintettek jogai</h2>
                <p>A felhasználó jogosult:</p>
                <ul>
                    <li>Hozzáférést kérni a kezelt adataihoz</li>
                    <li>Helyesbítést vagy törlést kérni</li>
                    <li>Az adatkezelés korlátozását kérni</li>
                    <li>Tiltakozni az adatkezelés ellen</li>
                    <li>Adathordozhatóságot kérni</li>
                </ul>
                <p>A kérelmeket az Adatkezelő <strong>[Kapcsolattartási e-mail cím]</strong>-re kell elküldeni.</p>

                <h2>10. Panasz benyújtása</h2>
                <p>Amennyiben a felhasználó úgy véli, hogy az adatkezelés jogsértő, jogosult panaszt benyújtani a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH):</p>
                <p>
                    <strong>Cím:</strong> 1055 Budapest, Falk Miksa utca 9-11.<br/>
                    <strong>Web:</strong> <a href="https://naih.hu">https://naih.hu</a><br/>
                    <strong>Telefon:</strong> +36 (1) 391-1400
                </p>

                <h2>11. Záró rendelkezések</h2>
                <p>Az Adatkezelő fenntartja a jogot jelen tájékoztató módosítására. Az aktuális verzió mindig a weboldalon érhető el.</p>
            </div>
        </div>
    );
};

export default AdatkezelesiPage;
