import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './ProfilePage.module.css';

const API_URL = process.env.NODE_ENV === 'production'
    ? 'https://fokusz-mester-backend.onrender.com'
    : 'http://localhost:3001';

const ProfilePage = () => {
    // JAVÍTVA: A registrationDate-et is kiolvassuk a kontextusból, ez lesz a megbízható forrás
    const { user, token, logout, login, isTrialActive, registrationDate } = useAuth();
    const [profileData, setProfileData] = useState(user);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState(user ? user.username : '');
    
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const fetchProfile = useCallback(async () => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        try {
            const response = await fetch(`${API_URL}/api/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Hiba a profil betöltésekor.');
            
            // JAVÍTVA: Nem felülírjuk, hanem összefésüljük az adatokat.
            // Így ha a fetch válaszából hiányozna a 'created_at', a bejelentkezéskor kapott érték megmarad.
            setProfileData(prevData => ({ ...prevData, ...data.user }));
            setNewUsername(data.user.username);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if(!user) {
            setIsLoading(false);
        } else {
            // A profileData kezdeti beállítása a kontextusból
            setProfileData(user);
            setNewUsername(user.username);
            fetchProfile();
        }
    }, [user, fetchProfile]);
    
    const handleUpdateUsername = async () => {
        setMessage('');
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username: newUsername })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            setMessage(data.message);
            setProfileData(data.user);
            
            // Fontos, hogy a login-t a teljes, frissített user objektummal hívjuk meg
            login(data.user, token);
            
            setIsEditingUsername(false);
        } catch (err) {
            setError(err.message);
        }
    };
    
    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (newPassword !== confirmNewPassword) {
            setError("Az új jelszavak nem egyeznek.");
            return;
        }

        try {
             const response = await fetch(`${API_URL}/api/profile/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            setMessage(data.message + " Kijelentkeztetés 2 másodperc múlva...");
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setTimeout(() => logout(), 2000);
        } catch (err) {
            setError(err.message);
        }
    };

    // JAVÍTVA: A másolás funkció hibakezeléssel lett ellátva
    const copyToClipboard = async () => {
        if (profileData && profileData.referral_code) {
            try {
                await navigator.clipboard.writeText(profileData.referral_code);
                setMessage("Ajánlókód a vágólapra másolva!");
            } catch (err) {
                console.error('Hiba a vágólapra másoláskor:', err);
                setError('A másolás nem sikerült. Kérjük, jelölje ki és másolja a kódot manuálisan.');
            } finally {
                setTimeout(() => {
                    setMessage('');
                    setError('');
                }, 3000);
            }
        }
    };

    const getTrialInfo = (regDate) => {
        // A függvény most már a Date objektumot kapja meg a kontextusból
        if (!regDate) return null;
        
        const expirationDate = new Date(new Date(regDate).getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const timeLeft = expirationDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

        return {
            registration: new Date(regDate).toLocaleDateString('hu-HU'),
            expiration: expirationDate.toLocaleDateString('hu-HU'),
            daysLeft: daysLeft > 0 ? daysLeft : 0
        };
    };

    // JAVÍTVA: A 'registrationDate'-et a megbízhatóbb AuthContext-ből vesszük, nem a 'profileData'-ból
    const trialInfo = registrationDate ? getTrialInfo(registrationDate) : null;

    if (isLoading) return <div className={styles.container}><p>Profil betöltése...</p></div>;

    if (!profileData) {
        return (
            <div className={styles.container}>
                <div className={styles.profileBox}>
                    <h1>Profil</h1>
                    <p>A profil oldal megtekintéséhez kérjük, jelentkezz be.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.profileBox}>
                <h1>Profilod</h1>
                
                {message && <p className={styles.successMessage}>{message}</p>}
                {error && <p className={styles.errorMessage}>{error}</p>}

                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Felhasználónév:</span>
                        {isEditingUsername ? (
                            <div className={styles.editView}>
                                <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                                <button onClick={handleUpdateUsername}>Mentés</button>
                                <button className={styles.cancelButton} onClick={() => setIsEditingUsername(false)}>Mégse</button>
                            </div>
                        ) : (
                           <div className={styles.valueView}>
                                <span className={styles.value}>{profileData.username}</span>
                                <button onClick={() => setIsEditingUsername(true)}>Szerkeszt</button>
                           </div>
                        )}
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>E-mail cím:</span>
                        <span className={styles.value}>{profileData.email}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Szerepkör:</span>
                        <span className={styles.value}>{profileData.role === 'teacher' ? 'Tanár' : 'Diák'}</span>
                    </div>
                    {/* JAVÍTVA: A trialInfo most már a kontextusból származó dátum alapján jelenik meg */}
                    {trialInfo && (
                        <div className={styles.infoItem}>
                            <span className={styles.label}>Regisztráció dátuma:</span>
                            <span className={styles.value}>{trialInfo.registration}</span>
                        </div>
                    )}
                </div>

                <hr className={styles.divider} />

                <div className={styles.section}>
                    <h2>Jelszócsere</h2>
                    <form onSubmit={handleChangePassword} className={styles.formGrid}>
                        <input type="password" placeholder="Régi jelszó" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
                        <input type="password" placeholder="Új jelszó" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                        <input type="password" placeholder="Új jelszó megerősítése" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
                        <button type="submit">Jelszó Módosítása</button>
                    </form>
                </div>

                <hr className={styles.divider} />
                
                {/* A feltétel most már azt is nézi, hogy van-e egyáltalán kód */}
                {profileData.referral_code && (
                    <div className={styles.referralSection}>
                        <h2>Oszd meg és nyerj!</h2>
                        <p>Oszd meg az alábbi egyedi ajánlókódodat barátaiddal! Minden 5., a te kódoddal regisztrált és előfizető felhasználó után <strong>1 hónap prémium hozzáférést</strong> kapsz ajándékba!</p>
                        <div className={styles.referralCodeBox}>
                            <span>{profileData.referral_code}</span>
                            <button onClick={copyToClipboard}>Másolás</button>
                        </div>
                    </div>
                )}


                {/* JAVÍTVA: A trialInfo most már a kontextusból származó dátum alapján jelenik meg */}
                <div className={styles.subscriptionStatus}>
                    <h3>Előfizetési Státusz</h3>
                    {isTrialActive && trialInfo ? (
                        <p>
                            Jelenleg az ingyenes, 30 napos próbaidőszakodat használod.
                            <br />
                            <strong>Lejárat: {trialInfo.expiration} ({trialInfo.daysLeft} nap van hátra).</strong>
                        </p>
                    ) : (
                        <p>Jelenleg nincs aktív előfizetésed vagy a próbaidőszak lejárt.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;