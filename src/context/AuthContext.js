import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [registrationDate, setRegistrationDate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            
            if (storedToken && storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setToken(storedToken);

                // A regisztrációs dátumot és az előfizetést mindig a user objektumból származtatjuk
                if (parsedUser.createdAt) {
                    setRegistrationDate(new Date(parsedUser.createdAt));
                }
                const subscribedFlag = parsedUser?.isSubscribed || false;
                setIsSubscribed(subscribedFlag);
            }
        } catch (error) {
            console.error("Hiba a localStorage olvasása közben", error);
            localStorage.clear();
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = (userData, userToken) => {
        // Ez a függvény CSAK a bejelentkezéskor fut le.
        // A 'createdAt' adatot a userData objektumból olvassa ki és menti el.
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userToken);
        setUser(userData);
        setToken(userToken);
        
        const subscribedFlag = userData?.isSubscribed || false;
        setIsSubscribed(subscribedFlag);
        
        if (userData.createdAt) {
            setRegistrationDate(new Date(userData.createdAt));
        }
    };
    
    // ÚJ FUNKCIÓ: A felhasználói adatok frissítésére
    const updateUser = (newUserData) => {
        // Ez a függvény frissíti a meglévő felhasználói adatokat.
        // Összefésüli a régi és új adatokat, hogy semmi se vesszen el.
        const updatedUser = { ...user, ...newUserData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Frissítjük a származtatott állapotokat is
        if (updatedUser.createdAt) {
            setRegistrationDate(new Date(updatedUser.createdAt));
        }
        const subscribedFlag = updatedUser?.isSubscribed || false;
        setIsSubscribed(subscribedFlag);
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
        setToken(null);
        setIsSubscribed(false);
        setRegistrationDate(null);
    };

    const isTrialActive = useMemo(() => {
        if (!registrationDate) return false;
        const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
        const expirationDate = new Date(registrationDate.getTime() + thirtyDaysInMillis);
        return new Date() < expirationDate;
    }, [registrationDate]);

    const canUsePremium = isSubscribed || isTrialActive;

    const value = {
        user,
        token,
        isSubscribed,
        isLoading,
        isTrialActive,
        canUsePremium,
        registrationDate, // Hozzáadva, hogy a ProfilePage is elérje
        login,
        logout,
        updateUser, // Hozzáadva az új frissítő funkció
    };

    if (isLoading) {
        return null;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};