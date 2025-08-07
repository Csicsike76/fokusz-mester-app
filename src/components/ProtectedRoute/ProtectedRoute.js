import React from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    // Kiolvassuk a felhasználót és a betöltési állapotot a központi "hűtőből" (Context)
    const { user, isLoading } = useAuth();
    const location = useLocation();

    // 1. VÁRAKOZÁS:
    // Ha a Context még olvassa be az adatokat a böngésző memóriájából (isLoading === true),
    // akkor egy "Betöltés..." üzenetet jelenítünk meg, és nem csinálunk semmit.
    // Ez a kulcsfontosságú lépés, ami megakadályozza a korai, hibás átirányítást.
    if (isLoading) {
        return <div>Betöltés...</div>; // Ide később egy szebb, animált betöltő is kerülhet
    }

    // 2. BEJELENTKEZÉS ELLENŐRZÉSE:
    // Ha a betöltés befejeződött (isLoading === false), és még mindig nincs felhasználói adat (user === null),
    // az azt jelenti, hogy a felhasználó valóban nincs bejelentkezve.
    if (!user) {
        // Ebben az esetben átirányítjuk a bejelentkezési oldalra.
        // A 'state' és 'replace' attribútumok javítják a felhasználói élményt a böngésző "vissza" gombjának használatakor.
        return <Navigate to="/bejelentkezes" state={{ from: location }} replace />;
    }
    
    // 3. JOGOSULTSÁG (SZEREPKÖR) ELLENŐRZÉSE:
    // Megnézzük, hogy az ehhez az útvonalhoz megengedett szerepkörök ('allowedRoles') listája
    // tartalmazza-e a bejelentkezett felhasználó szerepkörét ('user.role').
    const isAllowed = allowedRoles?.includes(user?.role);
    
    // Ha a felhasználó szerepköre megfelelő ('isAllowed' === true), akkor megjelenítjük a védett oldalt (az <Outlet />-et).
    // Ha nem (pl. egy diák próbál a tanári irányítópultra lépni), akkor átirányítjuk a főoldalra.
    return isAllowed ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;