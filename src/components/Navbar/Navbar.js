// src/components/Navbar/Navbar.js
import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import styles from './Navbar.module.css';
import { useNav } from '../../hooks/useNav';
import UserMenu from './UserMenu';
import Search from '../Search/Search';

const Navbar = () => {
    const navItems = useNav();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <nav className={styles.navbar}>
            <div className={styles.logo}>
                <Link to="/">"Fókusz Mester"</Link>
            </div>

            <button className={styles.hamburger} onClick={toggleMenu} aria-label="Menü megnyitása/bezárása">
                {isMenuOpen ? '✕' : '☰'}
            </button>
            
            <div className={`${styles.navLinks} ${isMenuOpen ? styles.open : ''}`}>
                {navItems.map(item => (
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
                
                {/* === JOGI DOKUMENTUMOK LENYÍLÓ MENÜ HOZZÁADVA === */}
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
        </nav>
    );
};

export default Navbar;