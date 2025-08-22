// src/pages/TeacherApprovalPage.js

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './SimpleMessagePage.module.css';

// Az API URL az éles backend címére mutat
const API_URL = 'https://fokusz-mester-backend.onrender.com';

const TeacherApprovalPage = () => {
    const { userId } = useParams();
    const [message, setMessage] = useState('Jóváhagyás folyamatban...');
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const approveTeacher = async () => {
            // Ellenőrizzük, hogy a link tartalmaz-e felhasználói azonosítót
            if (!userId) {
                setMessage('Hiba: Hiányzó felhasználói azonosító a linkben.');
                setIsError(true);
                setIsLoading(false);
                return;
            }

            try {
                // Elküldjük a GET kérést a szervernek a jóváhagyáshoz. Nincs szükség authentikációra.
                const response = await fetch(`${API_URL}/api/approve-teacher/${userId}`);

                // A szerver HTML választ küld, ezért .text()-et használunk .json() helyett
                const responseText = await response.text();

                if (response.ok) {
                    // A szerver által küldött HTML üzenetet jelenítjük meg
                    setMessage(responseText);
                    setIsError(false);
                } else {
                    // Hiba esetén is a szerver üzenetét jelenítjük meg
                    throw new Error(responseText || 'Ismeretlen hiba történt a jóváhagyás során.');
                }
            } catch (error) {
                setMessage(`Hiba: ${error.message}`);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        approveTeacher();
    }, [userId]);

    return (
        <div className={styles.container}>
            <div className={styles.messageBox}>
                <h1>Tanári Regisztráció Jóváhagyása</h1>
                {isLoading ? (
                    <p>Kérlek, várj...</p>
                ) : (
                    <>
                        {/* A dangerouslySetInnerHTML azért kell, hogy a szerver által küldött HTML-t (pl. <h1>) helyesen jelenítse meg */}
                        <div
                            className={isError ? styles.errorText : styles.successText}
                            dangerouslySetInnerHTML={{ __html: message }}
                        />
                        <Link to="/" className={styles.loginButton}>
                            Vissza a főoldalra
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default TeacherApprovalPage;