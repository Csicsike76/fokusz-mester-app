import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './ProfilePage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const ProfilePage = () => {
    const { user, token, logout, isTrialActive, registrationDate, updateUser } = useAuth();
    
    const [profileData, setProfileData] = useState(user);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState(user ? user.username : '');
    
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isCopied, setIsCopied] = useState(false);

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
            
            updateUser(data.user);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [token, updateUser]);

    useEffect(() => {
        if(!user) {
            setIsLoading(false);
        } else {
            fetchProfile();
        }
    }, [fetchProfile]);
    
    useEffect(() => {
        setProfileData(user);
        setNewUsername(user ? user.username : '');
    }, [user]);

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
            updateUser(data.user);
            
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
    
    const handleCopySuccess = () => {
        setMessage("Ajánlókód a vágólapra másolva!");
        setIsCopied(true);
        setTimeout(() => {
            setMessage('');
            setIsCopied(false);
        }, 3000);
    };

    const handleCopyError = () => {
        setError('A másolás nem sikerült. Kérjük, jelölje ki és másolja a kódot manuálisan.');
        setTimeout(() => setError(''), 3000);
    };

    const copyToClipboard = () => {
        const codeToCopy = user?.referral_code;

        if (!codeToCopy) {
            setError("Nincs másolható kód.");
            setTimeout(() => setError(''), 3000);
            return;
        }

        if (navigator.clipboard) {
            navigator.clipboard.writeText(codeToCopy)
                .then(handleCopySuccess)
                .catch(err => {
                    console.error('Modern másolás sikertelen, fallback indul:', err);
                    fallbackCopyTextToClipboard(codeToCopy);
                });
        } else {
            fallbackCopyTextToClipboard(codeToCopy);
        }
    };

    const fallbackCopyTextToClipboard = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        textArea.style.position = 'fixed';
        textArea.style.top = 0;
        textArea.style.left = 0;
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = 0;
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if(successful) {
                handleCopySuccess();
            } else {
                 handleCopyError();
            }
        } catch (err) {
            console.error('Fallback másolás sikertelen:', err);
            handleCopyError();
        }

        document.body.removeChild(textArea);
    };


    const getTrialInfo = (regDate) => {
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

    const trialInfo = registrationDate ? getTrialInfo(registrationDate) : null;

    if (isLoading) return <div className={styles.container}><p>Profil betöltése...</p></div>;

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
                                <span className={styles.value}>{user.username}</span>
                                <button onClick={() => setIsEditingUsername(true)}>Szerkeszt</button>
                           </div>
                        )}
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>E-mail cím:</span>
                        <span className={styles.value}>{user.email}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Szerepkör:</span>
                        <span className={styles.value}>{user.role === 'teacher' ? 'Tanár' : 'Diák'}</span>
                    </div>
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
                
                {user.referral_code && (
                    <div className={styles.referralSection}>
                        <h2>Oszd meg és nyerj!</h2>
                        <p>Oszd meg az alábbi egyedi ajánlókódodat barátaiddal! Minden 5., a te kódoddal regisztrált és előfizető felhasználó után <strong>1 hónap prémium hozzáférést</strong> kapsz ajándékba!</p>
                        <div className={styles.referralCodeBox}>
                            <span>{user.referral_code}</span>
                            <button onClick={copyToClipboard} disabled={isCopied}>
                                {isCopied ? 'Másolva' : 'Másolás'}
                            </button>
                        </div>
                    </div>
                )}


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