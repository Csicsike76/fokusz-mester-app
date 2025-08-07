import React from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, token } = useAuth(); // A 'token'-t is kiolvassuk a megbízhatóságért
    const location = useLocation();

    // 1. Elsődleges ellenőrzés: Van-e érvényes token és user adat?
    //    Ha nincs, akkor a felhasználó biztosan nincs bejelentkezve.
    if (!token || !user) {
        // Átirányítás a bejelentkezési oldalra
        return <Navigate to="/bejelentkezes" state={{ from: location }} replace />;
    }
    
    // 2. Szerepkör ellenőrzés:
    //    Megnézzük, hogy az 'allowedRoles' lista tartalmazza-e a felhasználó szerepkörét.
    //    A '?.' (optional chaining) operátor megvéd attól, ha a 'user.role' véletlenül nem létezne.
    const isAllowed = allowedRoles?.includes(user?.role);
    
    // Ha a felhasználó szerepköre engedélyezett, akkor megjelenítjük a védett oldalt (Outlet).
    // Ha nem (pl. diák próbál tanári oldalra menni), akkor a főoldalra irányítjuk.
    return isAllowed ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;