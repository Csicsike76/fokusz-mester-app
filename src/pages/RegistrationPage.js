import React, { useState, useEffect, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import styles from './RegistrationPage.module.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY;

const RegistrationPage = () => {
    const [role, setRole] = useState('student');
    const [formData, setFormData] = useState({
        username: '', email: '', password: '', passwordConfirm: '',
        vipCode: '', referralCode: '', classCode: '', specialCode: '', termsAccepted: false,
    });
    
    const [passwordErrors, setPasswordErrors] = useState({ match: false, strength: false });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const recaptchaRef = useRef();

    useEffect(() => {
        let newErrors = { match: false, strength: false };

        if (formData.password) {
            const hasLowercase = /[a-z]/.test(formData.password);
            const hasUppercase = /[A-Z]/.test(formData.password);
            const hasNumber = /[0-9]/.test(formData.password);
            const hasSymbol = /[^A-Za-z0-9]/.test(formData.password);
            const isLongEnough = formData.password.length >= 8;
            if (!isLongEnough || !hasLowercase || !hasUppercase || !hasNumber || !hasSymbol) {
                newErrors.strength = true;
            }
        }

        if (formData.passwordConfirm && formData.password !== formData.passwordConfirm) {
            newErrors.match = true;
        }

        setPasswordErrors(newErrors);

    }, [formData.password, formData.passwordConfirm]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({ ...prevData, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleRoleChange = (e) => { setRole(e.target.value); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (passwordErrors.strength) {
            setError("A jelszó túl gyenge! Legalább 8 karakter, kis- és nagybetű, szám és speciális karakter szükséges.");
            return;
        }
        if (passwordErrors.match) {
            setError("A két jelszó nem egyezik!");
            return;
        }
        if (!formData.termsAccepted) { setError("El kell fogadnod a felhasználási feltételeket!"); return; }
        if (!recaptchaToken) { setError("Kérjük, igazolja, hogy nem robot."); return; }

        setIsLoading(true);
        const registrationData = { ...formData, recaptchaToken, role: role };

        try {
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData),
            });
            const data = await response.json();
            if (!response.ok) { throw new Error(data.message || 'Ismeretlen hiba történt.'); }
            setMessage(data.message);
            setFormData({
                username: '', email: '', password: '', passwordConfirm: '',
                vipCode: '', referralCode: '', classCode: '', specialCode: '', termsAccepted: false
            });
            setRole('student');
            setRecaptchaToken(null);
            if(recaptchaRef.current) recaptchaRef.current.reset();

        } catch (err) {
            setError(err.message);
            if(recaptchaRef.current) recaptchaRef.current.reset();
        } finally {
            setIsLoading(false);
        }
    };
    
    const getErrorMessage = () => {
        if (error) return error;
        if (passwordErrors.match) return "A két jelszó nem egyezik!";
        if (passwordErrors.strength && formData.password.length > 0 && formData.password.length < 8) return "A jelszónak legalább 8 karakter hosszúnak kell lennie.";
        if (passwordErrors.strength && formData.password.length >= 8) return "A jelszónak tartalmaznia kell kis- és nagybetűt, számot és szimbólumot.";
        return '';
    };

    const finalError = getErrorMessage();
    const isSubmitDisabled = isLoading || (formData.password ? (passwordErrors.strength || passwordErrors.match) : false) || !recaptchaToken;


    return (
        <div className={styles.pageContainer}>
            <div className={styles.formContainer}>
                <h1>Regisztráció</h1>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label>Szerepkör kiválasztása:</label>
                        <div className={styles.roleSelection}>
                            <label><input type="radio" value="student" checked={role === 'student'} onChange={handleRoleChange} /> Tanuló</label>
                            <label><input type="radio" value="teacher" checked={role === 'teacher'} onChange={handleRoleChange} /> Tanár</label>
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="username">Felhasználónév</label>
                        <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="email">E-mail cím</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="password">Jelszó</label>
                        <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="passwordConfirm">Jelszó megerősítése</label>
                        <input type="password" id="passwordConfirm" name="passwordConfirm" value={formData.passwordConfirm} onChange={handleChange} required />
                    </div>
                    
                    {role === 'teacher' && (
                        <div className={`${styles.formGroup} ${styles.conditionalField}`}>
                            <label htmlFor="vipCode">VIP kód (csak tanároknak)</label>
                            <input type="text" id="vipCode" name="vipCode" value={formData.vipCode} onChange={handleChange} required />
                        </div>
                    )}
                    {role === 'student' && (
                        <div className={`${styles.formGroup} ${styles.conditionalField}`}>
                            <label htmlFor="classCode">Osztálykód (ha van)</label>
                            <input type="text" id="classCode" name="classCode" value={formData.classCode} onChange={handleChange} />
                        </div>
                    )}
                    <div className={styles.formGroup}>
                        <label htmlFor="referralCode">Ajánlókód (opcionális)</label>
                        <input type="text" id="referralCode" name="referralCode" value={formData.referralCode} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="specialCode">Speciális Hozzáférési Kód (ha van)</label>
                        <input type="text" id="specialCode" name="specialCode" value={formData.specialCode} onChange={handleChange} />
                    </div>
                    <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
                        <input type="checkbox" id="termsAccepted" name="termsAccepted" checked={formData.termsAccepted} onChange={handleChange} />
                        <label htmlFor="termsAccepted">Elfogadom az Általános Szerződési Feltételeket</label>
                    </div>

                    {RECAPTCHA_SITE_KEY && (
                      <div className={styles.recaptchaContainer}>
                          <ReCAPTCHA
                              ref={recaptchaRef}
                              sitekey={RECAPTCHA_SITE_KEY}
                              onChange={(token) => setRecaptchaToken(token)}
                              onExpired={() => setRecaptchaToken(null)}
                          />
                      </div>
                    )}

                    {message && <p className={styles.successMessage}>{message}</p>}
                    {finalError && <p className={styles.errorMessage}>{finalError}</p>}

                    <button type="submit" className={styles.submitButton} disabled={isSubmitDisabled}>
                        {isLoading ? 'Regisztrálás...' : 'Regisztrálás'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegistrationPage;