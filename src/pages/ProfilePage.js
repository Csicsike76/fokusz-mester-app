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
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchProfile();
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
            setProfileData(data.user); // Frissítjük a megjelenített adatokat
            setIsEditingUsername(false); // Szerkesztési mód kikapcsolása
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

            setMessage(data.message);
            // Sikeres jelszócsere után érdemes lehet kijelentkeztetni a felhasználót
            setTimeout(() => logout(), 2000);
        } catch (err) {
            setError(err.message);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(profileData.referral_code);
        setMessage("Ajánlókód a vágólapra másolva!");
        setTimeout(() => setMessage(''), 2000);
    };
    
    const handleAccessibilityToggle = (e) => {
        const newMode = e.target.checked ? 'accessible' : 'default';
        handleUpdateProfile({ accessibility_mode: newMode });
    };

    if (isLoading) return <div className={styles.container}><p>Profil betöltése...</p></div>;
    if (error && !profileData) return <div className={styles.container}><p className={styles.errorMessage}>{error}</p></div>;
    if (!profileData) return null;

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
                                <button onClick={() => { setIsEditingUsername(false); setNewUsername(profileData.username); }}>Mégse</button>
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
                            <input type="checkbox" checked={profileData.accessibility_mode === 'accessible'} onChange={handleAccessibilityToggle} />
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
                        <button type="submit">Jelszó Módosítása</button>
                    </form>
                </div>
                
                <hr className={styles.divider} />

                {profileData.role !== 'teacher' && (
                    <div className={styles.referralSection}>
                        <h2>Oszd meg és nyerj!</h2>
                        <p>Oszd meg az alábbi egyedi ajánlókódodat barátaiddal! Minden 5., a te kódoddal regisztrált és előfizető felhasználó után <strong>1 hónap prémium hozzáférést</strong> kapsz ajándékba!</p>
                        <div className={styles.referralCodeBox}>
                            <span>{profileData.referral_code}</span>
                            <button onClick={copyToClipboard}>Másolás</button>
                        </div>
                    </div>
                )}

                <div className={styles.subscriptionStatus}>
                    <h3>Előfizetési Státusz</h3>
                    <p>
                        {profileData.is_permanent_free ? "Örökös prémium hozzáférésed van." : 
                         profileData.subscription_status === 'active' ? `Aktív előfizetés. Lejárat: ${new Date(profileData.subscription_expires_at).toLocaleDateString()}` :
                         profileData.subscription_status === 'free_trial' ? `Ingyenes próbaidőszak. Lejárat: ${new Date(profileData.subscription_expires_at).toLocaleDateString()}` :
                         "Jelenleg nincs aktív előfizetésed."
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;