import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';

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

                if (parsedUser.created_at) {
                    setRegistrationDate(new Date(parsedUser.created_at));
                }
                
                const subscribedFlag = parsedUser?.is_subscribed || false;
                setIsSubscribed(subscribedFlag);
            }
        } catch (error) {
            console.error("Hiba a localStorage olvasása közben", error);
            localStorage.clear();
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback((userData, userToken) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userToken);
        setUser(userData);
        setToken(userToken);
        
        const subscribedFlag = userData?.is_subscribed || false;
        setIsSubscribed(subscribedFlag);
        
        if (userData.created_at) {
            setRegistrationDate(new Date(userData.created_at));
        }
    }, []);
    
    const updateUser = useCallback((newUserData) => {
        setUser(newUserData);
        localStorage.setItem('user', JSON.stringify(newUserData));

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
    }, []);

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
        login,
        logout,
        updateUser,
    }), [user, token, isSubscribed, isLoading, isTrialActive, canUsePremium, registrationDate, login, logout, updateUser]);


    if (isLoading) {
        return null;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};