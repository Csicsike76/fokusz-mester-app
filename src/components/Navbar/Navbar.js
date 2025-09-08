import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../data/navItems';
import UserMenu from './UserMenu';
import Search from '../Search/Search';

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
            if (navRef.current && !navRef.current.contains(event.target)) {
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
            <div className={styles.logo}>
                <Link to="/">"Fókusz Mester"</Link>
            </div>

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
            </div>

            <div className={styles.rightSide}>
                <div className={styles.searchWrapper}>
                    <Search />
                </div>
                <div className={styles.authLinks}>
                    <UserMenu />
                </div>
            </div>

            <button className={styles.hamburger} onClick={toggleMenu} aria-label="Menü megnyitása/bezárása">
                {isMenuOpen ? '✕' : '☰'}
            </button>
        </nav>
    );
};

export default Navbar;