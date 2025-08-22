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
            const storedRegistrationDate = localStorage.getItem('registrationDate');
            const storedIsSubscribed = localStorage.getItem('isSubscribed');
            
            if (storedToken && storedUser) {
                setUser(JSON.parse(storedUser));
                setToken(storedToken);
                if (storedRegistrationDate) {
                    setRegistrationDate(new Date(storedRegistrationDate));
                }
                if (storedIsSubscribed === 'true') {
                    setIsSubscribed(true);
                }
            }
        } catch (error) {
            console.error("Hiba a localStorage olvasása közben", error);
            localStorage.clear();
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = (userData, userToken) => {
        const now = new Date();
        
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userToken);
        setUser(userData);
        setToken(userToken);
        
        const subscribedFlag = userData?.isSubscribed || false;
        setIsSubscribed(subscribedFlag);
        localStorage.setItem('isSubscribed', String(subscribedFlag));
        
        const regDate = userData?.createdAt ? new Date(userData.createdAt) : now;
        setRegistrationDate(regDate);
        localStorage.setItem('registrationDate', regDate.toISOString());
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
        login,
        logout,
    };

    if (isLoading) {
        return null;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};