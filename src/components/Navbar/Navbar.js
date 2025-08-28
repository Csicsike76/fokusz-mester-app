// src/components/Navbar/Navbar.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';
import { useNav } from '../../hooks/useNav';
import ConditionalLink from '../ConditionalLink/ConditionalLink';
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

            {/* Hamburger gomb, ami csak mobilon látszik */}
            <button className={styles.hamburger} onClick={toggleMenu} aria-label="Menü megnyitása/bezárása">
                {isMenuOpen ? '✕' : '☰'}
            </button>
            
            {/* A navLinks most már mobilnézetben is működik az 'open' osztály segítségével */}
            <div className={`${styles.navLinks} ${isMenuOpen ? styles.open : ''}`}>
                {navItems.map(item => (
                    <ConditionalLink 
                        key={item.id} 
                        to={item.path} 
                        className={item.id === 'dashboard' ? styles.dashboardLink : ''}
                        onClick={() => setIsMenuOpen(false)} // Navigáláskor bezárja a menüt
                    >
                        {item.label}
                    </ConditionalLink>
                ))}
                <Link to="/kapcsolat" onClick={() => setIsMenuOpen(false)}>Kapcsolat</Link>
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