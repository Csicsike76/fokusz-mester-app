import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    // Dátum, amikor a felhasználó regisztrált. Ez alapján számoljuk a 30 napos próbaidőt.
    const [registrationDate, setRegistrationDate] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            const storedRegistrationDate = localStorage.getItem('registrationDate');
            if (storedToken && storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(parsedUser);
                // Felhasználó regisztrációs dátumának beállítása, ha van tárolva
                if (storedRegistrationDate) {
                    setRegistrationDate(new Date(storedRegistrationDate));
                }
                /*
                 * A korábbi implementáció minden bejelentkezett felhasználót előfizetőnek
                 * tekintett. Itt ezt csak akkor tesszük meg, ha a tárolt adatok alapján a
                 * felhasználónak tényleges előfizetése van. Amennyiben nincs ilyen
                 * információnk, az alapértelmezett érték hamis, tehát a 30 napos próbaidő
                 * fog érvényesülni.
                 */
                const storedIsSubscribed = localStorage.getItem('isSubscribed');
                if (storedIsSubscribed === 'true') {
                    setIsSubscribed(true);
                }
            }
        } catch (error) {
            console.error("Hiba a localStorage olvasása közben", error);
            // Hiba esetén is kiürítjük a tárolót a biztonság kedvéért
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('registrationDate');
            localStorage.removeItem('isSubscribed');
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Felhasználó bejelentkeztetése.
     *
     * A `userData` tartalmazhat egy előfizetés állapotot és egy regisztrációs dátumot.
     * Ha nem tartalmaz, akkor új belépésnél a regisztrációs dátumot a mai napra
     * állítjuk, és alapértelmezés szerint a felhasználónak nincs előfizetése.
     */
    const login = (userData, userToken) => {
        // Mentjük a felhasználó és a token adatait
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userToken);
        setUser(userData);
        setToken(userToken);

        // Előfizetés állapota felhasználói adatokból vagy localStorage‑ből
        const subscribedFlag = userData?.isSubscribed || false;
        setIsSubscribed(!!subscribedFlag);
        localStorage.setItem('isSubscribed', String(!!subscribedFlag));

        // Regisztrációs dátum beállítása: ha van már, akkor megtartjuk, különben ma
        const storedRegistrationDate = localStorage.getItem('registrationDate');
        if (storedRegistrationDate) {
            setRegistrationDate(new Date(storedRegistrationDate));
        } else {
            const now = new Date();
            localStorage.setItem('registrationDate', now.toISOString());
            setRegistrationDate(now);
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
        setIsSubscribed(false);
        setRegistrationDate(null);
        localStorage.removeItem('registrationDate');
        localStorage.removeItem('isSubscribed');
    };

    /**
     * Számolja, hogy a 30 napos próbaidő még érvényes‑e. Ha a regisztrációs dátum
     * nincs megadva, akkor nincs próbaidő sem.
     */
    const isTrialActive = (() => {
        if (!registrationDate) return false;
        const now = new Date();
        const diffMs = now.getTime() - registrationDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays < 30;
    })();

    /**
     * Meghatározza, hogy a felhasználó használhatja‑e a prémium eszközöket.
     * Előfizetéssel vagy érvényes próbaidővel engedélyezzük a hozzáférést.
     */
    const canUsePremium = isSubscribed || isTrialActive;

    const value = {
        user,
        token,
        isSubscribed,
        isLoading,
        registrationDate,
        isTrialActive,
        canUsePremium,
        login,
        logout,
    };

    if (isLoading) {
        return null;
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};