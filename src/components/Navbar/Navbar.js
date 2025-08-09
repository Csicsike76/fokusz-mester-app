import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';
import { useNav } from '../../hooks/useNav';
import ConditionalLink from '../ConditionalLink/ConditionalLink';
import UserMenu from './UserMenu';
import Search from '../Search/Search';

const Navbar = () => {
    const navItems = useNav(); // Az hook-tól már a szűrt menüpontokat kapjuk

    return (
        <nav className={styles.navbar}>
            <div className={styles.logo}>
                <Link to="/">"Fókusz Mester"</Link>
            </div>

            <div className={styles.navLinks}>
                {navItems.map(item => (
                    <ConditionalLink key={item.id} to={item.path} className={item.id === 'dashboard' ? styles.dashboardLink : ''}>
                        {item.label}
                    </ConditionalLink>
                ))}
            </div>

            <div className={styles.rightSide}>
                <Search />
                <div className={styles.authLinks}>
                    <UserMenu />
                </div>
            </div>
            {/* ... a hamburger menü logikája ide jöhet ... */}
        </nav>
    );
};

export default Navbar;