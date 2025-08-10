// src/pages/EmailVerificationPage.js

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './SimpleMessagePage.module.css'; // Ezt a fájlt a következő lépésben fogjuk létrehozni

// FONTOS: Az API címet az éles backend címére állítjuk, mivel ez az oldal ott fog kommunikálni vele.
const API_URL = 'https://fokusz-mester-backend.onrender.com';

const EmailVerificationPage = () => {
    const { token } = useParams();
    const [verificationStatus, setVerificationStatus] = useState('Megerősítés folyamatban...');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Ha valamiért token nélkül érkezik ide a felhasználó, hibát jelzünk.
        if (!token) {
            setVerificationStatus('Hiba: Hiányzó megerősítő kód.');
            setIsLoading(false);
            return;
        }

        const verifyEmail = async () => {
            try {
                // Elküldjük a megerősítési kérést a backendnek a token-nel.
                const response = await fetch(`${API_URL}/api/verify-email/${token}`);
                const data = await response.json();

                if (response.ok && data.success) {
                    // Sikeres megerősítés esetén beállítjuk a sikeres állapotot.
                    setVerificationStatus(data.message);
                    setIsSuccess(true);
                } else {
                    // Sikertelen megerősítés esetén a szerver üzenetét jelenítjük meg.
                    throw new Error(data.message || 'Ismeretlen hiba történt a megerősítés során.');
                }
            } catch (error) {
                // Hálózati vagy egyéb hiba esetén is jelezzük a problémát.
                setVerificationStatus(`Hiba: ${error.message}`);
                setIsSuccess(false);
            } finally {
                // Bármi is történik, a betöltést befejezzük.
                setIsLoading(false);
            }
        };

        verifyEmail();
    }, [token]); // Ez a folyamat csak egyszer fut le, amikor az oldal betöltődik.

    return (
        <div className={styles.container}>
            <div className={styles.messageBox}>
                <h1>E-mail Megerősítés</h1>
                {isLoading ? (
                    <p>Kérlek, várj...</p>
                ) : (
                    <>
                        <p className={isSuccess ? styles.successText : styles.errorText}>
                            {verificationStatus}
                        </p>
                        {isSuccess && (
                            <Link to="/bejelentkezes" className={styles.loginButton}>
                                Tovább a bejelentkezéshez
                            </Link>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default EmailVerificationPage;