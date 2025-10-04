import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './ProfilePage.module.css';
import { API_URL } from '../config/api';
import { Link } from 'react-router-dom';

const ProfilePage = () => {
    const { user, token, logout, updateUser, isTeacherMode, toggleTeacherMode } = useAuth();
    const [profileData, setProfileData] = useState(null);
    const [statsData, setStatsData] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [copyMessage, setCopyMessage] = useState('');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const fetchAllData = useCallback(async () => {
        console.log('fetchAllData elindult. Aktuális token:', token);
        if (!token) {
            console.log('fetchAllData: A token hiányzik, visszatérünk null-lal.');
            return null;
        }

        const apiCalls = [
            fetch(`${API_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${API_URL}/api/profile/stats`, { headers: { 'Authorization': `Bearer ${token}` } })
        ];

        if (user?.role === 'student') {
            apiCalls.push(fetch(`${API_URL}/api/profile/recommendations`, { headers: { 'Authorization': `Bearer ${token}` } }));
        }

        try {
            const responses = await Promise.all(apiCalls);

            for (let i = 0; i < responses.length; i++) {
                const res = responses[i];
                const url = res.url;
                const status = res.status;
                const clonedRes = res.clone();
                const json = await clonedRes.json();
                console.log(`API válasz - ${url}: Státusz: ${status}, Adatok:`, json);
            }

            const profileJson = await responses[0].json();
            if (!responses[0].ok) throw new Error(profileJson.message || 'Hiba a profil betöltésekor.');

            setProfileData(profileJson.user);
            updateUser(profileJson.user);
            setNewUsername(profileJson.user.real_name || profileJson.user.username);

            const statsJson = await responses[1].json();
            if (responses[1].ok) setStatsData(statsJson.stats);

            if (user?.role === 'student' && responses[2]) {
                const recsJson = await responses[2].json();
                if (responses[2].ok) setRecommendations(recsJson.recommendations);
            }

            return profileJson.user;
        } catch (err) {
            console.error('fetchAllData hiba:', err);
            setError(err.message);
            if (err.message.includes('Érvénytelen vagy lejárt token') || err.message.includes('A munkamenet lejárt')) {
                logout();
            }
            return null;
        }
    }, [token, user?.role, logout, updateUser]);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get("payment_success")) {
            setIsLoading(false);
            setIsProcessingPayment(true);
            setMessage("Sikeres fizetés! Fiókját frissítjük, kérjük várjon...");
            window.history.replaceState(null, '', window.location.pathname);
            const pollInterval = setInterval(async () => {
                const freshProfileData = await fetchAllData();
                if (freshProfileData && freshProfileData.is_subscribed) {
                    clearInterval(pollInterval);
                    setIsProcessingPayment(false);
                    setMessage("Előfizetésed sikeresen aktiválva!");
                    setTimeout(() => setMessage(''), 5000);
                }
            }, 3000);
            return () => clearInterval(pollInterval);
        } else {
            console.log('useEffect elindult. Hívjuk a fetchAllData-t...');
            setIsLoading(true);
            fetchAllData().finally(() => setIsLoading(false));
            if (queryParams.get("payment_canceled")) {
                setError("Az előfizetési folyamatot megszakítottad.");
                window.history.replaceState(null, '', window.location.pathname);
            }
        }
    }, [token, fetchAllData]);

    const handleUpdateProfile = async (updateData) => {
        setMessage('');
        setError('');
        try {
            const response = await fetch(`${API_URL}/api/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updateData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setMessage(data.message);
            setProfileData(data.user);
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
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

    const copyToClipboard = async () => {
        if (!profileData?.referral_code) return;
        try {
            await navigator.clipboard.writeText(profileData.referral_code);
            setIsCopied(true);

            if (profileData.is_subscribed) {
                setCopyMessage("Ajánlókód a vágólapra másolva! Sok sikert!");
            } else {
                setCopyMessage("Kód másolva! Figyelem: a jutalom jóváírásához aktív előfizetés szükséges.");
            }

        } catch (err) {
            setCopyMessage("A másolás sikertelen volt.");
        }
        setTimeout(() => {
            setCopyMessage('');
            setIsCopied(false);
        }, 5000); // Hosszabb idő az olvasáshoz
    };

    const handleCreateCheckoutSession = async (interval) => {
        setError('');
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

    if (isLoading) return <div className={styles.container}><p>Profil betöltése...</p></div>;
    if (!profileData) return <div className={styles.container}><p className={styles.errorMessage}>{error || 'Profiladatok nem elérhetők.'}</p></div>;

    const nextRewardProgress = (profileData.successful_referrals || 0) % 5;
    const trialInfo = profileData.subscriptions?.find(s => s.status === 'trialing' && s.plan_id === null);
    const activeSubInfo = profileData.subscriptions?.find(s => s.status === 'active');
    const futureSubInfo = profileData.subscriptions?.find(s => s.status === 'trialing' && s.plan_id !== null);

    const displayName = profileData.real_name || profileData.username;

    const renderSubscriptionStatus = () => {
        if (isProcessingPayment) {
            return <div className={styles.statusInfo}><p><strong>Fiók frissítése folyamatban...</strong></p></div>;
        }
        if (profileData.subscription_status === 'vip_teacher') {
            return <p className={styles.statusInfo}>A platformhoz való hozzáférésed tanárként korlátlan és díjmentes.</p>;
        }
        if (profileData.is_permanent_free) {
            return <p className={styles.statusInfo}>Örökös prémium hozzáférésed van.</p>;
        }
        if (profileData.is_member_of_approved_class && !activeSubInfo && !futureSubInfo) {
            return <p className={styles.statusInfo}>Prémium hozzáférésed egy osztálytagságon keresztül aktív.</p>;
        }

        if (activeSubInfo || futureSubInfo) {
            return (
                <>
                    {activeSubInfo && (
                         <p className={styles.activeSubscription}>
                            Előfizetésed aktív. {activeSubInfo.current_period_end && `A jelenlegi időszak vége: ${new Date(activeSubInfo.current_period_end).toLocaleDateString()}`}
                        </p>
                    )}
                    {futureSubInfo && (
                        <div className={styles.futureSubscriptionInfo}>
                            <p>Már megvásároltad a(z) <strong>{futureSubInfo.plan_name?.toLowerCase()}</strong> előfizetést. Ez automatikusan elindul, amint a próbaidőszak lejár.</p>
                        </div>
                    )}
                    <button onClick={handleManageSubscription} className={styles.manageButton} disabled={isLoading}>Előfizetés kezelése</button>
                </>
            );
        }

        if (trialInfo) {
            return (
                <>
                    <div className={styles.trialHighlightBox}>
                        <p><strong>Ingyenes próbaidőszakod aktív.</strong> {trialInfo.current_period_end && `A prémium funkciók eddig érhetőek el: ${new Date(trialInfo.current_period_end).toLocaleDateString()}`}</p>
                    </div>
                    {!futureSubInfo && (
                        <div className={styles.subscribeOptions}>
                            <h4>Válts teljes előfizetésre a próbaidőszak lejárta előtt!</h4>
                            <button onClick={() => handleCreateCheckoutSession('monthly')} disabled={isLoading}>Havi Előfizetés</button>
                            <button onClick={() => handleCreateCheckoutSession('yearly')} disabled={isLoading}>Éves Előfizetés (2 hónap ajándék)</button>
                        </div>
                    )}
                </>
            );
        }

        return (
            <>
                <p className={styles.statusInfo}>Jelenleg nincs aktív előfizetésed vagy próbaidőszakod.</p>
                <div className={styles.subscribeOptions}>
                    <h4>Válassz prémium csomagot a korlátlan hozzáféréshez!</h4>
                    <button onClick={() => handleCreateCheckoutSession('monthly')} disabled={isLoading}>Havi Előfizetés</button>
                    <button onClick={() => handleCreateCheckoutSession('yearly')} disabled={isLoading}>Éves Előfizetés (2 hónap ajándék)</button>
                </div>
            </>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.profileBox}>
                <h1>Profilod</h1>
                {message && <p className={styles.successMessage}>{message}</p>}
                {error && <p className={styles.errorMessage}>{error}</p>}

                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Név:</span>
                        {isEditingUsername ? (
                            <div className={styles.editView}>
                                <input type="text" id="username" name="username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                                <button onClick={() => handleUpdateProfile({ username: newUsername })}>Mentés</button>
                                <button className={styles.cancelButton} onClick={() => { setIsEditingUsername(false); setNewUsername(displayName); }}>Mégse</button>
                            </div>
                        ) : (
                           <div className={styles.valueView}>
                                <span className={styles.value}>{displayName}</span>
                                <button onClick={() => setIsEditingUsername(true)}>Szerkeszt</button>
                           </div>
                        )}
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>E-mail cím:</span>
                        <span className={styles.value}>{profileData.email}</span>
                    </div>
                </div>

                {user?.role === 'teacher' && (
                    <>
                        <hr className={styles.divider} />
                        <div className={styles.section}>
                            <h3>Tanári Eszközök</h3>
                            <div className={styles.teacherMode}>
                                <label htmlFor="teacherModeToggle">Mester Mód (Megoldások mutatása)</label>
                                <button onClick={toggleTeacherMode} className={`${styles.toggleButton} ${isTeacherMode ? styles.active : ''}`}>
                                    {isTeacherMode ? 'BEKAPCSOLVA' : 'KIKAPCSOLVA'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <hr className={styles.divider} />

                {user?.role === 'student' && (
                    <>
                        <div className={styles.section}>
                            <h3>Javasolt Gyakorlás</h3>
                            {recommendations.length > 0 ? (
                                <ul className={styles.recommendationList}>
                                    {recommendations.map(rec => (
                                        <li key={rec.quiz_slug}>
                                            <Link to={`/tananyag/${rec.quiz_slug}`}>
                                                {rec.title} <span>(Legutóbbi eredmény: {parseFloat(rec.score_percentage).toFixed(0)}%)</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>Remek munka! Jelenleg nincs olyan témakör, ami ismétlésre szorulna.</p>
                            )}
                        </div>
                        <hr className={styles.divider} />
                    </>
                )}

                <div className={styles.section}>
                    <h3>Tanulási Statisztikák</h3>
                    {!statsData ? <p>Statisztikák betöltése...</p> : (
                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>{statsData.completed_lessons_count || 0}</span>
                                <span className={styles.statLabel}>Elvégzett lecke</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statValue}>{statsData.completed_quizzes_count || 0}</span>
                                <span className={styles.statLabel}>Kitöltött kvíz</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Legjobb eredmények</span>
                                {statsData.best_quiz_results?.length > 0 ? (
                                    <ul>{statsData.best_quiz_results.map((r, i) => <li key={i}>{r.title}: <strong>{parseFloat(r.score_percentage).toFixed(0)}%</strong></li>)}</ul>
                                ) : <p>Nincs még kitöltött kvíz.</p>}
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>Gyakori témakörök</span> {/* JAVÍTOTT: className kétszer szerepelt */}
                                {statsData.most_practiced_subjects?.length > 0 ? (
                                     <ul>{statsData.most_practiced_subjects.map((s, i) => <li key={i}>{s.subject} ({`${s.quiz_count || 0}x`})</li>)}</ul>
                                ) : <p>Nincs még adat.</p>}
                            </div>
                        </div>
                    )}
                </div>

                <hr className={styles.divider} />

                <div className={styles.section}>
                    <h2>Jelszócsere</h2>
                    <form onSubmit={handleChangePassword} className={styles.formGrid}>
                        <input type="password" id="oldPassword" name="oldPassword" placeholder="Régi jelszó" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
                        <input type="password" id="newPassword" name="newPassword" placeholder="Új jelszó" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                        <input type="password" id="confirmNewPassword" name="confirmNewPassword" placeholder="Új jelszó megerősítése" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required />
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
                            <button onClick={copyToClipboard} disabled={isCopied}>{isCopied ? 'Másolva!' : 'Másolás'}</button>
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
                        {renderSubscriptionStatus()}
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