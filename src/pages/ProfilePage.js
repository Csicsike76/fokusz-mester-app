import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './ProfilePage.module.css';

const API_URL = process.env.REACT_APP_API_URL || '';

const ProfilePage = () => {
    const { user, token, logout, isTrialActive, registrationDate, updateUser, isSubscribed } = useAuth();
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState(user ? user.username : '');
    
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const [isCopied, setIsCopied] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);

    // JAVÍTÁS: Új állapot a számlázási időszak kiválasztásához
    const [billingInterval, setBillingInterval] = useState('monthly');

    const fetchProfile = useCallback(async () => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Hiba a profil betöltésekor.');
                } catch (jsonError) {
                    throw new Error(`Szerverhiba (${response.status}). A válasz nem dolgozható fel.`);
                }
            }
            
            const data = await response.json();
            updateUser(data.user);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [token, updateUser]);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get("payment_success")) {
            setMessage("Sikeres előfizetés! Köszönjük a bizalmadat. Profil frissítése...");
            fetchProfile(); 
        }
        if (queryParams.get("payment_canceled")) {
            setError("Az előfizetési folyamatot megszakítottad.");
        }

        if (user) {
            fetchProfile();
        } else {
            setIsLoading(false);
        }
    }, []);
    
    useEffect(() => {
        if (user) {
            setNewUsername(user.username);
        }
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
    
    const copyToClipboard = () => {
        const codeToCopy = user?.referral_code;
        if (!codeToCopy) return;
        navigator.clipboard.writeText(codeToCopy).then(() => {
            setIsCopied(true);
            setMessage("Ajánlókód a vágólapra másolva!");
            setTimeout(() => {
                setIsCopied(false);
                setMessage('');
            }, 3000);
        });
    };

    // JAVÍTÁS: A funkció most már a kiválasztott csomagot küldi a szervernek
    const handleStripeRedirect = async (endpoint, interval) => {
        setError('');
        setMessage('');
        setIsRedirecting(true);
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ interval: interval }) // Elküldjük a választott intervallumot
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            setError(err.message || 'Hiba történt. Kérjük, próbáld újra.');
            setIsRedirecting(false);
        }
    };


    const getTrialInfo = (regDate) => {
        if (!regDate) return null;
        
        const expirationDate = new Date(new Date(regDate).getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const timeLeft = expirationDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

        return {
            expiration: expirationDate.toLocaleDateString('hu-HU'),
            daysLeft: daysLeft > 0 ? daysLeft : 0
        };
    };

    const trialInfo = registrationDate ? getTrialInfo(registrationDate) : null;

    const referralsForNextReward = user ? (user.successful_referrals || 0) % 5 : 0;
    const progressPercentage = (referralsForNextReward / 5) * 100;

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

                <div className={styles.subscriptionSection}>
                    <h3>Előfizetési Státusz</h3>
                    {isSubscribed ? (
                        <div className={styles.statusBox}>
                            <p className={styles.statusActive}>Aktív Prémium Előfizetés</p>
                            <p>Hozzáférésed érvényes: <strong>{user.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString('hu-HU') : 'N/A'}</strong></p>
                            <button 
                                className={styles.manageButton} 
                                onClick={() => handleStripeRedirect('/api/create-billing-portal-session', null)} // Itt nem kell intervallum
                                disabled={isRedirecting}
                            >
                                {isRedirecting ? 'Átirányítás...' : 'Előfizetés Kezelése'}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.statusBox}>
                            {isTrialActive && trialInfo ? (
                                <>
                                    <p className={styles.statusTrial}>30 Napos Próbaidőszak</p>
                                    <p>Lejárat: <strong>{trialInfo.expiration} ({trialInfo.daysLeft} nap van hátra)</strong></p>
                                </>
                            ) : (
                                <p className={styles.statusInactive}>Nincs Aktív Előfizetésed</p>
                            )}
                            
                            <p>Szerezz hozzáférést az összes prémium tartalomhoz és eszközhöz.</p>
                            
                            {/* JAVÍTÁS: Új csomagválasztó felület */}
                            <div className={styles.planSelector}>
                                <div 
                                    className={`${styles.planOption} ${billingInterval === 'monthly' ? styles.planSelected : ''}`}
                                    onClick={() => setBillingInterval('monthly')}
                                >
                                    <h4>Havi csomag</h4>
                                    <p>25 RON / hó</p>
                                </div>
                                <div 
                                    className={`${styles.planOption} ${billingInterval === 'yearly' ? styles.planSelected : ''}`}
                                    onClick={() => setBillingInterval('yearly')}
                                >
                                    <span className={styles.dealBadge}>-17%</span>
                                    <h4>Éves csomag</h4>
                                    <p>250 RON / év</p>
                                </div>
                            </div>

                            <button 
                                className={styles.subscriptionCtaButton}
                                onClick={() => handleStripeRedirect('/api/create-checkout-session', billingInterval)}
                                disabled={isRedirecting}
                            >
                                {isRedirecting ? 'Átirányítás...' : 'Tovább az Előfizetéshez'}
                            </button>
                        </div>
                    )}
                </div>
                
                <hr className={styles.divider} />

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

                {user.referral_code && (
                    <>
                        <hr className={styles.divider} />
                        <div className={styles.referralSection}>
                            <h2>Oszd meg és nyerj!</h2>
                            <p>Oszd meg az alábbi egyedi ajánlókódodat barátaiddal! Minden 5., a te kódoddal regisztrált és előfizető felhasználó után <strong>1 hónap prémium hozzáférést</strong> kapsz ajándékba!</p>
                            <div className={styles.referralCodeBox}>
                                <span>{user.referral_code}</span>
                                <button onClick={copyToClipboard} disabled={isCopied}>
                                    {isCopied ? 'Másolva' : 'Másolás'}
                                </button>
                            </div>
                            <div className={styles.statsBox}>
                                <h4>Haladásod a következő jutalomig:</h4>
                                <div className={styles.progressContainer}>
                                    <div className={styles.progressBar} style={{ width: `${progressPercentage}%` }}></div>
                                </div>
                                <p className={styles.statsText}>
                                    Sikeres ajánlások: <strong>{referralsForNextReward} / 5</strong>
                                </p>
                                <p className={styles.rewardsText}>
                                    Eddig megszerzett jutalmak: <strong>{user.earned_rewards || 0} hónap</strong>
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;