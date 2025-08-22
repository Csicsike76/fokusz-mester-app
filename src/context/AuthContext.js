import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState({
        token: null,
        isAuthenticated: false,
        user: null,
        loading: true, // Kritikus: jelzi, hogy az azonosítási állapot betöltése folyamatban van
    });

    useEffect(() => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
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
                } else {
                    localStorage.removeItem('token');
                    setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
                }
            } else {
                setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
            }
        } catch (error) {
            localStorage.removeItem('token');
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
                userId: decoded.userId,
                role: decoded.role,
                email: decoded.email,
                username: decoded.username,
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
            {!auth.loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);