import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './SimpleMessagePage.module.css';
import { API_URL } from '../config/api'; // JAVÍTÁS: A központi konfiguráció használata

const EmailVerificationPage = () => {
    const { token } = useParams();
    const [verificationStatus, setVerificationStatus] = useState('Megerősítés folyamatban...');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setVerificationStatus('Hiba: Hiányzó megerősítő kód.');
            setIsLoading(false);
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await fetch(`${API_URL}/api/verify-email/${token}`);
                const data = await response.json();

                if (response.ok && data.success) {
                    setVerificationStatus(data.message);
                    setIsSuccess(true);
                } else {
                    throw new Error(data.message || 'Ismeretlen hiba történt a megerősítés során.');
                }
            } catch (error) {
                setVerificationStatus(`Hiba: ${error.message}`);
                setIsSuccess(false);
            } finally {
                setIsLoading(false);
            }
        };

        verifyEmail();
    }, [token]);

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