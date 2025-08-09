import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';

const UserMenu = () => {
    const { user, logout } = useAuth();

    if (!user) {
        return (
            <>
                <Link to="/bejelentkezes" className={styles.loginButton}>Bejelentkezés</Link>
                <Link to="/regisztracio" className={styles.authButton}>Regisztráció</Link>
            </>
        );
    }

    return (
        <>
            <span className={styles.welcomeUser}>Üdv, {user.username}!</span>
            <button onClick={logout} className={styles.logoutButton}>Kijelentkezés</button>
        </>
    );
};

export default UserMenu;