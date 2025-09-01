import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { API_URL } from '../config/api'; // HOZZÁADVA

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [registrationDate, setRegistrationDate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTeacherMode, setIsTeacherMode] = useState(false);

    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            const teacherMode = localStorage.getItem('teacherMode') === 'true';

            if (storedToken && storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setToken(storedToken);

                if (parsedUser.created_at) {
                    setRegistrationDate(new Date(parsedUser.created_at));
                }
                
                const subscribedFlag = parsedUser?.is_subscribed || false;
                setIsSubscribed(subscribedFlag);

                if (parsedUser.role === 'teacher' && teacherMode) {
                    setIsTeacherMode(true);
                }
            }
        } catch (error) {
            console.error("Hiba a localStorage olvasása közben", error);
            localStorage.clear();
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback((userData, userToken) => {
        const userToStore = { ...userData, real_name: userData.real_name || userData.username };
        localStorage.setItem('user', JSON.stringify(userToStore));
        localStorage.setItem('token', userToken);
        setUser(userToStore);
        setToken(userToken);
        
        const subscribedFlag = userData?.is_subscribed || false;
        setIsSubscribed(subscribedFlag);
        
        if (userData.created_at) {
            setRegistrationDate(new Date(userData.created_at));
        }

        if (userData.role !== 'teacher') {
            localStorage.removeItem('teacherMode');
            setIsTeacherMode(false);
        }
    }, []);
    
    // HOZZÁADVA: Új függvény a Google bejelentkezés kezelésére
    const handleGoogleLogin = useCallback(async (credentialResponse, role = 'student') => {
        const response = await fetch(`${API_URL}/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: credentialResponse.credential,
                role: role // Regisztrációnál átadjuk a kiválasztott szerepkört
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Sikertelen Google azonosítás.');
        }
        return data; // Visszaadja a { user, token } objektumot
    }, []);

    const updateUser = useCallback((newUserData) => {
        const userToStore = { ...newUserData, real_name: newUserData.real_name || newUserData.username };
        setUser(userToStore);
        localStorage.setItem('user', JSON.stringify(userToStore));

        if (newUserData.created_at) {
            setRegistrationDate(new Date(newUserData.created_at));
        }
        
        const subscribedFlag = newUserData?.is_subscribed || false;
        setIsSubscribed(subscribedFlag);
    }, []);

    const logout = useCallback(() => {
        localStorage.clear();
        setUser(null);
        setToken(null);
        setIsSubscribed(false);
        setRegistrationDate(null);
        setIsTeacherMode(false);
    }, []);

    const toggleTeacherMode = useCallback(() => {
        if (user?.role !== 'teacher') return;

        if (!isTeacherMode) {
            const enteredPin = prompt("Kérlek, add meg a tanári PIN kódot a Mester Mód aktiválásához:");
            if (enteredPin === "121909") {
                localStorage.setItem('teacherMode', 'true');
                setIsTeacherMode(true);
                alert("Mester Mód aktiválva. A kvízek mostantól a megoldásokkal fognak megjelenni.");
            } else if (enteredPin) {
                alert("Hibás PIN kód!");
            }
        } else {
            localStorage.removeItem('teacherMode');
            setIsTeacherMode(false);
            alert("Mester Mód kikapcsolva.");
        }
    }, [user, isTeacherMode]);

    const isTrialActive = useMemo(() => {
        if (!registrationDate || isSubscribed) return false;
        const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
        const expirationDate = new Date(registrationDate.getTime() + thirtyDaysInMillis);
        return new Date() < expirationDate;
    }, [registrationDate, isSubscribed]);

    const canUsePremium = isSubscribed || isTrialActive;

    const value = useMemo(() => ({
        user,
        token,
        isSubscribed,
        isLoading,
        isTrialActive,
        canUsePremium,
        registrationDate,
        isTeacherMode,
        login,
        logout,
        updateUser,
        toggleTeacherMode,
        handleGoogleLogin, // HOZZÁADVA
    }), [user, token, isSubscribed, isLoading, isTrialActive, canUsePremium, registrationDate, isTeacherMode, login, logout, updateUser, toggleTeacherMode, handleGoogleLogin]);

    if (isLoading) {
        return null;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};