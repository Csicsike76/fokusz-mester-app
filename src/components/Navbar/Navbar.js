import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../data/navItems';
import UserMenu from './UserMenu'; 
import NotificationBell from './NotificationBell'; 
import Search from '../Search/Search';
import { FaDownload } from 'react-icons/fa'; // A letöltés ikon importálása

const Navbar = () => {
    const { user } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navRef = useRef(null);

    const userRole = user ? user.role : 'guest';

    const accessibleNavItems = NAV_ITEMS.filter(item => item.roles.includes(userRole));

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (navRef.current && !navRef.current.contains(event.target) && !event.target.closest(`.${styles.hamburger}`)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <nav className={styles.navbar} ref={navRef}>
            {/* Hamburger gomb mobil nézetben, elsőként */}
            <button className={styles.hamburger} onClick={toggleMenu} aria-label="Menü megnyitása/bezárása">
                {isMenuOpen ? '✕' : '☰'}
            </button>

            {/* Logó (csak asztali nézeten látható) */}
            <div className={styles.logo}>
                <Link to="/">"Fókusz Mester"</Link>
            </div>

            {/* Navigációs linkek konténere (mobil nézeten becsúszó menü) */}
            <div className={`${styles.navLinksContainer} ${isMenuOpen ? styles.open : ''}`}>
                {accessibleNavItems.map(item => (
                     <NavLink 
                        key={item.id} 
                        to={item.path} 
                        className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        {item.label}
                    </NavLink>
                ))}
                <NavLink to="/kapcsolat" className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink} onClick={() => setIsMenuOpen(false)}>Kapcsolat</NavLink>
                <div className={styles.dropdown}>
                    <button className={styles.navLink}>Jogi Dokumentumok</button>
                    <div className={styles.dropdownContent}>
                        <Link to="/aszf" onClick={() => setIsMenuOpen(false)}>ÁSZF</Link>
                        <Link to="/adatkezeles" onClick={() => setIsMenuOpen(false)}>Adatkezelési Tájékoztató</Link>
                    </div>
                </div>
                {/* ÚJ: Alkalmazás letöltése link a mobil menübe */}
                <NavLink
                    to="/alkalmazas-letoltese"
                    className={`${styles.navLink} ${styles.mobileDownloadButton}`} 
                    onClick={() => setIsMenuOpen(false)}
                >
                    <FaDownload /> Alkalmazás letöltése
                </NavLink>
            </div>

            {/* Jobb oldali elemek (asztali nézeten jobbra, mobil nézeten a hamburger mögött) */}
            <div className={styles.rightSide}>
                {/* Asztali nézetű Alkalmazás letöltése gomb */}
                <NavLink
                    to="/alkalmazas-letoltese"
                    className={`${styles.navLink} ${styles.desktopDownloadButton}`} 
                >
                    <FaDownload /> Alkalmazás letöltése
                </NavLink>

                <div className={styles.searchWrapper}>
                    <Search />
                </div>

                {user ? ( 
                    <>
                        <NotificationBell /> 
                        <UserMenu /> 
                    </>
                ) : (
                    <div className={styles.authLinks}> 
                        <UserMenu /> 
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;