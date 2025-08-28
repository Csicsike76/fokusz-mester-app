// src/pages/ProfilePage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './ProfilePage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const ProfilePage = () => {
    const { token, logout } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [statsData, setStatsData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    
    const [isCopied, setIsCopied] = useState(false);
    const [copyMessage, setCopyMessage] = useState('');

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const fetchAllData = useCallback(async () => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const [profileResponse, statsResponse] = await Promise.all([
                fetch(`${API_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/profile/stats`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const profileJson = await profileResponse.json();
            if (!profileResponse.ok) {
                throw new Error(profileJson.message || 'Hiba a profil betöltésekor.');
            }
            setProfileData(profileJson.user);
            setNewUsername(profileJson.user.username);

            const statsJson = await statsResponse.json();
            if (statsResponse.ok) {
                setStatsData(statsJson.stats);
            } else {
                console.warn("Statisztikák betöltése sikertelen:", statsJson.message);
                setStatsData(null);
            }

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
            setMessage("Sikeres előfizetés! Köszönjük. A profilod hamarosan frissül.");
            window.history.replaceState(null, '', window.location.pathname);
        } else if (queryParams.get("payment_canceled")) {
            setError("Az előfizetési folyamatot megszakítottad.");
            window.history.replaceState(null, '', window.location.pathname);
        }
        
        fetchAllData();

    }, [fetchAllData]);
    
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
        
        setCopyMessage("Ajánlókód a vágólapra másolva!");
        setIsCopied(true);

        setTimeout(() => {
            setCopyMessage('');
            setIsCopied(false);
        }, 3000);
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
                body: JSON.stringify({ interval }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Hiba a fizetés indításakor.');
            window.location.href = data.url;
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
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Hiba az előfizetés-kezelő megnyitásakor.');
            window.location.href = data.url;
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setError('');
        setMessage('');
        try {
            const response = await fetch(`${API_URL}/api/profile`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            alert('A fiókodat sikeresen töröltük.');
            logout();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsDeleteModalOpen(false);
        }
    };

    if (isLoading) {
        return <div className={styles.container}><p>Profil betöltése...</p></div>;
    }

    if (!profileData) {
        return <div className={styles.container}><p className={styles.errorMessage}>{error || 'Profiladatok nem elérhetők.'}</p></div>;
    }
    
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
                </div>

                <hr className={styles.divider} />
                
                <div className={styles.section}>
                    <h3>Tanulási Statisztikák</h3>
                    {!statsData ? <p>Statisztikák betöltése...</p> : (
                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>{statsData.completed_lessons_count}</span>
                                <span className={styles.statLabel}>Elvégzett lecke</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Legjobb eredmények</span>
                                {statsData.best_quiz_results?.length > 0 ? (
                                    <ul>{statsData.best_quiz_results.map(r => <li key={r.title}>{r.title}: <strong>{parseFloat(r.score_percentage).toFixed(0)}%</strong></li>)}</ul>
                                ) : <p>Nincs még kitöltött kvíz.</p>}
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Gyakori témakörök</span>
                                {statsData.most_practiced_subjects?.length > 0 ? (
                                     <ul>{statsData.most_practiced_subjects.map(s => <li key={s.subject}>{s.subject} ({s.lesson_count}x)</li>)}</ul>
                                ) : <p>Nincs még adat.</p>}
                            </div>
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
                            <button onClick={copyToClipboard} disabled={isCopied}>
                                {isCopied ? 'Másolva!' : 'Másolás'}
                            </button>
                        </div>
                        {copyMessage && <p className={styles.copySuccessMessage}>{copyMessage}</p>}
                        
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
                    <h3>{profileData.role === 'teacher' ? 'VIP Tagság' : 'Előfizetési Státusz'}</h3>
                    <div className={styles.subscriptionStatus}>
                        {profileData.subscription_status === 'vip_teacher' ? (
                            <p className={styles.statusInfo}>
                                A platformhoz való hozzáférésed tanárként korlátlan és díjmentes.
                            </p>
                        ) : profileData.is_permanent_free ? (
                            <p className={styles.statusInfo}>Örökös prémium hozzáférésed van.</p>
                        ) : profileData.subscription_status === 'trialing' ? (
                            <>
                                <div className={styles.trialHighlightBox}>
                                    <p>
                                        <strong>Ingyenes próbaidőszakod aktív.</strong>
                                        {profileData.subscription_end_date && ` A prémium funkciók eddig érhetőek el: ${new Date(profileData.subscription_end_date).toLocaleDateString()}`}
                                    </p>
                                </div>
                                <div className={styles.subscribeOptions}>
                                    <h4>Válts teljes előfizetésre a próbaidőszak lejárta előtt!</h4>
                                    <button onClick={() => handleCreateCheckoutSession('monthly')} disabled={isLoading}>Havi Előfizetés</button>
                                    <button onClick={() => handleCreateCheckoutSession('yearly')} disabled={isLoading}>Éves Előfizetés (2 hónap ajándék)</button>
                                </div>
                            </>
                        ) : profileData.subscription_status === 'active' ? (
                            <>
                                <p className={styles.statusInfo}>
                                    Előfizetésed aktív.
                                    {profileData.subscription_end_date && ` A jelenlegi időszak vége: ${new Date(profileData.subscription_end_date).toLocaleDateString()}`}
                                </p>
                                <button onClick={handleManageSubscription} className={styles.manageButton} disabled={isLoading}>Előfizetés kezelése</button>
                            </>
                        ) : (
                            <>
                                <p className={styles.statusInfo}>Jelenleg nincs aktív előfizetésed vagy próbaidőszakod.</p>
                                <div className={styles.subscribeOptions}>
                                    <h4>Válassz prémium csomagot a korlátlan hozzáféréshez!</h4>
                                    <button onClick={() => handleCreateCheckoutSession('monthly')} disabled={isLoading}>Havi Előfizetés</button>
                                    <button onClick={() => handleCreateCheckoutSession('yearly')} disabled={isLoading}>Éves Előfizetés (2 hónap ajándék)</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>


                <hr className={styles.divider} />
                
                <div className={`${styles.section} ${styles.dangerZone}`}>
                    <h3>Veszélyzóna</h3>
                    <p>A fiók törlése végleges és nem vonható vissza. Minden adatod, beleértve a haladásodat és előfizetésedet, azonnal törlődik.</p>
                    <button onClick={() => setIsDeleteModalOpen(true)} className={styles.dangerButton}>Fiók Végleges Törlése</button>
                </div>
            </div>

            {isDeleteModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h4>Fiók Törlésének Megerősítése</h4>
                        <p className={styles.modalDangerText}>Biztosan véglegesen törölni szeretnéd a fiókodat? Ez a művelet nem vonható vissza.</p>
                        <div className={styles.modalActions}>
                            <button onClick={() => setIsDeleteModalOpen(false)} className={styles.cancelButton}>Mégse</button>
                            <button onClick={handleDeleteAccount} className={styles.dangerButton}>Igen, Törlöm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;