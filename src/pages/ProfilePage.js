import React from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './ProfilePage.module.css';

const ProfilePage = () => {
    const { user, isTrialActive } = useAuth();

    if (!user) {
        return (
            <div className={styles.container}>
                <div className={styles.profileBox}>
                    <h1>Profil</h1>
                    <p>A profil oldal megtekintéséhez kérjük, jelentkezz be.</p>
                </div>
            </div>
        );
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(user.referral_code);
        alert("Ajánlókód a vágólapra másolva!");
    };

    return (
        <div className={styles.container}>
            <div className={styles.profileBox}>
                <h1>Profilod</h1>
                
                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Felhasználónév:</span>
                        <span className={styles.value}>{user.username}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>E-mail cím:</span>
                        <span className={styles.value}>{user.email}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Szerepkör:</span>
                        <span className={styles.value}>{user.role === 'teacher' ? 'Tanár' : 'Diák'}</span>
                    </div>
                </div>

                <hr className={styles.divider} />

                <div className={styles.referralSection}>
                    <h2>Oszd meg és nyerj!</h2>
                    <p>Oszd meg az alábbi egyedi ajánlókódodat barátaiddal! Minden 5., a te kódoddal regisztrált és előfizető felhasználó után <strong>1 hónap prémium hozzáférést</strong> kapsz ajándékba!</p>
                    <div className={styles.referralCodeBox}>
                        <span>{user.referral_code}</span>
                        <button onClick={copyToClipboard}>Másolás</button>
                    </div>
                </div>

                <div className={styles.subscriptionStatus}>
                    <h3>Előfizetési Státusz</h3>
                    {isTrialActive ? (
                        <p>Jelenleg az ingyenes, 30 napos próbaidőszakodat használod.</p>
                    ) : (
                        <p>Jelenleg nincs aktív előfizetésed.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;