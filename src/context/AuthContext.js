import React, { createContext, useState, useContext, useEffect } from 'react';

// 1. Létrehozzuk a Context objektumot, ami egy központi "adattároló" lesz
const AuthContext = createContext(null);

// 2. Létrehozzuk a "Provider" komponenst. Ez fogja "ellátni" az egész
//    alkalmazást a bejelentkezési adatokkal.
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

    // Ez a rész lefut, amikor az alkalmazás először betöltődik.
    // Megnézi, hogy a felhasználó korábban bejelentkezett-e, és ha igen,
    // visszaállítja az állapotát a localStorage-ból.
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // A "login" függvény, amit a LoginPage fog meghívni sikeres bejelentkezéskor.
    // Elmenti az adatokat a böngészőbe és frissíti a központi állapotot.
    const login = (userData, userToken) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userToken);
        setUser(userData);
        setToken(userToken);
    };

    // A "logout" függvény, amit a Navbar fog meghívni.
    // Törli az adatokat a böngészőből és a központi állapotból.
    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
    };

    // Összegyűjtjük azokat az értékeket és függvényeket,
    // amiket elérhetővé akarunk tenni az alkalmazás többi része számára.
    const value = {
        user,
        token,
        login,
        logout
    };

    // Visszaadjuk a Provider komponenst, ami körbeveszi a többi komponenst
    // és ellátja őket a "value"-ban definiált adatokkal.
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 3. Létrehozunk egy egyszerű "hook"-ot (segédfüggvényt).
// Ahelyett, hogy minden komponensben bonyolultan kellene elérni a context-et,
// csak meg kell hívnunk a "useAuth()"-t.
export const useAuth = () => {
    return useContext(AuthContext);
};