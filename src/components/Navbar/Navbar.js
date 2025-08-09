import React, { useState } from 'react';
import styles from './Navbar.module.css';
import ConditionalLink from '../ConditionalLink/ConditionalLink';
import { useAuth } from '../../context/AuthContext';
import Search from '../Search/Search';

const Navbar = () => {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, isLoading } = useAuth();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLinkClick = () => {
    if (isMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.logo}>
        <ConditionalLink to="/" onClick={handleLinkClick}>
          "Fókusz Mester" Tanulási<br />Időzítő
        </ConditionalLink>
      </div>

      <div className={`${styles.menuContainer} ${isMobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.navLinks}>
          <a href="/#ingyenes-leckek" onClick={handleLinkClick}>Ingyenes Leckék</a>
          <a href="/#premium-kurzusok" onClick={handleLinkClick}>Kurzusok</a>
          <ConditionalLink to="/targy/matematika/5" onClick={handleLinkClick}>Matematika</ConditionalLink>
          <ConditionalLink to="/targy/fizika/7" onClick={handleLinkClick}>Fizika</ConditionalLink>
          
          {!isLoading && user && (
            <ConditionalLink to="/profil" onClick={handleLinkClick}>Profil</ConditionalLink>
          )}

          {!isLoading && user && user.role === 'teacher' && (
            <ConditionalLink to="/dashboard/teacher" onClick={handleLinkClick} className={styles.dashboardLink}>Irányítópult</ConditionalLink>
          )}
        </div>

        <div className={styles.authLinks}>
          {isLoading ? (
            <div style={{ height: '40px' }}></div>
          ) : user ? (
            <>
              <span className={styles.welcomeUser}>Üdv, {user.username}!</span>
              <button onClick={logout} className={styles.logoutButton}>Kijelentkezés</button>
            </>
          ) : (
            <>
              <ConditionalLink to="/bejelentkezes" className={styles.loginButton} onClick={handleLinkClick}>Bejelentkezés</ConditionalLink>
              <ConditionalLink to="/regisztracio" className={styles.authButton} onClick={handleLinkClick}>Regisztráció</ConditionalLink>
            </>
          )}
        </div>
      </div>
      
        <div className={styles.search}>
           <Search />
        </div>

      <div className={styles.hamburger} onClick={toggleMobileMenu}>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </nav>
  );
};

export default Navbar;