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
                <p>A Fókusz Mester egy interaktív online oktatási platform, amely matematika, fizika és mesterséges intelligencia tananyagokat, kvízeket, villámkártyákat és egyéb tanulást segítő eszközöket biztosít diákok, tanárok és osztályok számára.</p>
                <p>A szolgáltatás részei:</p>
                <ul>
                    <li>Ingyenesen elérhető leckék és eszközök</li>
                    <li>Prémium tartalmak és funkciók előfizetés alapján</li>
                    <li>Osztályregisztráció és kedvezményes csomagok</li>
                    <li>Ajánlói rendszer, amely ingyenes hónapokat biztosíthat</li>
                </ul>

                <h2>3. Regisztráció és felhasználói fiók</h2>
                <ul>
                    <li>A regisztráció önkéntes és ingyenes.</li>
                    <li>A felhasználó köteles valós adatokat megadni.</li>
                    <li>A fiók létrehozásához e-mail megerősítés szükséges.</li>
                    <li>A belépési adatok védelme a felhasználó felelőssége.</li>
                    <li>Biztonsági okból egy fiókkal egyszerre csak egy eszközön lehet bejelentkezni.</li>
                </ul>

                <h2>4. Előfizetés, díjak és fizetés</h2>
                <ul>
                    <li>Minden felhasználó számára elérhető egy 30 napos ingyenes próbaidőszak.</li>
                    <li>A próbaidőszak lejárta után a fiók automatikusan az ingyenes csomagra vált, ha nem történik előfizetés.</li>
                    <li>A prémium előfizetés megújuló rendszerben működik.</li>
                    <li>Az előfizetés lemondható bármikor, kötelezettség nélkül, a Stripe biztonságos ügyfélportálján keresztül.</li>
                    <li>A már kifizetett időszak a lemondás után is használható marad.</li>
                    <li>Elfogadott fizetési módok: bankkártya (Visa, Mastercard, American Express) a Stripe rendszerén keresztül.</li>
                </ul>

                <h2>5. Kedvezmények és ajánlói rendszer</h2>
                <p><strong>Ajánlói rendszer:</strong> minden felhasználó saját ajánlókóddal rendelkezik.</p>
                <p>
                    Ha egy felhasználó 5 ismerősét sikeresen meghívja, akik a próbaidőszakot követően előfizetnek,
                    az ajánló felhasználó <strong>csak akkor kap +1 hónap ingyenes prémium hozzáférést, ha neki is van aktív előfizetése</strong>.
                </p>
                <p><strong>Osztálykedvezmény:</strong> Az osztálykedvezmény fix összegű: az ár már a 20 diákra számolt, 30%-os kedvezményt tartalmaz. Az osztály létszámától függetlenül az összeg változatlan: akár 5, 12, 20 vagy 30 diák van az osztályban, mindig ugyanazt az összeget kell fizetni. Bármilyen évfolyam kombinációban regisztrálható, és minden tantárgyra (matematika, fizika, mesterséges intelligencia) érvényes.</p>

                <h2>6. VIP kód és tanári regisztráció</h2>
                <ul>
                    <li>A tanári fiók regisztrációjához VIP kód szükséges.</li>
                    <li>A VIP kód kizárólag a szolgáltató által kerül kiosztásra.</li>
                    <li>A tanári regisztráció adminisztrátori jóváhagyást igényel.</li>
                </ul>

                <h2>7. A szolgáltatás igénybevételének módja</h2>
                <ul>
                    <li>A Fókusz Mester 0–24 órában online elérhető.</li>
                    <li>Az igénybevételhez internetkapcsolat és korszerű böngésző szükséges.</li>
                    <li>A szolgáltató nem felel a felhasználó eszközének vagy internetkapcsolatának hibájáért.</li>
                </ul>

                <h2>8. Felelősség kizárása</h2>
                <p>A Fókusz Mester tananyagai oktatási célokat szolgálnak, nem helyettesítik a hivatalos tantervet. A szolgáltató nem vállal felelősséget a rendszerhez való hozzáférés megszakadásáért, vis maior helyzetekért, harmadik fél szolgáltatásaiért.</p>

                <h2>9. Elállás és felmondás</h2>
                <ul>
                    <li>Online vásárlás esetén a felhasználót 14 napos elállási jog illeti meg a megrendeléstől számítva, ha a prémium szolgáltatás igénybevételét még nem kezdte meg.</li>
                    <li>A felhasználó bármikor jogosult fiókját törölni a „Profil / Veszélyzóna” menüpontban.</li>
                    <li>A fiók törlése végleges, minden adat elveszik.</li>
                </ul>

                <h2>10. Panaszkezelés és jogorvoslat</h2>
                <p>Panaszügyintézés: [Kapcsolattartási e-mail cím]</p>
                <p>A felhasználó jogosult a békéltető testülethez vagy fogyasztóvédelmi hatósághoz fordulni.</p>

                <h2>11. Záró rendelkezések</h2>
                <p>Az ÁSZF [DÁTUM]-tól hatályos. A szolgáltató fenntartja a jogot az ÁSZF módosítására. A módosítás a weboldalon való közzététellel lép hatályba.</p>
            </div>
        </div>
    );
};

export default AszfPage;
