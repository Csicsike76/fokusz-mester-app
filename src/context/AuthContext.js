import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            if (storedToken && storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
                // Ideiglenesen minden bejelentkezett felhasználó előfizetőnek számít
                setIsSubscribed(true); 
            }
        } catch (error) {
            console.error("Hiba a localStorage olvasása közben", error);
            // Hiba esetén is kiürítjük a tárolót a biztonság kedvéért
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = (userData, userToken) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userToken);
        setUser(userData);
        setToken(userToken);
        // Ideiglenesen minden bejelentkezett felhasználó előfizetőnek számít
        setIsSubscribed(true);
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
        setIsSubscribed(false);
    };

    const value = {
        user,
        token,
        isSubscribed,
        isLoading,
        login,
        logout
    };

    if (isLoading) {
        return null;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};