import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Navbar.module.css';
import { FaUserCircle, FaPowerOff } from 'react-icons/fa'; 

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

    const displayName = user.username.length > 10 ? `${user.username.substring(0, 8)}...` : user.username;

    return (
        <div className={styles.userControls}> 
            <div className={styles.welcomeUserContainer} data-tooltip={`Üdv, ${user.username}!`}>
                <span className={styles.welcomeUserText}>{displayName}</span>
                <FaUserCircle className={styles.userIcon} />
            </div>
            
            <button onClick={logout} className={styles.logoutButton}>
                <span className={styles.logoutText}>Kijelentkezés</span> 
                <FaPowerOff className={styles.logoutIcon} /> 
            </button>
        </div>
    );
};

export default UserMenu;