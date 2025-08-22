// src/context/AuthContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState({
        token: null,
        isAuthenticated: false,
        user: null,
        loading: true, 
    });

    // Ez a funkció a token alapján beállítja a teljes user state-et
    const setAuthStateFromToken = (token) => {
        try {
            const decoded = jwtDecode(token);
            if (decoded.exp * 1000 > Date.now()) {
                setAuth({
                    token: token,
                    isAuthenticated: true,
                    user: {
                        userId: decoded.userId,
                        role: decoded.role,
                        email: decoded.email,
                        username: decoded.username,
                    },
                    loading: false,
                });
                return true;
            }
        } catch (error) {
            // Hiba esetén is a "kijelentkezett" állapotot állítjuk be
        }
        localStorage.removeItem('token');
        setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
        return false;
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setAuthStateFromToken(token);
        } else {
            setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
        }
    }, []);

    const login = (token) => {
        localStorage.setItem('token', token);
        setAuthStateFromToken(token);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
    };

    return (
        <AuthContext.Provider value={{ auth, login, logout }}>
            {!auth.loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);