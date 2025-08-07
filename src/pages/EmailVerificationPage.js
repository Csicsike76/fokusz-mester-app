import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './SimpleMessagePage.module.css'; // Egy új, közös stíluslapot használunk

const API_URL = 'https://fokusz-mester-backend.onrender.com';

const EmailVerificationPage = () => {
    const { token } = useParams(); // Kiolvassuk a tokent az URL-ből
    const [message, setMessage] = useState('Megerősítés folyamatban...');
    const [error, setError] = useState(false);

    useEffect(() => {
        if (token) {
            const verifyEmail = async () => {
                try {
                    const response = await fetch(`${API_URL}/api/verify-email/${token}`);
                    const responseHtml = await response.text(); // A backend HTML-t küld

                    if (!response.ok) {
                        throw new Error('A megerősítés sikertelen.');
                    }
                    
                    // A backend HTML válaszát nem jelenítjük meg, csak egy saját üzenetet
                    setMessage('Sikeres megerősítés! Most már bejelentkezhetsz.');
                    setError(false);

                } catch (err) {
                    setMessage('A megerősítő link érvénytelen vagy lejárt.');
                    setError(true);
                }
            };
            verifyEmail();
        }
    }, [token]);

    return (
        <div className={styles.container}>
            <div className={`${styles.messageBox} ${error ? styles.error : styles.success}`}>
                <h1>{error ? 'Hiba' : 'Siker!'}</h1>
                <p>{message}</p>
                {!error && (
                    <Link to="/bejelentkezes" className={styles.button}>
                        Tovább a bejelentkezéshez
                    </Link>
                )}
            </div>
        </div>
    );
};

export default EmailVerificationPage;