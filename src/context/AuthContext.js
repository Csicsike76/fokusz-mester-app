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

    const validateTokenAndSetAuth = (token) => {
        if (!token) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
            return;
        }
        
        try {
            const decoded = jwtDecode(token);
            if (decoded.exp * 1000 > Date.now()) {
                const storedUser = JSON.parse(localStorage.getItem('user'));
                setAuth({
                    token: token,
                    isAuthenticated: true,
                    user: storedUser || {
                        userId: decoded.userId,
                        role: decoded.role,
                        email: decoded.email,
                        username: decoded.username,
                    },
                    loading: false,
                });
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
            }
        } catch (error) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
        }
    };
    
    useEffect(() => {
        const token = localStorage.getItem('token');
        validateTokenAndSetAuth(token);
    }, []);

    const login = (userData, userToken) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userToken);
        setAuth({
            token: userToken,
            isAuthenticated: true,
            user: userData,
            loading: false,
        });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuth({ token: null, isAuthenticated: false, user: null, loading: false });
    };

    return (
        <AuthContext.Provider value={{ auth, login, logout }}>
            {!auth.loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);