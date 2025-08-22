// src/context/AuthContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState({
        token: localStorage.getItem('token') || null,
        isAuthenticated: false,
        user: null,
        loading: true, // ÚJ: Betöltési állapot
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Ellenőrizzük a token lejárati idejét
                if (decoded.exp * 1000 > Date.now()) {
                    setAuth({
                        token: token,
                        isAuthenticated: true,
                        user: {
                            id: decoded.userId,
                            role: decoded.role,
                            email: decoded.email,
                        },
                        loading: false,
                    });
                } else {
                    // Lejárt token
                    localStorage.removeItem('token');
                    setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
                }
            } catch (error) {
                // Érvénytelen token
                localStorage.removeItem('token');
                setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
            }
        } else {
            setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
        }
    }, []);

    const login = (token) => {
        localStorage.setItem('token', token);
        const decoded = jwtDecode(token);
        setAuth({
            token: token,
            isAuthenticated: true,
            user: {
                id: decoded.userId,
                role: decoded.role,
                email: decoded.email,
            },
            loading: false,
        });
    };

    const logout = () => {
        localStorage.removeItem('token');
        setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
    };

    return (
        <AuthContext.Provider value={{ auth, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);