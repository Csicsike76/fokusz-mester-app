import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    // ÚJ ÁLLAPOT: Jelzi, hogy még töltjük-e az adatokat a localStorage-ból
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Hiba a localStorage olvasása közben", error);
            // Hiba esetén is befejezzük a töltést, hogy ne ragadjon be az oldal
        } finally {
            // Miután végeztünk, a betöltési állapotot hamisra állítjuk
            setIsLoading(false);
        }
    }, []);

    const login = (userData, userToken) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userToken);
        setUser(userData);
        setToken(userToken);
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
    };

    const value = {
        user,
        token,
        isLoading, // Elérhetővé tesszük a betöltési állapotot
        login,
        logout
    };

    // Amíg töltünk, nem jelenítünk meg semmit, hogy elkerüljük a hibákat
    if (isLoading) {
        return null; // Vagy egy betöltő animáció: return <div>Betöltés...</div>;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};