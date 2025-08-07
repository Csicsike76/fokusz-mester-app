import React from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Ez a komponens megkapja, hogy mely szerepkörök engedélyezettek az adott útvonalon
const ProtectedRoute = ({ allowedRoles }) => {
    const { user } = useAuth(); // Kiolvassuk a bejelentkezett felhasználót a központi állapotból
    const location = useLocation();

    // 1. Ellenőrzés: Be van-e jelentkezve a felhasználó?
    if (!user) {
        // Ha nincs, átirányítjuk a bejelentkezési oldalra.
        // A 'state' segít, hogy bejelentkezés után visszairányítsuk ide.
        return <Navigate to="/bejelentkezes" state={{ from: location }} replace />;
    }

    // 2. Ellenőrzés: Megfelelő-e a szerepköre?
    // Az 'allowedRoles' egy tömb (pl. ['teacher']). Megnézzük, a user.role benne van-e.
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Ha nincs jogosultsága, átirányítjuk a főoldalra.
        return <Navigate to="/" replace />;
    }

    // Ha minden ellenőrzés sikeres, megjelenítjük a védett oldalt.
    return <Outlet />;
};

export default ProtectedRoute;