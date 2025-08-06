import React, { useState } from 'react';
import styles from './RegistrationPage.module.css';

// A backend URL-jét egy változóba tesszük, hogy könnyen módosítható legyen
const API_URL = 'https://fokusz-mester-backend.onrender.com';

const RegistrationPage = () => {
    const [role, setRole] = useState('student');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        passwordConfirm: '',
        vipCode: '',
        referralCode: '',
        classCode: '',
        termsAccepted: false,
    });
    // Új állapotok a visszajelzéshez
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleRoleChange = (e) => { setRole(e.target.value); };

    // A handleSubmit függvényt teljesen újraírjuk
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (formData.password !== formData.passwordConfirm) {
            setError("A jelszavak nem egyeznek!");
            return;
        }
        if (!formData.termsAccepted) {
            setError("El kell fogadnod a felhasználási feltételeket!");
            return;
        }

        setIsLoading(true); // Töltés jelzése

        const registrationData = {
            role,
            username: formData.username,
            email: formData.email,
            password: formData.password,
            referralCode: formData.referralCode,
            ...(role === 'teacher' && { vipCode: formData.vipCode }),
            ...((role === 'student' || role === 'class') && { classCode: formData.classCode }),
        };

        try {
            // A FETCH HÍVÁS A BACKEND FELÉ
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registrationData),
            });

            const data = await response.json();

            if (!response.ok) {
                // Hiba esetén a szerver válaszát jelenítjük meg
                throw new Error(data.message || 'Ismeretlen hiba történt.');
            }

            // Sikeres regisztr