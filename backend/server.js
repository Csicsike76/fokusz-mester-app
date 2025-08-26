// server.js


const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fsSync = require('fs');
const fsp = require('fs/promises');
const validator = require('validator');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const axios = require('axios');

// JAVÍTÁS: .env betöltése a gyökérkönyvtárból
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });


const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const sslRequired = (() => {
  const flag = String(process.env.DB_SSL || '').toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;

  const url = String(process.env.DATABASE_URL || '');
  if (/render\.com|heroku(app)?\.com|amazonaws\.com|azure|gcp|railway\.app/i.test(url)) return true;
  if (/localhost|127\.0.0\.1/.test(url) || url === '') return false;

  return true;
})();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  ssl: sslRequired ? { rejectUnauthorized: false } : false,
});

const mailPort = Number(process.env.MAIL_PORT || 587);
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_SERVER,
  port: mailPort,
  secure: mailPort === 465,
  auth: { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD },
});

const app = express();

// JAVÍTÁS: CORS beállítása a mobilról érkező kérések engedélyezéséhez
const whitelist = ['http://localhost:3000', process.env.FRONTEND_URL];
if (process.env.NODE_ENV !== 'production') {
    // Fejlesztés közben engedélyezzük a helyi hálózati IP-ket is
    const os = require('os');
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                whitelist.push(`http://${net.address}:3000`);
            }
        }
    }
}
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
};
app.use(cors(corsOptions));


// JAVÍTÁS: Debugging middleware a bejövő kérések naplózásához
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Bejövő kérés: ${req.method} ${req.originalUrl}`);
    next();
});


// A Stripe Webhooknak a nyers body-ra van szüksége az aláírás ellenőrzéséhez.
// Ennek a middleware-nek a globális express.json() előtt kell lennie.
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error(`❌ Stripe webhook signature error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Események kezelése
    switch (event.type) {
        case 'invoice.paid':
            const invoice = event.data.object;
            
            if (invoice.billing_reason === 'subscription_create' || invoice.billing_reason === 'subscription_cycle') {
                const subscriptionId = invoice.subscription;
                
                // JAVÍTÁS: Ellenőrizzük, hogy a subscriptionId létezik-e, mielőtt használnánk
                if (!subscriptionId) {
                    console.error('❌ Hiba: Hiányzó "subscription" azonosító az "invoice.paid" eseményben.', invoice);
                    break; // Kilépünk a switch-ből, ha nincs subscription ID
                }

                const customerId = invoice.customer;

                const client = await pool.connect();
                try {
                    await client.query('BEGIN');

                    const customer = await stripe.customers.retrieve(customerId);
                    const userId = customer.metadata.userId;

                    if (!userId) {
                        throw new Error(`Hiányzó userId a Stripe Customer (${customerId}) metaadataiból!`);
                    }

                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

                    await client.query(
                        `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end, payment_provider, invoice_id)
                         VALUES ($1, $2, $3, to_timestamp($4), to_timestamp($5), 'stripe', $6)
                         ON CONFLICT (user_id) DO UPDATE SET
                            status = $3,
                            current_period_start = to_timestamp($4),
                            current_period_end = to_timestamp($5),
                            invoice_id = $6,
                            updated_at = NOW();
                        `,
                        [
                            userId,
                            subscription.items.data[0].plan.id,
                            subscription.status,
                            subscription.current_period_start,
                            subscription.current_period_end,
                            subscription.id
                        ]
                    );
                    console.log(`✅ Előfizetés sikeresen rögzítve (invoice.paid) a felhasználóhoz: ${userId}`);

                    console.log(`Ajánlói rendszer ellenőrzése a felhasználóhoz: ${userId}`);
                    const referralResult = await client.query('SELECT referrer_user_id FROM referrals WHERE referred_user_id = $1', [userId]);
                    if (referralResult.rows.length > 0) {
                        const referrerId = referralResult.rows[0].referrer_user_id;
                        console.log(`Találat! Az új előfizetőt (${userId}) ez a felhasználó ajánlotta: ${referrerId}`);
                        const successfulReferralsResult = await client.query(
                           `SELECT COUNT(DISTINCT r.referred_user_id)
                            FROM referrals r
                            JOIN subscriptions s ON r.referred_user_id = s.user_id
                            WHERE r.referrer_user_id = $1 AND s.status = 'active'`,
                           [referrerId]
                        );
                        const newTotalReferrals = parseInt(successfulReferralsResult.rows[0].count, 10);
                        console.log(`Az ajánló (${referrerId}) új sikeres ajánlásainak száma: ${newTotalReferrals}`);
                        if (newTotalReferrals > 0 && newTotalReferrals % 5 === 0) {
                            console.log(`JUTALOM JÁR! Az ajánló (${referrerId}) elérte a(z) ${newTotalReferrals}. sikeres ajánlást.`);
                            const referrerSubscription = await client.query("SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1", [referrerId]);
                            if (referrerSubscription.rows.length > 0) {
                                const sub = referrerSubscription.rows[0];
                                await client.query("UPDATE subscriptions SET current_period_end = current_period_end + INTERVAL '1 month' WHERE id = $1", [sub.id]);
                                console.log(`✅ A(z) ${referrerId} felhasználó előfizetése meghosszabbítva 1 hónappal.`);
                                await client.query(`INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Jutalmat kaptál!', 'Egy általad ajánlott felhasználó előfizetett, így jutalmul 1 hónap prémium hozzáférést írtunk jóvá neked. Köszönjük!', 'reward')`, [referrerId]);
                                console.log(`✅ Értesítés elküldve a(z) ${referrerId} felhasználónak a jutalomról.`);
                            } else {
                                console.log(`Az ajánló (${referrerId}) nem rendelkezik aktív előfizetéssel, így nem kap jutalmat.`);
                            }
                        }
                    }

                    await client.query('COMMIT');
                } catch (dbError) {
                    await client.query('ROLLBACK');
                    console.error('❌ Adatbázis hiba az invoice.paid feldolgozása során:', dbError);
                } finally {
                    client.release();
                }
            }
            break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
            const subscriptionUpdated = event.data.object;
            try {
                const clientUpdate = await pool.connect();
                await clientUpdate.query(
                   `UPDATE subscriptions 
                    SET status = $1, current_period_end = to_timestamp($2), updated_at = NOW()
                    WHERE invoice_id = $3`,
                    [
                        subscriptionUpdated.status,
                        subscriptionUpdated.current_period_end,
                        subscriptionUpdated.id
                    ]
                );
                clientUpdate.release();
                console.log(`✅ Előfizetés státusza frissítve (${subscriptionUpdated.id}): ${subscriptionUpdated.status}`);
            } catch (dbError) {
                console.error('❌ Adatbázis hiba az előfizetés frissítésekor:', dbError);
            }
            break;
            
        default:
    }

    res.json({received: true});
});


app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Túl sok próbálkozás, kérjük, próbáld újra 15 perc múlva.',
  },
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req);
    const emailKey = (req.body && req.body.email) ? String(req.body.email).toLowerCase() : '';
    return emailKey ? `${ipKey}:${emailKey}` : ipKey;
  },
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Hiányzó authentikációs token.' });

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: 'Érvénytelen vagy lejárt token.' });
    req.user = user;
    next();
  });
};

const authenticateTokenOptional = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};


app.get('/api/help', async (req, res) => {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    
    try {
      let queryText = 'SELECT * FROM helparticles';
      const queryParams = [];
  
      if (q && q.length >= 2) {
        queryParams.push(`%${q}%`);
        queryText += `
          WHERE LOWER(COALESCE(title,'')) ILIKE $1
             OR LOWER(COALESCE(content,'')) ILIKE $1
             OR LOWER(COALESCE(category,'')) ILIKE $1
             OR LOWER(COALESCE(tags,'')) ILIKE $1
        `;
      }
      queryText += ' ORDER BY category, title;';
      const result = await pool.query(queryText, queryParams);
      const articlesByCategory = result.rows.reduce((acc, article) => {
        const category = article.category || 'Egyéb';
        if (!acc[category]) acc[category] = [];
        
        acc[category].push({
            question: article.title,
            answer: article.content,
            category: article.category,
            keywords: article.tags
        });
        return acc;
      }, {});
      res.status(200).json({ success: true, data: articlesByCategory });
    } catch (error) {
      console.error('/api/help hiba:', error);
      res.status(500).json({ success: false, message: 'Szerverhiba a súgó cikkek lekérdezésekor.' });
    }
});

app.post('/api/register-teacher', async (req, res) => {
  const { email, username, password, referral_code } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ success: false, message: 'Minden mező kitöltése kötelező.' });
  }

  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'E-mail már foglalt.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await pool.query(
      'INSERT INTO users (email, username, password_hash, role, referral_code, email_verified, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
      [email, username, password_hash, 'teacher', referral_code || null, false]
    );

    const verify_token = require('crypto').randomBytes(32).toString('hex');
    await pool.query(
      'INSERT INTO teachers (user_id, is_approved, verify_token) VALUES ($1, $2, $3)',
      [newUser.rows[0].id, false, verify_token]
    );

    const verifyLink = `${process.env.FRONTEND_URL}/verify-teacher?token=${verify_token}`;

    res.status(201).json({
      success: true,
      message: 'Regisztráció kész, a tanári fiók jóváhagyására e-mailt küldtünk.'
    });
  } catch (error) {
    console.error('Tanári regisztráció hiba:', error);
    res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
  }
});

app.post('/api/verify-teacher', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token hiányzik.' });
  }

  try {
    const teacherResult = await pool.query(
      'SELECT * FROM teachers WHERE verify_token = $1',
      [token]
    );

    if (teacherResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Érvénytelen token.' });
    }

    await pool.query(
      'UPDATE teachers SET is_approved = TRUE, verify_token = NULL WHERE verify_token = $1',
      [token]
    );

    res.json({ success: true, message: 'Tanári fiók jóváhagyva.' });
  } catch (error) {
    console.error('Tanári jóváhagyás hiba:', error);
    res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
  }
});



app.post('/api/register', authLimiter, async (req, res) => {
  const {
    role,
    username,
    email,
    password,
    vipCode,
    classCode,
    referralCode,
    specialCode,
    recaptchaToken,
  } = req.body;

  if (!recaptchaToken) {
    return res
      .status(400)
      .json({ success: false, message: 'Kérjük, igazold, hogy nem vagy robot.' });
  }

  try {
    const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}&remoteip=${req.ip || ''}`;
    const response = await axios.post(verificationURL);
    if (!response.data.success) {
      return res
        .status(400)
        .json({ success: false, message: 'A reCAPTCHA ellenőrzés sikertelen.' });
    }
  } catch (reCaptchaError) {
    console.error('reCAPTCHA hiba:', reCaptchaError);
    return res
      .status(500)
      .json({ success: false, message: 'Hiba történt a reCAPTCHA ellenőrzése során.' });
  }

  if (!username || !email || !password || !role) {
    return res
      .status(400)
      .json({ success: false, message: 'Minden kötelező mezőt ki kell tölteni.' });
  }

  const passwordOptions = {
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  };
  if (!validator.isStrongPassword(password, passwordOptions)) {
    return res.status(400).json({
      success: false,
      message:
        'A jelszó túl gyenge! Legalább 8 karakter, kis- és nagybetű, szám és speciális karakter szükséges.',
    });
  }

  let isPermanentFree = false;
  if (specialCode && specialCode === process.env.SPECIAL_ACCESS_CODE) {
    isPermanentFree = true;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userExists = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) throw new Error('Ez az e-mail cím már regisztrálva van.');

    let referrerId = null;
    if (referralCode) {
      const referrerResult = await client.query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referralCode]
      );
      if (referrerResult.rows.length > 0) referrerId = referrerResult.rows[0].id;
    }

    if (role === 'teacher') {
      if (process.env.VIP_CODE && vipCode !== process.env.VIP_CODE && !isPermanentFree) {
        throw new Error('Érvénytelen VIP kód.');
      }
    }

    let classId = null;
    if (role === 'student' && classCode) {
      const classResult = await client.query(
        'SELECT id, max_students FROM classes WHERE class_code = $1 AND is_active = true',
        [classCode]
      );
      if (classResult.rows.length === 0)
        throw new Error('A megadott osztálykód érvénytelen vagy az osztály már nem aktív.');
      classId = classResult.rows[0].id;
      const maxStudents = classResult.rows[0].max_students;
      const memberCountResult = await client.query(
        'SELECT COUNT(*) FROM classmemberships WHERE class_id = $1',
        [classId]
      );
      const memberCount = parseInt(memberCountResult.rows[0].count, 10);
      if (memberCount >= maxStudents) throw new Error('Ez az osztály sajnos már betelt.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 3600000); // 24 óra
    const referralCodeNew =
      role === 'student' ? `FKSZ-${crypto.randomBytes(6).toString('hex').toUpperCase()}` : null;

    const insertUserQuery = `
      INSERT INTO users (username, email, password_hash, role, referral_code, email_verification_token, email_verification_expires, is_permanent_free, email_verified)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, created_at
    `;
    const newUserResult = await client.query(insertUserQuery, [
      username,
      email,
      passwordHash,
      role,
      referralCodeNew,
      verificationToken,
      verificationExpires,
      isPermanentFree,
      false,
    ]);

    const newUserId = newUserResult.rows[0].id;
    const registrationDate = newUserResult.rows[0].created_at;

    if (referrerId) {
      await client.query('INSERT INTO referrals (referrer_user_id, referred_user_id) VALUES ($1,$2)', [
        referrerId,
        newUserId,
      ]);
    }

    if (role === 'teacher') {
      await client.query(
        'INSERT INTO teachers (user_id, vip_code) VALUES ($1,$2)',
        [newUserId, vipCode || null]
      );
      const teacherIsApprovedResult = await client.query('SELECT is_approved from teachers where user_id=$1', [newUserId]);
      if(!teacherIsApprovedResult.rows[0].is_approved) {
        const approvalUrl = `${process.env.FRONTEND_URL}/approve-teacher/${newUserId}`;
        const adminRecipient = process.env.ADMIN_EMAIL || process.env.MAIL_DEFAULT_SENDER || '';
        if (adminRecipient) {
          await transporter.sendMail({
            from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
            to: adminRecipient,
            subject: 'Új Tanári Regisztráció Jóváhagyásra Vár!',
            html: `<p>Új tanár: ${username} (${email})</p><p><a href="${approvalUrl}">Jóváhagyás</a></p>`,
          });
        }
      }
    }

    if (role === 'student' && classId) {
      await client.query('INSERT INTO classmemberships (user_id, class_id) VALUES ($1,$2)', [
        newUserId,
        classId,
      ]);
    }
    
    if (!isPermanentFree) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;
        await transporter.sendMail({
          from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
          to: email,
          subject: 'Erősítsd meg az e-mail címedet!',
          html: `<p>Kérjük, kattints a linkre a megerősítéshez: <a href="${verificationUrl}">Megerősítés</a></p><p>A link 24 óráig érvényes.</p>`,
        });
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Sikeres regisztráció! Kérjük, ellenőrizd az e-mail fiókodat a további teendőkért.',
      user: { id: newUserId, created_at: registrationDate },
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error("Regisztrációs hiba:", err);
    res.status(400).json({ success: false, message: err.message || 'Szerverhiba történt.' });
  } finally {
    if (client) client.release();
  }
});

app.get('/api/verify-email/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email_verification_token = $1 AND email_verification_expires > NOW()',
      [token]
    );
    if (userResult.rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'A megerősítő link érvénytelen vagy lejárt.' });
    }
    const user = userResult.rows[0];
    await pool.query(
      'UPDATE users SET email_verified = true, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1',
      [user.id]
    );
    res
      .status(200)
      .json({ success: true, message: 'Sikeres megerősítés! Most már bejelentkezhetsz.' });
  } catch (error) {
    console.error("Email-ellenőrzési hiba:", error);
    res
      .status(500)
      .json({ success: false, message: 'Szerverhiba történt a megerősítés során.' });
  }
});

app.get('/api/approve-teacher/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            'UPDATE teachers SET is_approved = true WHERE user_id = $1 RETURNING user_id',
            [userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'A tanár nem található.' });
        }
        return res.status(200).send('<h1>A tanári fiók sikeresen jóváhagyva.</h1><p>Ez az ablak bezárható.</p>');
    } catch (error) {
        console.error('Tanár jóváhagyási hiba:', error);
        return res.status(500).send('<h1>Hiba történt a jóváhagyás során.</h1>');
    }
});

app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: 'E-mail és jelszó megadása kötelező.' });
  }
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Hibás e-mail cím vagy jelszó.' });
    }
    const user = userResult.rows[0];
    if (!user.email_verified) {
      return res
        .status(403)
        .json({ success: false, message: 'Kérjük, először erősítsd meg az e-mail címedet!' });
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: 'Hibás e-mail cím vagy jelszó.' });
    }
    if (user.role === 'teacher') {
      const teacherResult = await pool.query('SELECT is_approved FROM teachers WHERE user_id = $1', [
        user.id,
      ]);
      if (teacherResult.rows.length === 0 || !teacherResult.rows[0].is_approved) {
        return res
          .status(403)
          .json({ success: false, message: 'A tanári fiókod még nem lett jóváhagyva.' });
      }
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.SECRET_KEY, {
      expiresIn: '1d',
    });
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        referral_code: user.referral_code,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("Bejelentkezési hiba:", error);
    res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
  }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const userQuery = `
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.role, 
                u.referral_code, 
                u.created_at,
                u.profile_metadata,
                s.status as subscription_status,
                s.current_period_end as subscription_end_date
            FROM users u
            LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
            WHERE u.id = $1
            ORDER BY s.created_at DESC
            LIMIT 1;
        `;
        const userResult = await pool.query(userQuery, [req.user.userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Felhasználó nem található.' });
        }
        const userProfile = userResult.rows[0];

        const referralsResult = await pool.query(
            `SELECT COUNT(DISTINCT r.referred_user_id)
             FROM referrals r
             JOIN subscriptions s ON r.referred_user_id = s.user_id
             WHERE r.referrer_user_id = $1 AND s.status = 'active'`,
            [req.user.userId]
        );
        const successfulReferrals = parseInt(referralsResult.rows[0].count, 10);

        const earnedRewards = Math.floor(successfulReferrals / 5);

        userProfile.successful_referrals = successfulReferrals;
        userProfile.earned_rewards = earnedRewards;
        
        userProfile.is_subscribed = userProfile.subscription_status === 'active';
        
        delete userProfile.subscription_status;
        
        res.status(200).json({ success: true, user: userProfile });
    } catch (error) {
        console.error("Profil lekérdezési hiba:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt a profil adatok lekérdezésekor.' });
    }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ success: false, message: 'A felhasználónév nem lehet üres.' });
    }
    try {
        const updateResult = await pool.query('UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, email, role, referral_code, created_at', [username, req.user.userId]);
        if (updateResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Felhasználó nem található.' });
        }
        res.status(200).json({ success: true, message: 'Felhasználónév sikeresen frissítve.', user: updateResult.rows[0] });
    } catch (error) {
        console.error("Profil frissítési hiba:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

app.post('/api/profile/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'A régi és új jelszó megadása is kötelező.' });
    }

    try {
        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Felhasználó nem található.' });
        }
        
        const user = userResult.rows[0];
        const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isPasswordCorrect) {
            return res.status(401).json({ success: false, message: 'A régi jelszó helytelen.' });
        }

        const passwordOptions = { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 };
        if (!validator.isStrongPassword(newPassword, passwordOptions)) {
            return res.status(400).json({ success: false, message: 'Az új jelszó túl gyenge.' });
        }
        
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, req.user.userId]);
        
        res.status(200).json({ success: true, message: 'Jelszó sikeresen módosítva.' });

    } catch (error) {
        console.error("Jelszócsere hiba:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt a jelszócsere során.' });
    }
});

app.post('/api/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message:
          'Ha az e-mail cím regisztrálva van, kiküldtünk egy linket a jelszó visszaállításához.',
      });
    }
    const user = userResult.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 óra
    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [token, expires, user.id]
    );
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
    const mailOptions = {
      from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
      to: user.email,
      subject: 'Jelszó visszaállítása',
      html: `<p>Jelszó visszaállítási kérelmet kaptunk. A linkre kattintva állíthatsz be új jelszót:</p><p><a href="${resetUrl}">Új jelszó beállítása</a></p><p>A link 1 órán át érvényes. Ha nem te kérted a visszaállítást, hagyd figyelmen kívül ezt az e-mailt.</p>`,
    };
    await transporter.sendMail(mailOptions);
    res.status(200).json({
      success: true,
      message:
        'Ha az e-mail cím regisztrálva van, kiküldtünk egy linket a jelszó visszaállításához.',
    });
  } catch (error) {
    console.error('Jelszó-visszaállítási hiba (kérelem):', error);
    res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
  }
});

app.post('/api/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const passwordOptions = {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    };
    if (!validator.isStrongPassword(password, passwordOptions)) {
      return res
        .status(400)
        .json({ success: false, message: 'A jelszó túl gyenge! A követelményeknek meg kell felelnie.' });
    }
    const userResult = await pool.query(
      'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );
    if (userResult.rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'A jelszó-visszaállító link érvénytelen vagy lejárt.' });
    }
    const user = userResult.rows[0];
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );
    res
      .status(200)
      .json({ success: true, message: 'Jelszó sikeresen módosítva! Most már bejelentkezhetsz.' });
  } catch (error) {
    console.error('Jelszó-visszaállítási hiba (beállítás):', error);
    res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
  }
});

app.get('/api/teacher/classes', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res
        .status(403)
        .json({ message: 'Hozzáférés megtagadva: csak tanárok kérhetik le az osztályaikat.' });
    }
    const teacherId = req.user.userId;
    const query = `
      SELECT c.id, c.class_name, c.class_code, c.max_students, COUNT(cm.user_id) AS student_count
      FROM classes c
      LEFT JOIN classmemberships cm ON c.id = cm.class_id
      WHERE c.teacher_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC;
    `;
    const { rows } = await pool.query(query, [teacherId]);
    res.status(200).json({ success: true, classes: rows });
  } catch (error) {
    console.error('Hiba az osztályok lekérdezésekor:', error);
    res
      .status(500)
      .json({ success: false, message: 'Szerverhiba történt az osztályok lekérdezésekor.' });
  }
});

app.post('/api/classes/create', authenticateToken, async (req, res) => {
  const { className, maxStudents } = req.body;
  try {
    if (req.user.role !== 'teacher') {
      return res
        .status(403)
        .json({ message: 'Hozzáférés megtagadva: csak tanárok hozhatnak létre osztályt.' });
    }
    if (!className || !maxStudents) {
      return res
        .status(400)
        .json({ success: false, message: 'Osztálynév és maximális létszám megadása kötelező.' });
    }
    const teacherId = req.user.userId;
    const classCode = `OSZTALY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const query = `
      INSERT INTO classes (class_name, class_code, teacher_id, max_students, is_active, is_approved)
      VALUES ($1,$2,$3,$4,true,true)
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [className, classCode, teacherId, maxStudents]);
    res.status(201).json({ success: true, message: 'Osztály sikeresen létrehozva!', class: rows[0] });
  } catch (error) {
    console.error('Hiba az osztály létrehozásakor:', error);
    res
      .status(500)
      .json({ success: false, message: 'Szerverhiba történt az osztály létrehozásakor.' });
  }
});

app.get('/api/curriculums', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT title, slug, subject, grade, category, description
      FROM curriculums
      WHERE is_published = true
      ORDER BY
        category,
        COALESCE(subject, 'zzz'),
        COALESCE(grade, 999),
        title
    `);
    const groupedData = {
      freeLessons: {},
      freeTools: [],
      premiumCourses: [],
      premiumTools: []
    };
    for (const row of rows) {
      const item = {
        title: row.title,
        slug: row.slug,
        subject: row.subject || null,
        grade: row.grade,
        description: row.description || null,
        category: row.category
      };
      switch (row.category) {
        case 'free_lesson': {
          const key = row.subject || 'altalanos';
          if (!groupedData.freeLessons[key]) groupedData.freeLessons[key] = [];
          groupedData.freeLessons[key].push(item);
          break;
        }
        case 'free_tool':
          groupedData.freeTools.push(item);
          break;
        case 'premium_course':
          groupedData.premiumCourses.push(item);
          break;
        case 'premium_tool':
          groupedData.premiumTools.push(item);
          break;
        default:
          groupedData.freeTools.push(item);
      }
    }
    res.status(200).json({
      success: true,
      data: groupedData,
      meta: { count: rows.length, timestamp: new Date().toISOString() }
    });
  } catch (err) {
    console.error('❌ /api/curriculums hiba:', err);
    res.status(500).json({ success: false, message: 'Szerverhiba a tananyagok lekérdezésekor.' });
  }
});

app.get('/api/search', authenticateTokenOptional, async (req, res) => {
  const searchTerm = (req.query.q || '').toString().trim();

  if (!searchTerm || searchTerm.length < 3) {
    return res.status(400).json({ success: false, message: 'A kereséshez legalább 3 karakter szükséges.' });
  }

  try {
    let queryText = `
      SELECT title, slug, subject, grade, category, description
      FROM curriculums
      WHERE is_published = true AND (
        LOWER(title) ILIKE $1 OR
        LOWER(slug) ILIKE $1 OR
        LOWER(description) ILIKE $1
      )
    `;
    const queryParams = [`%${searchTerm.toLowerCase()}%`];

    if (!req.user) {
      queryText += ` AND (category = 'free_lesson' OR category = 'free_tool')`;
    }

    queryText += ` ORDER BY title LIMIT 10;`;
    
    const { rows } = await pool.query(queryText, queryParams);
    
    res.status(200).json({
      success: true,
      data: rows,
      meta: { count: rows.length, timestamp: new Date().toISOString() }
    });
  } catch (err) {
    console.error('❌ /api/search hiba:', err);
    res.status(500).json({ success: false, message: 'Szerverhiba a keresés során.' });
  }
});


app.get('/api/quiz/:slug', async (req, res) => {
  try {
    const raw = req.params.slug || '';
    const slug = raw.replace(/_/g, '-');
    
    const tananyagDir = path.resolve(__dirname, 'data', 'tananyag');
    const helpDir = path.resolve(__dirname, 'data', 'help');
    
    const possiblePaths = [
      path.join(tananyagDir, `${slug}.json`),
      path.join(tananyagDir, `${slug}.js`),
      path.join(helpDir, `${slug}.json`),
      path.join(helpDir, `${slug}.js`)
    ];

    let foundPath = null;
    for (const p of possiblePaths) {
        if (fsSync.existsSync(p)) {
            foundPath = p;
            break;
        }
    }

    if (!foundPath) {
      return res.status(404).json({
        success: false,
        message: `Nem található a tartalom: ${slug} sem a 'tananyag', sem a 'help' mappában.`,
      });
    }

    let data;
    if (foundPath.endsWith('.json')) {
      const text = await fsp.readFile(foundPath, 'utf8');
      data = JSON.parse(text);
      console.log(`📄 Betöltve JSON: ${foundPath}`);
    } else {
      delete require.cache[foundPath];
      const mod = require(foundPath);
      data = (mod && mod.default) ? mod.default : mod;
      console.log(`🧩 Betöltve JS modul: ${foundPath}`);
    }

    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { }
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error(`❌ Hiba a(z) /api/quiz/${req.params.slug} feldgozásakor:`, err);
    return res.status(500).json({ success: false, message: 'Szerverhiba történt a tartalom betöltésekor.' });
  }
});

app.post('/api/quiz/results', authenticateToken, async (req, res) => {
    const { curriculumSlug, score, totalQuestions } = req.body;
    const userId = req.user.userId;

    if (!curriculumSlug || typeof score !== 'number' || typeof totalQuestions !== 'number') {
        return res.status(400).json({ success: false, message: 'Hiányos adatok a kvízeredmény mentéséhez.' });
    }

    try {
        // 1. Lekerjuk a curriculum ID-t a slug alapjan
        const curriculumResult = await pool.query('SELECT id FROM curriculums WHERE slug = $1', [curriculumSlug]);
        if (curriculumResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'A megadott tananyag nem található.' });
        }
        const curriculumId = curriculumResult.rows[0].id;
        
        // 2. Kiszamoljuk a szazalekos eredmenyt
        const scorePercentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

        // 3. Eredmeny mentese vagy frissitese az adatbazisban
        const query = `
            INSERT INTO user_quiz_results (user_id, curriculum_id, completed_questions, total_questions, score_percentage, completed_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (user_id, curriculum_id) DO UPDATE SET
                completed_questions = EXCLUDED.completed_questions,
                total_questions = EXCLUDED.total_questions,
                score_percentage = EXCLUDED.score_percentage,
                completed_at = NOW()
            RETURNING *;
        `;
        
        const { rows } = await pool.query(query, [userId, curriculumId, score, totalQuestions, scorePercentage]);
        
        res.status(200).json({ success: true, message: 'Eredmény sikeresen mentve.', data: rows[0] });

    } catch (error) {
        console.error("❌ Hiba a kvízeredmény mentésekor:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt az eredmény mentésekor.' });
    }
});

// === STRIPE INTEGRÁCIÓ ===

// JAVÍTÁS: Checkout session létrehozása, ami kezeli a havi és éves csomagot is
app.post('/api/create-checkout-session', authenticateToken, async (req, res) => {
    const { interval } = req.body; // 'monthly' vagy 'yearly'
    const userId = req.user.userId;

    // Válasszuk ki a megfelelő ár-azonosítót a környezeti változókból
    const priceId = interval === 'yearly'
        ? process.env.STRIPE_PRICE_ID_YEARLY
        : process.env.STRIPE_PRICE_ID_MONTHLY;

    if (!priceId) {
        const errorMessage = `A '${interval}' időszakhoz tartozó Stripe Price ID nincs beállítva a szerveren.`;
        console.error(`❌ ${errorMessage}`);
        return res.status(500).json({ success: false, message: errorMessage });
    }
    
    try {
        const userResult = await pool.query('SELECT email, profile_metadata FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Felhasználó nem található.' });
        }
        const user = userResult.rows[0];
        let stripeCustomerId = user.profile_metadata?.stripe_customer_id;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { userId: userId },
            });
            stripeCustomerId = customer.id;
            await pool.query(
                `UPDATE users SET profile_metadata = profile_metadata || '{"stripe_customer_id": "${stripeCustomerId}"}' WHERE id = $1`,
                [userId]
            );
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer: stripeCustomerId,
            line_items: [{
                price: priceId, // Itt használjuk a kiválasztott ár-azonosítót
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL}/profil?payment_success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/profil?payment_canceled=true`,
            metadata: {
                userId: userId,
            },
        });

        res.json({ success: true, url: session.url });

    } catch (error) {
        console.error('❌ Hiba a Stripe Checkout session létrehozásakor:', error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt a fizetési folyamat indításakor.' });
    }
});


// 2. Billing Portal session létrehozása
app.post('/api/create-billing-portal-session', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const userResult = await pool.query('SELECT profile_metadata FROM users WHERE id = $1', [userId]);
        const stripeCustomerId = userResult.rows[0]?.profile_metadata?.stripe_customer_id;

        if (!stripeCustomerId) {
            return res.status(400).json({ success: false, message: 'Nincs társított fizetési fiók.' });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${process.env.FRONTEND_URL}/profil`,
        });

        res.json({ success: true, url: portalSession.url });

    } catch (error) {
        console.error('❌ Hiba a Billing Portal session létrehozásakor:', error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

// --- ÉRTESÍTÉSI RENDSZER API ---

// 1. Értesítések lekérdezése
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, title, message, type, read, sent_at 
             FROM notifications 
             WHERE user_id = $1 
             ORDER BY sent_at DESC`,
            [req.user.userId]
        );
        res.status(200).json({ success: true, notifications: result.rows });
    } catch (error) {
        console.error("❌ Hiba az értesítések lekérdezésekor:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

// 2. Értesítések olvasottá tétele
app.post('/api/notifications/mark-read', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
            [req.user.userId]
        );
        res.status(200).json({ success: true, message: 'Az értesítések olvasottá téve.' });
    } catch (error) {
        console.error("❌ Hiba az értesítések olvasottá tételekor:", error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});


app.get('/api/admin/clear-users/:secret', async (req, res) => {
  const { secret } = req.params;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ message: 'Hozzáférés megtagadva.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Minden felhasználói adat sikeresen törölve.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Adatbázis törlési hiba:", error);
    res.status(500).json({ success: false, message: 'Hiba történt a törlés során.' });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ A Fókusz Mester szerver elindult a ${PORT} porton.`);
});