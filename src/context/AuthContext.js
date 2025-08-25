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

                if (parsedUser.created_at) { // JAVÍTÁS: created_at a helyes kulcs
                    setRegistrationDate(new Date(parsedUser.created_at));
                }
                
                // JAVÍTÁS: Az előfizetési státuszt is a szervertől kapott adatok alapján állítjuk be
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

    const login = (userData, userToken) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userToken);
        setUser(userData);
        setToken(userToken);
        
        const subscribedFlag = userData?.is_subscribed || false;
        setIsSubscribed(subscribedFlag);
        
        if (userData.created_at) { // JAVÍTÁS: created_at a helyes kulcs
            setRegistrationDate(new Date(userData.created_at));
        }
    };
    
    const updateUser = (newUserData) => {
        // JAVÍTÁS: A teljes felhasználói objektumot frissítjük, nem csak összefésüljük
        setUser(newUserData);
        localStorage.setItem('user', JSON.stringify(newUserData));

        // Frissítjük a származtatott állapotokat is a legfrissebb adatokból
        if (newUserData.created_at) {
            setRegistrationDate(new Date(newUserData.created_at));
        }
        
        // Ez a legfontosabb sor: a szervertől kapott 'is_subscribed' alapján állítjuk be a státuszt.
        const subscribedFlag = newUserData?.is_subscribed || false;
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
        if (!registrationDate || isSubscribed) return false; // Ha már előfizetett, a próbaidőszak nem számít
        const thirtyDaysInMillis = 30 * 24 * 60 * 60 * 1000;
        const expirationDate = new Date(registrationDate.getTime() + thirtyDaysInMillis);
        return new Date() < expirationDate;
    }, [registrationDate, isSubscribed]);

    const canUsePremium = isSubscribed || isTrialActive;

    const value = {
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
    };

    if (isLoading) {
        return null;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};