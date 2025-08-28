// src/pages/ProfilePage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './ProfilePage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const ProfilePage = () => {
    const { token, logout } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Adatok szerkesztéséhez szükséges állapotok
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    
    // Jelszócsere állapotok
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');


    const fetchProfile = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError(''); // Clear previous errors on refetch
        try {
            const response = await fetch(`${API_URL}/api/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Hiba a profil betöltésekor.');
            setProfileData(data.user);
            setNewUsername(data.user.username);
        } catch (err) {
            setError(err.message);
            if (err.message.includes('Érvénytelen vagy lejárt token')) {
                 logout();
            }
        } finally {
            setIsLoading(false);
        }
    }, [token, logout]);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get("payment_success")) {
            setMessage("Sikeres előfizetés! Köszönjük. A profilod frissül.");
            fetchProfile();
             // Clean up URL
            window.history.replaceState(null, '', window.location.pathname);
        }
        if (queryParams.get("payment_canceled")) {
            setError("Az előfizetési folyamatot megszakítottad.");
             // Clean up URL
            window.history.replaceState(null, '', window.location.pathname);
        } else {
            fetchProfile();
        }
    }, [fetchProfile]);
    
    const handleUpdateProfile = async (updateData) => {
        setMessage('');
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            setMessage(data.message);
            setProfileData(prev => ({ ...prev, ...data.user }));
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

            setMessage('Jelszó sikeresen módosítva. A biztonság kedvéért kérjük, jelentkezzen be újra.');
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setTimeout(() => logout(), 3000);
        } catch (err) {
            setError(err.message);
        }
    };

    const copyToClipboard = () => {
        if (!profileData || !profileData.referral_code) return;
        navigator.clipboard.writeText(profileData.referral_code);
        setMessage("Ajánlókód a vágólapra másolva!");
        setTimeout(() => setMessage(''), 2000);
    };
    
    const handleAccessibilityToggle = (e) => {
        // A backend PUT /api/profile végpont jelenleg nem kezeli ennek a mezőnek a frissítését.
        console.log("Akadálymentes mód váltása (frontend-en, a backend implementáció hiányzik)");
    };

    const handleCreateCheckoutSession = async (interval) => {
        setError('');
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ interval }), // 'monthly' or 'yearly'
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Hiba a fizetés indításakor.');
            window.location.href = data.url; // Átirányítás a Stripe fizetési oldalára
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        setError('');
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/create-billing-portal-session`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Hiba az előfizetés-kezelő megnyitásakor.');
            window.location.href = data.url; // Átirányítás a Stripe Billing Portal-ra
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    if (isLoading && !profileData) {
        return <div className={styles.container}><p>Profil betöltése...</p></div>;
    }

    if (!profileData) {
        return <div className={styles.container}><p className={styles.errorMessage}>{error || 'Profiladatok nem elérhetők.'}</p></div>;
    }

    const isSubscribed = profileData.is_subscribed;
    const nextRewardProgress = (profileData.successful_referrals || 0) % 5;

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
                                <button onClick={() => handleUpdateProfile({ username: newUsername })}>Mentés</button>
                                <button className={styles.cancelButton} onClick={() => { setIsEditingUsername(false); setNewUsername(profileData.username); }}>Mégse</button>
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
                        <span className={styles.label}>Látássérült mód:</span>
                        <label className={styles.switch}>
                            <input type="checkbox" checked={profileData.accessibility_mode === 'accessible'} onChange={handleAccessibilityToggle} disabled />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                </div>

                <hr className={styles.divider} />

                <div className={styles.section}>
                    <h2>Jelszócsere</h2>
                    <form onSubmit={handleChangePassword} className={styles.formGrid}>
                        <input type="password" placeholder="Régi jelszó" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
                        <input type="password" placeholder="Új jelszó" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                        <input type="password" placeholder="Új jelszó megerősítése" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
                        <button type="submit" disabled={isLoading}>Jelszó Módosítása</button>
                    </form>
                </div>
                
                <hr className={styles.divider} />

                {profileData.role === 'student' && profileData.referral_code && (
                    <div className={styles.section}>
                        <h2>Oszd meg és nyerj!</h2>
                        <p>Oszd meg az alábbi egyedi ajánlókódodat barátaiddal! Minden 5., a te kódoddal regisztrált és előfizető felhasználó után <strong>1 hónap prémium hozzáférést</strong> kapsz ajándékba!</p>
                        <div className={styles.referralCodeBox}>
                            <span>{profileData.referral_code}</span>
                            <button onClick={copyToClipboard}>Másolás</button>
                        </div>
                        <div className={styles.referralProgress}>
                            <h4>Haladás a következő jutalomig ({nextRewardProgress} / 5):</h4>
                            <div className={styles.progressBarContainer}>
                                <div className={styles.progressBar} style={{ width: `${(nextRewardProgress / 5) * 100}%` }}></div>
                            </div>
                            <p>Sikeresen ajánlottál <strong>{profileData.successful_referrals || 0}</strong> felhasználót. Eddig <strong>{profileData.earned_rewards || 0}</strong> hónap jutalmat szereztél.</p>
                        </div>
                    </div>
                )}
                
                <hr className={styles.divider} />

                <div className={styles.section}>
                    <h3>Előfizetési Státusz</h3>
                     <div className={styles.subscriptionStatus}>
                        {profileData.is_permanent_free ? (
                            <p className={styles.statusInfo}>Örökös prémium hozzáférésed van.</p>
                        ) : isSubscribed ? (
                            <>
                                <p className={styles.statusInfo}>
                                    Előfizetésed aktív.
                                    {profileData.subscription_end_date && ` A jelenlegi időszak vége: ${new Date(profileData.subscription_end_date).toLocaleDateString()}`}
                                </p>
                                <button onClick={handleManageSubscription} className={styles.manageButton} disabled={isLoading}>Előfizetés kezelése</button>
                            </>
                        ) : (
                            <>
                                <p className={styles.statusInfo}>Jelenleg nincs aktív előfizetésed.</p>
                                <div className={styles.subscribeOptions}>
                                    <h4>Válassz prémium csomagot a korlátlan hozzáféréshez!</h4>
                                    <button onClick={() => handleCreateCheckoutSession('monthly')} disabled={isLoading}>Havi Előfizetés</button>
                                    <button onClick={() => handleCreateCheckoutSession('yearly')} disabled={isLoading}>Éves Előfizetés (2 hónap ajándék)</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;