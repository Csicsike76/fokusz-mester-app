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
const cron = require('node-cron');
const { OAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const logger = require('./logger');


require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const sslRequired = (() => {
  const flag = String(process.env.DB_SSL || '').toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;

  const url = String(process.env.DATABASE_URL || '');
  if (/render\.com|heroku(app)?\.com|amazonaws\.com|azure|gcp|railway\.app/i.test(url)) return true;
  if (/localhost|127\.0\.0\.1/.test(url) || url === '') return false;

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

const whitelist = [
  'http://localhost:3000', 
  process.env.FRONTEND_URL, 
  'https://fokuszmester.com', 
  'https://www.fokuszmester.com'
];
if (process.env.NODE_ENV !== 'production') {
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
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};
app.use(cors(corsOptions));

app.use((req, res, next) => {
  logger.info(`[${new Date().toISOString()}] Bejövő kérés: ${req.method} ${req.originalUrl}`);
  next();
});

const handleReferralCheck = async (client, userId) => {
  logger.info(`Ajánlói rendszer ellenőrzése a felhasználóhoz: ${userId}`);
  const referralResult = await client.query('SELECT referrer_user_id FROM referrals WHERE referred_user_id = $1', [userId]);
  if (referralResult.rows.length > 0) {
    const referrerId = referralResult.rows[0].referrer_user_id;
    logger.info(`Találat! Az új előfizetőt (${userId}) ez a felhasználó ajánlotta: ${referrerId}`);

    const successfulReferralsResult = await client.query(
      `SELECT COUNT(DISTINCT r.referred_user_id)
       FROM referrals r
       JOIN subscriptions s ON r.referred_user_id = s.user_id
       WHERE r.referrer_user_id = $1 AND s.status IN ('active', 'trialing') AND s.plan_id IS NOT NULL`,
      [referrerId]
    );
    const newTotalReferrals = parseInt(successfulReferralsResult.rows[0].count, 10);
    logger.info(`Az ajánló (${referrerId}) új sikeres ajánlásainak száma: ${newTotalReferrals}`);

    if (newTotalReferrals > 0 && newTotalReferrals % 5 === 0) {
      const milestone = newTotalReferrals;
      const existingRewardResult = await client.query(
        'SELECT id FROM referral_rewards WHERE referrer_user_id = $1 AND milestone_count = $2',
        [referrerId, milestone]
      );

      if (existingRewardResult.rows.length === 0) {
        logger.info(`JUTALOM JÁR! Az ajánló (${referrerId}) elérte a(z) ${milestone}. sikeres ajánlást.`);
        const referrerSubscription = await client.query(
          "SELECT id FROM subscriptions WHERE user_id = $1 AND status IN ('active', 'trialing') ORDER BY created_at DESC LIMIT 1",
          [referrerId]
        );
        if (referrerSubscription.rows.length > 0) {
          const sub = referrerSubscription.rows[0];
          await client.query("UPDATE subscriptions SET current_period_end = current_period_end + INTERVAL '1 month' WHERE id = $1", [sub.id]);
          logger.info(`✅ A(z) ${referrerId} felhasználó előfizetése meghosszabbítva 1 hónappal.`);
          
          await client.query(
            'INSERT INTO referral_rewards (referrer_user_id, milestone_count) VALUES ($1, $2)',
            [referrerId, milestone]
          );

          await client.query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Jutalmat kaptál!', 'Egy általad ajánlott felhasználó előfizetett, így jutalmul 1 hónap prémium hozzáférést írtunk jóvá neked. Köszönjük!', 'reward')`,
            [referrerId]
          );
          logger.info(`✅ Értesítés elküldve a(z) ${referrerId} felhasználónak a jutalomról.`);
        } else {
          logger.warn(`Az ajánló (${referrerId}) nem rendelkezik aktív előfizetéssel, így nem kap jutalmat.`);
        }
      } else {
        logger.info(`Az ajánló (${referrerId}) már kapott jutalmat a(z) ${milestone}. ajánlásért, nincs teendő.`);
      }
    }
  }
};

app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error('❌ Stripe webhook signature error', { message: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const userId = session.metadata.userId;

        if (!userId) {
          throw new Error('Hiányzó userId a checkout session metaadataiból!');
        }

        if (session.mode === 'payment' && session.metadata.type === 'teacher_class_payment') {
          const { className, maxStudents } = session.metadata;
          if (!className || !maxStudents) throw new Error('Hiányos metaadatok a tanári osztály létrehozásához.');

          const classCode = `OSZTALY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
          await client.query(
            `INSERT INTO classes (class_name, class_code, teacher_id, max_students, is_active, is_approved)
             VALUES ($1, $2, $3, $4, true, true) RETURNING *;`,
            [className, classCode, userId, maxStudents]
          );
          logger.info(`✅ Tanári osztály sikeresen létrehozva (fizetés után): ${className}, Tanár ID: ${userId}`);
        }

        if (session.mode === 'subscription') {
          const subscriptionId = session.subscription;
          if (!subscriptionId) throw new Error('Hiányzó subscription ID a checkout.session.completed eseményben.');

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceIdStripe = subscription.items.data[0].plan.id;

          const planResult = await client.query('SELECT id FROM subscription_plans WHERE stripe_price_id = $1', [priceIdStripe]);
          if (planResult.rows.length === 0) throw new Error(`Ismeretlen Stripe Price ID: ${priceIdStripe}.`);
          const planIdDb = planResult.rows[0].id;

          await client.query(
            `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end, payment_provider, invoice_id)
             VALUES ($1, $2, $3, to_timestamp($4), to_timestamp($5), 'stripe', $6)
             ON CONFLICT (user_id) DO UPDATE SET
                plan_id = $2,
                status = $3,
                current_period_start = to_timestamp($4),
                current_period_end = to_timestamp($5),
                invoice_id = $6,
                updated_at = NOW();`,
            [
              userId,
              planIdDb,
              subscription.status,
              subscription.current_period_start,
              subscription.current_period_end,
              subscription.id,
            ]
          );
          logger.info(`✅ Előfizetés sikeresen rögzítve (checkout.session.completed) a felhasználóhoz: ${userId}`);
          
          await handleReferralCheck(client, userId);
        }
        break;

      case 'customer.subscription.updated':
        const subscriptionUpdated = event.data.object;
        const customerIdUpdated = subscriptionUpdated.customer;

        if (subscriptionUpdated.status === 'active' && event.data.previous_attributes && event.data.previous_attributes.status !== 'active') {
            const customerUpdated = await stripe.customers.retrieve(customerIdUpdated);
            const userIdForReferralCheck = customerUpdated.metadata.userId;
            if (userIdForReferralCheck) {
                await handleReferralCheck(client, userIdForReferralCheck);
            }
        }
      case 'customer.subscription.deleted':
        const subEventData = event.data.object;
        const customerIdForUpdate = subEventData.customer;
        const customerForUpdate = await stripe.customers.retrieve(customerIdForUpdate);
        const userIdUpdated = customerForUpdate.metadata.userId;

        if (!userIdUpdated) throw new Error(`Hiányzó userId a Stripe Customer (${customerIdForUpdate}) metaadataiból a subscription esemény során!`);

        await client.query(
          `UPDATE subscriptions 
           SET status = $1, current_period_end = to_timestamp($2), updated_at = NOW()
           WHERE user_id = $3`,
          [subEventData.status, subEventData.current_period_end, userIdUpdated]
        );
        logger.info(`✅ Előfizetés státusza frissítve (${subEventData.id}) esemény (${event.type}) alapján: ${subEventData.status}`);
        break;
    }

    await client.query('COMMIT');
  } catch (dbError) {
    await client.query('ROLLBACK');
    logger.error('❌ Hiba a Stripe webhook feldolgozása során', { message: dbError.message, stack: dbError.stack });
  } finally {
    client.release();
  }

  res.json({ received: true });
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

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Hiányzó authentikációs token.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const { userId, sessionId } = decoded;

    if (!userId || !sessionId) {
      return res.status(403).json({ success: false, message: 'Érvénytelen token formátum.' });
    }

    const userResult = await pool.query('SELECT active_session_id, role FROM users WHERE id = $1 AND archived = false', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Felhasználó nem található.' });
    }
    
    const { active_session_id, role } = userResult.rows[0];

    if (active_session_id !== sessionId) {
      return res.status(401).json({
        success: false,
        message: 'A munkamenet lejárt, valószínűleg egy másik eszközről jelentkeztek be. Kérjük, jelentkezzen be újra.'
      });
    }

    req.user = { ...decoded, role }; 
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(403).json({ success: false, message: 'Érvénytelen vagy lejárt token.' });
    }
    logger.error("Authentication error in middleware", { message: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Szerverhiba az authentikáció során.' });
  }
};

const authenticateTokenOptional = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1];
  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const { userId, sessionId } = decoded;

    if (userId && sessionId) {
      const userResult = await pool.query('SELECT active_session_id FROM users WHERE id = $1 AND archived = false', [userId]);
      if (userResult.rows.length > 0 && userResult.rows[0].active_session_id === sessionId) {
        req.user = decoded;
      }
    }
  } catch (err) {
    // Optional auth: ignore errors and proceed without user
  } finally {
    next();
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Hozzáférés megtagadva: adminisztrátori jogosultság szükséges.' });
  }
};

const authorizeTeacher = (req, res, next) => {
    if (req.user && req.user.role === 'teacher') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Hozzáférés megtagadva: tanári jogosultság szükséges.' });
    }
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
        keywords: article.tags,
      });
      return acc;
    }, {});
    res.status(200).json({ success: true, data: articlesByCategory });
  } catch (error) {
    logger.error('/api/help hiba', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Szerverhiba a súgó cikkek lekérdezésekor.' });
  }
});

app.post('/api/register-teacher', async (req, res) => {
  const { email, username, password, referrerCode } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ success: false, message: 'Minden mező kitöltése kötelező.' });
  }

  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1 AND archived = false', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'E-mail már foglalt.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    let myReferralCode = crypto.randomBytes(8).toString('hex').toUpperCase();
    let codeExists = await pool.query('SELECT 1 FROM users WHERE referral_code = $1', [myReferralCode]);
    while (codeExists.rows.length > 0) {
      myReferralCode = crypto.randomBytes(8).toString('hex').toUpperCase();
      codeExists = await pool.query('SELECT 1 FROM users WHERE referral_code = $1', [myReferralCode]);
    }
    
    const newUser = await pool.query(
      'INSERT INTO users (email, username, password_hash, role, referral_code, email_verified, created_at, real_name) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7) RETURNING *',
      [email, username, password_hash, 'teacher', myReferralCode, false, username]
    );

    const verify_token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      'INSERT INTO teachers (user_id, is_approved, verify_token) VALUES ($1, $2, $3)',
      [newUser.rows[0].id, false, verify_token]
    );

    const verifyLink = `${process.env.BACKEND_URL}/api/verify-teacher-email-link?token=${verify_token}`; // JAVÍTÁS

    const mailOptions = {
      from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
      to: email,
      subject: 'Tanári fiók jóváhagyása - Fókusz Mester',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Kedves ${username}!</h2>
          <p>Köszönjük, hogy regisztráltál a Fókusz Mester platformon tanári fiókkal.</p>
          <p>A fiókod aktiválásához kérjük, kattints az alábbi linkre:</p>
          <a href="${verifyLink}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Fiók aktiválása</a>
          <p>Ha nem te regisztráltál, kérjük, hagyd figyelmen kívül ezt az e-mailt.</p>
          <p>Üdvözlettel,<br>A Fókusz Mester csapata</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
    logger.info(`✅ Jóváhagyó e-mail elküldve: ${email}`);

    if (referrerCode) {
      const referrerResult = await pool.query('SELECT id FROM users WHERE referral_code = $1 AND archived = false', [referrerCode]);
      if (referrerResult.rows.length > 0) {
        const referrerId = referrerResult.rows[0].id;
        await pool.query('INSERT INTO referrals (referrer_user_id, referred_user_id, created_at) VALUES ($1, $2, NOW())', [referrerId, newUser.rows[0].id]);
        logger.info(`✅ Referral rögzítve: referrer ${referrerId}, referred ${newUser.rows[0].id}`);
      } else {
        logger.warn(`❌ Érvénytelen referrerCode: ${referrerCode}`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Regisztráció kész, a tanári fiók jóváhagyására e-mailt küldtünk.',
    });
  } catch (error) {
    logger.error('Tanári regisztráció hiba', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
  }
});

app.post('/api/verify-teacher', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Token hiányzik.' });
  }

  try {
    const teacherResult = await pool.query('SELECT * FROM teachers WHERE verify_token = $1', [token]);

    if (teacherResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Érvénytelen token.' });
    }

    await pool.query('UPDATE teachers SET is_approved = TRUE, verify_token = NULL WHERE verify_token = $1', [token]);

    res.json({ success: true, message: 'Tanári fiók jóváhagyva.' });
  } catch (error) {
    logger.error('Tanári jóváhagyás hiba', { message: error.message, stack: error.stack });
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
    parental_email,
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
    logger.error('reCAPTCHA hiba', { message: reCaptchaError.message, stack: reCaptchaError.stack });
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

    const emailExists = await client.query('SELECT id FROM users WHERE email = $1 AND archived = false', [email]);
    if (emailExists.rows.length > 0) {
        throw new Error('Ez az e-mail cím már regisztrálva van.');
    }

    const usernameExists = await client.query('SELECT id FROM users WHERE username = $1 AND archived = false', [username]);
    if (usernameExists.rows.length > 0) {
        throw new Error('Ez a felhasználónév már foglalt. Kérjük, válassz másikat.');
    }

    let referrerId = null;
    if (referralCode) {
      const referrerResult = await client.query(
        'SELECT id FROM users WHERE referral_code = $1 AND archived = false',
        [referralCode]
      );
      if (referrerResult.rows.length > 0) referrerId = referrerResult.rows[0].id;
    }

    if (role === 'teacher' && !isPermanentFree) {
        if (!vipCode || vipCode.trim() === '' || vipCode !== process.env.VIP_CODE) {
            throw new Error('Érvénytelen vagy hiányzó VIP kód a tanári regisztrációhoz.');
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
    const verificationExpires = new Date(Date.now() + 24 * 3600000); 
    const referralCodeNew =
      role === 'student' ? `FKSZ-${crypto.randomBytes(6).toString('hex').toUpperCase()}` : null;

    const insertUserQuery = `
      INSERT INTO users (username, real_name, email, parental_email, password_hash, role, referral_code, email_verification_token, email_verification_expires, is_permanent_free, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, created_at
    `;
    const newUserResult = await client.query(insertUserQuery, [
      username,
      username,
      email,
      parental_email || null,
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
      
      const adminRecipient = process.env.ADMIN_EMAIL || process.env.MAIL_DEFAULT_SENDER || '';
      if (adminRecipient) {
        const backendUrl = process.env.BACKEND_URL;
        if (!backendUrl) {
            logger.error('FATAL: BACKEND_URL environment variable is not set.');
            throw new Error('Szerver konfigurációs hiba: A jóváhagyó link nem generálható.');
        }
        const approvalUrl = `${backendUrl}/api/admin/approve-teacher-by-link/${newUserId}?secret=${process.env.ADMIN_SECRET}`;
        await transporter.sendMail({
          from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
          to: adminRecipient,
          subject: 'Új Tanári Regisztráció Jóváhagyásra Vár!',
          html: `<p>Új tanár regisztrált: ${username} (${email}).</p><p>A fiók jóváhagyásához, kérjük, kattintson az alábbi linkre:</p><p><a href="${approvalUrl}">Tanári Fiók Jóváhagyása</a></p>`,
        });
      }
    }

    if (role === 'student' && classId) {
      await client.query('INSERT INTO classmemberships (user_id, class_id) VALUES ($1,$2)', [
        newUserId,
        classId,
      ]);
    }
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;
    await transporter.sendMail({
      from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
      to: email,
      subject: 'Erősítsd meg az e-mail címedet a Fókusz Mesteren!',
      html: `<p>Kedves ${username}!</p><p>Köszönjük a regisztrációdat. Kérjük, kattints a linkre a fiókod aktiválásához: <a href="${verificationUrl}">Fiók Aktiválása</a></p><p>A link 24 óráig érvényes.</p>`,
    });

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Sikeres regisztráció! Kérjük, ellenőrizd az e-mail fiókodat a megerősítő linkért.',
      user: { id: newUserId, created_at: registrationDate },
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    logger.error("Regisztrációs hiba:", { message: err.message, stack: err.stack });
    res.status(400).json({ success: false, message: err.message || 'Szerverhiba történt.' });
  } finally {
    if (client) client.release();
  }
});

app.get('/api/verify-email/:token', async (req, res) => {
  const { token } = req.params;
  const client = await pool.connect();
  try {
    const userResult = await client.query(
      'SELECT id, role FROM users WHERE email_verification_token = $1 AND email_verification_expires > NOW()',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'A megerősítő link érvénytelen vagy lejárt.' });
    }
    const user = userResult.rows[0];

    await client.query('BEGIN');

    await client.query(
      'UPDATE users SET email_verified = true, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1',
      [user.id]
    );

    if (user.role !== 'teacher') {
      const trialQuery = `
        INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end, payment_provider)
        VALUES ($1, NULL, 'trialing', NOW(), NOW() + INTERVAL '30 days', 'system')
        ON CONFLICT (user_id) DO NOTHING;
      `;
      await client.query(trialQuery, [user.id]);
    }

    await client.query('COMMIT');
    
    res
      .status(200)
      .json({ success: true, message: 'Sikeres megerősítés! A 30 napos prémium próbaidőszakod elindult. Most már bejelentkezhetsz.' });
  
    } catch (error) {
    await client.query('ROLLBACK');
    logger.error("Email-ellenőrzési hiba:", { message: error.message, stack: error.stack });
    res
      .status(500)
      .json({ success: false, message: 'Szerverhiba történt a megerősítés során.' });
  } finally {
    client.release();
  }
});

app.get('/api/admin/approve-teacher-by-link/:userId', async (req, res) => {
    const { userId } = req.params;
    const { secret } = req.query;

    if (!secret || secret !== process.env.ADMIN_SECRET) {
        return res.status(403).send('Hozzáférés megtagadva: érvénytelen biztonsági kulcs.');
    }

    try {
        const result = await pool.query(
            'UPDATE teachers SET is_approved = true WHERE user_id = $1 RETURNING user_id',
            [userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).send('A tanár nem található.');
        }
        
        res.send(`
            <!DOCTYPE html>
            <html lang="hu">
            <head>
                <title>Jóváhagyás Sikeres</title>
                <meta charset="UTF-8">
                <style>body { font-family: sans-serif; text-align: center; padding-top: 50px; }</style>
            </head>
            <body>
                <p>A tanári fiók sikeresen jóváhagyva.</p>
                <p>Ez az ablak hamarosan bezáródik.</p>
                <script>
                    setTimeout(() => window.close(), 3000);
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        logger.error('Tanár jóváhagyási hiba:', { message: error.message, stack: error.stack });
        res.status(500).send('Szerverhiba történt a jóváhagyás során.');
    }
});

app.post('/api/admin/approve-teacher/:userId', authenticateToken, authorizeAdmin, async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            'UPDATE teachers SET is_approved = true WHERE user_id = $1 RETURNING user_id',
            [userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'A tanár nem található.' });
        }
        return res.status(200).json({ success: true, message: 'A tanári fiók sikeresen jóváhagyva.'});
    } catch (error) {
        logger.error('Tanár jóváhagyási hiba (admin):', { message: error.message, stack: error.stack });
        return res.status(500).json({ success: false, message: 'Szerverhiba történt a jóváhagyás során.'});
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
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1 AND archived = false', [email]);
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
    
    const newSessionId = crypto.randomBytes(32).toString('hex');
    await pool.query(
        'UPDATE users SET active_session_id = $1, last_seen = NOW() WHERE id = $2',
        [newSessionId, user.id]
    );

    const token = jwt.sign(
      { userId: user.id, sessionId: newSessionId },
      process.env.SECRET_KEY,
      { expiresIn: '1d' }
    );

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
    logger.error("Bejelentkezési hiba:", { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
  }
});

const getFullUserProfile = async (userId) => {
    const userQuery = `
        SELECT
            u.id, u.username, u.real_name, u.email, u.role, u.referral_code, u.created_at,
            u.profile_metadata, u.is_permanent_free, u.avatar_url, u.xp, u.last_seen
        FROM users u
        WHERE u.id = $1 AND u.archived = false;
    `;
    const userResult = await pool.query(userQuery, [userId]);
    if (userResult.rows.length === 0) return null;

    const userProfile = userResult.rows[0];

    const subsQuery = `
        SELECT s.status, s.plan_id, s.current_period_end, s.created_at, p.name as plan_name
        FROM subscriptions s
        LEFT JOIN subscription_plans p ON s.plan_id = p.id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
    `;
    const subsResult = await pool.query(subsQuery, [userId]);
    userProfile.subscriptions = subsResult.rows;

    const activeSub = subsResult.rows.find(s => s.status === 'active');
    const trialSub = subsResult.rows.find(s => s.status === 'trialing' && s.plan_id === null);
    const futureSub = subsResult.rows.find(s => s.status === 'trialing' && s.plan_id !== null);

    let primarySub = activeSub || futureSub || trialSub;
    
    userProfile.subscription_status = primarySub?.status || null;
    userProfile.subscription_end_date = primarySub?.current_period_end || null;

    if (userProfile.role === 'teacher') {
        userProfile.subscription_status = 'vip_teacher';
    }

    const referralsResult = await pool.query(
        `SELECT COUNT(DISTINCT r.referred_user_id)
         FROM referrals r
         JOIN subscriptions s ON r.referred_user_id = s.user_id
         WHERE r.referrer_user_id = $1 AND s.status IN ('active', 'trialing') AND s.plan_id IS NOT NULL`,
        [userId]
    );
    const successfulReferrals = parseInt(referralsResult.rows?.[0]?.count || 0, 10);
    
    const rewardsResult = await pool.query('SELECT COUNT(*) FROM referral_rewards WHERE referrer_user_id = $1', [userId]);
    const earnedRewards = parseInt(rewardsResult.rows?.[0]?.count || 0, 10);

    userProfile.successful_referrals = successfulReferrals;
    userProfile.earned_rewards = earnedRewards;
    
    let hasActiveClassMembership = false;
    if (userProfile.role === 'student') {
        const classResult = await pool.query(
            `SELECT 1 FROM classmemberships cm
             JOIN classes c ON cm.class_id = c.id
             WHERE cm.user_id = $1 AND c.is_active = true AND c.is_approved = true
             LIMIT 1`,
            [userId]
        );
        hasActiveClassMembership = classResult.rowCount > 0;
    }
    userProfile.is_member_of_approved_class = hasActiveClassMembership;
    
    userProfile.is_subscribed = userProfile.is_permanent_free || !!activeSub || !!futureSub || hasActiveClassMembership;

    return userProfile;
};

app.get('/api/profile/recommendations', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const threshold = 80;

    try {
        const query = `
            SELECT DISTINCT ON (sp.quiz_slug)
                sp.quiz_slug,
                sp.score_percentage,
                c.title
            FROM student_progress sp
            JOIN curriculums c ON sp.quiz_slug = c.slug
            WHERE sp.user_id = $1
              AND sp.activity_type = 'quiz_completed'
              AND sp.score_percentage < $2
            ORDER BY sp.quiz_slug, sp.completed_at DESC;
        `;
        const { rows } = await pool.query(query, [userId, threshold]);

        res.status(200).json({ success: true, recommendations: rows });
    } catch (error) {
        logger.error("Ajánlások lekérdezési hiba:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt az ajánlások lekérdezésekor.' });
    }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        const userProfile = await getFullUserProfile(req.user.userId);
        if (!userProfile) {
            return res.status(404).json({ success: false, message: 'Felhasználó nem található.' });
        }
        res.status(200).json({ success: true, user: userProfile });
    } catch (error) {
        logger.error("Profil lekérdezési hiba:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt a profil adatok lekérdezésekor.' });
    }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
    const { username } = req.body;
    const userId = req.user.userId;

    if (!username || username.trim() === '') {
        return res.status(400).json({ success: false, message: 'A felhasználónév nem lehet üres.' });
    }
    try {
        await pool.query(
            'UPDATE users SET username = $1, real_name = $2 WHERE id = $3', 
            [username.trim(), username.trim(), userId]
        );
        
        const updatedUserProfile = await getFullUserProfile(userId);
        if (!updatedUserProfile) {
             return res.status(404).json({ success: false, message: 'A frissített felhasználó nem található.' });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Felhasználónév sikeresen frissítve.', 
            user: updatedUserProfile 
        });

    } catch (error) {
        logger.error("Profil frissítési hiba:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

app.post('/api/profile/change-password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'A régi és új jelszó megadása is kötelező.' });
    }

    try {
        const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1 AND archived = false', [req.user.userId]);
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
        logger.error("Jelszócsere hiba:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt a jelszócsere során.' });
    }
});

app.get('/api/profile/stats', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const completedLessonsResult = await pool.query(
            'SELECT COUNT(DISTINCT lesson_slug) FROM student_progress WHERE user_id = $1 AND activity_type = \'lesson_viewed\'',
            [userId]
        );
        const completed_lessons_count = parseInt(completedLessonsResult.rows[0].count, 10);

        const bestQuizResultsResult = await pool.query(
            `SELECT c.title, uqr.score_percentage
             FROM user_quiz_results uqr
             JOIN curriculums c ON uqr.curriculum_id = c.id
             WHERE uqr.user_id = $1
             ORDER BY uqr.score_percentage DESC
             LIMIT 3`,
            [userId]
        );
        const best_quiz_results = bestQuizResultsResult.rows;

        const mostPracticedSubjectsResult = await pool.query(
            `SELECT c.subject, COUNT(c.subject) as lesson_count
             FROM student_progress sp
             JOIN curriculums c ON sp.quiz_slug = c.slug
             WHERE sp.user_id = $1 AND c.subject IS NOT NULL
             GROUP BY c.subject
             ORDER BY lesson_count DESC
             LIMIT 3`,
            [userId]
        );
        const most_practiced_subjects = mostPracticedSubjectsResult.rows;

        res.status(200).json({
            success: true,
            stats: {
                completed_lessons_count,
                best_quiz_results,
                most_practiced_subjects,
            }
        });

    } catch (error) {
        logger.error("Statisztika lekérdezési hiba:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt a statisztikák lekérdezésekor.' });
    }
});

app.delete('/api/profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        
        const deleteResult = await client.query(
            'UPDATE users SET archived = true, active_session_id = NULL, email = email || \'-deleted-\' || id::text WHERE id = $1', 
            [userId]
        );

        if (deleteResult.rowCount === 0) {
            throw new Error('A felhasználó nem található a törléshez.');
        }

        await client.query('COMMIT');
        
        res.status(200).json({ success: true, message: 'A fiók és a hozzá kapcsolódó összes adat sikeresen archiválásra került.' });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error("Fióktörlési hiba:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt a fiók törlése során.' });
    } finally {
        client.release();
    }
});


app.post('/api/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1 AND archived = false', [email]);
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
    logger.error('Jelszó-visszaállítási hiba (kérelem):', { message: error.message, stack: error.stack });
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
      'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW() AND archived = false',
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
    logger.error('Jelszó-visszaállítási hiba (beállítás):', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
  }
});

app.get('/api/teacher/classes', authenticateToken, authorizeTeacher, async (req, res) => {
  try {
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
    logger.error('Hiba az osztályok lekérdezésekor:', { message: error.message, stack: error.stack });
    res
      .status(500)
      .json({ success: false, message: 'Szerverhiba történt az osztályok lekérdezésekor.' });
  }
});

app.post('/api/teacher/create-class-checkout-session', authenticateToken, authorizeTeacher, async (req, res) => {
    const { className, maxStudents } = req.body;
    const teacherId = req.user.userId;

    if (!className || !maxStudents || maxStudents < 5 || maxStudents > 30) {
        return res.status(400).json({ success: false, message: 'Érvénytelen osztályadatok.' });
    }

    const priceId = process.env.STRIPE_PRICE_ID_TEACHER_CLASS;
    if (!priceId) {
        return res.status(500).json({ success: false, message: 'A tanári csomag árazása nincs beállítva a szerveren.' });
    }

    try {
        const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [teacherId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'A tanár felhasználó nem található.' });
        }
        const teacherEmail = userResult.rows[0].email;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: teacherEmail,
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/dashboard/teacher?class_creation_success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/dashboard/teacher?class_creation_canceled=true`,
            metadata: {
                type: 'teacher_class_payment',
                userId: teacherId,
                className: className,
                maxStudents: maxStudents,
            },
        });

        res.json({ success: true, url: session.url });

    } catch (error) {
        logger.error('❌ Hiba a tanári osztály Checkout session létrehozásakor:', { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt a fizetési folyamat indításakor.' });
    }
});

app.post('/api/classes/create', authenticateToken, authorizeAdmin, async (req, res) => {
  const { className, maxStudents } = req.body;
  try {
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
    logger.error('Hiba az osztály létrehozásakor:', { message: error.message, stack: error.stack });
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
    logger.error('❌ /api/curriculums hiba:', { message: err.message, stack: err.stack });
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
    logger.error('❌ /api/search hiba:', { message: err.message, stack: err.stack });
    res.status(500).json({ success: false, message: 'Szerverhiba a keresés során.' });
  }
});


app.get('/api/quiz/:slug', async (req, res) => {
  try {
    const raw = req.params.slug || '';
    const slug = raw.replace(/[^a-zA-Z0-9-]/g, '');

    if (slug !== raw) {
        return res.status(400).json({ success: false, message: 'Érvénytelen karakterek a tartalmazonosítóban.' });
    }
    
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
      logger.info(`📄 Betöltve JSON: ${foundPath}`);
    } else {
      delete require.cache[foundPath];
      const mod = require(foundPath);
      data = (mod && mod.default) ? mod.default : mod;
      logger.info(`🧩 Betöltve JS modul: ${foundPath}`);
    }

    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { }
    }

    return res.json({ success: true, data });
  } catch (err) {
    logger.error(`❌ Hiba a(z) /api/quiz/${req.params.slug} feldgozásakor:`, { message: err.message, stack: err.stack });
    return res.status(500).json({ success: false, message: 'Szerverhiba történt a tartalom betöltésekor.' });
    }
});

app.post('/api/create-checkout-session', authenticateToken, async (req, res) => {
    const { interval } = req.body;
    const userId = req.user.userId;

    const priceId = interval === 'yearly'
        ? process.env.STRIPE_PRICE_ID_YEARLY
        : process.env.STRIPE_PRICE_ID_MONTHLY;

    if (!priceId) {
        const errorMessage = `A '${interval}' időszakhoz tartozó Stripe Price ID nincs beállítva a szerveren.`;
        logger.error(`❌ ${errorMessage}`);
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
        
        const subscriptionResult = await pool.query(
            'SELECT status, current_period_end FROM subscriptions WHERE user_id = $1',
            [userId]
        );

        const checkoutOptions = {
            payment_method_types: ['card'],
            customer: stripeCustomerId,
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL}/profil?payment_success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/profil?payment_canceled=true`,
            metadata: {
                userId: userId,
            },
        };
        
        const currentSubscription = subscriptionResult.rows[0];
        if (currentSubscription && currentSubscription.status === 'trialing') {
            const trialEndDate = new Date(currentSubscription.current_period_end);
            const now = new Date();
            if (trialEndDate > now) {
                const remainingMilliseconds = trialEndDate.getTime() - now.getTime();
                const remainingDays = Math.ceil(remainingMilliseconds / (1000 * 60 * 60 * 24));

                if (remainingDays > 0) {
                    checkoutOptions.subscription_data = {
                        trial_period_days: remainingDays
                    };
                }
            }
        }

        const session = await stripe.checkout.sessions.create(checkoutOptions);

        res.json({ success: true, url: session.url });

    } catch (error) {
        logger.error('❌ Hiba a Stripe Checkout session létrehozásakor:', { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt a fizetési folyamat indításakor.' });
    }
});


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
        logger.error('❌ Hiba a Billing Portal session létrehozásakor:', { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

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
        logger.error("❌ Hiba az értesítések lekérdezésekor:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

app.post('/api/notifications/mark-read', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
            [req.user.userId]
        );
        res.status(200).json({ success: true, message: 'Az értesítések olvasottá téve.' });
    } catch (error) {
        logger.error("❌ Hiba az értesítések olvasottá tételekor:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

app.post('/api/quiz/submit-result', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { slug, score, totalQuestions, level } = req.body;

    if (!slug || typeof score === 'undefined' || !totalQuestions || !level) {
        return res.status(400).json({ success: false, message: 'Hiányos adatok a kvíz eredményének mentéséhez.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const curriculumResult = await client.query('SELECT id, title FROM curriculums WHERE slug = $1', [slug]);
        if (curriculumResult.rows.length === 0) {
            throw new Error('A megadott tananyag nem található az adatbázisban.');
        }
        const { id: curriculumId, title: curriculumTitle } = curriculumResult.rows[0];
        const scorePercentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
        
        const insertQueryOld = `
            INSERT INTO user_quiz_results (user_id, curriculum_id, completed_questions, total_questions, score_percentage, completed_at, level)
            VALUES ($1, $2, $3, $4, $5, NOW(), $6)
            ON CONFLICT (user_id, curriculum_id, level) DO UPDATE SET
                completed_questions = EXCLUDED.completed_questions,
                total_questions = EXCLUDED.total_questions,
                score_percentage = EXCLUDED.score_percentage,
                completed_at = NOW();
        `;
        await client.query(insertQueryOld, [userId, curriculumId, score, totalQuestions, scorePercentage, level]);

        const insertQueryNew = `
            INSERT INTO student_progress (user_id, activity_type, quiz_slug, score_percentage, completed_at, metadata)
            VALUES ($1, 'quiz_completed', $2, $3, NOW(), $4);
        `;
        const progressResult = await client.query(insertQueryNew, [userId, slug, scorePercentage, JSON.stringify({ level, score, totalQuestions })]);

        await client.query('COMMIT');
        
        const userDetails = await pool.query('SELECT real_name, parental_email FROM users WHERE id = $1', [userId]);
        if (userDetails.rows.length > 0 && userDetails.rows[0].parental_email) {
            const { real_name, parental_email } = userDetails.rows[0];
            const mailOptions = {
                from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
                to: parental_email,
                subject: `Fókusz Mester - ${real_name} új kvízt töltött ki!`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                        <h2>Kedves Szülő!</h2>
                        <p>Gyermeke, <strong>${real_name}</strong>, sikeresen befejezett egy gyakorló kvízt a Fókusz Mester platformon.</p>
                        <h3>Részletek:</h3>
                        <ul>
                            <li><strong>Tananyag:</strong> ${curriculumTitle}</li>
                            <li><strong>Elért eredmény:</strong> ${score} / ${totalQuestions} pont (${scorePercentage.toFixed(0)}%)</li>
                            <li><strong>Nehézségi szint:</strong> ${level}</li>
                            <li><strong>Dátum:</strong> ${new Date().toLocaleString('hu-HU')}</li>
                        </ul>
                        <p>A diákok haladását Ön is nyomon követheti a tanári felületen, amennyiben regisztrált tanárként is használja a rendszert.</p>
                        <p>Üdvözlettel,<br>A Fókusz Mester csapata</p>
                    </div>
                `,
            };
            transporter.sendMail(mailOptions).catch(err => logger.error("Szülői értesítő e-mail küldési hiba:", { message: err.message, stack: err.stack }));
        }

        res.status(200).json({ success: true, message: 'Eredmény sikeresen elmentve.' });

    } catch (error) {
        await client.query('ROLLBACK');
        logger.error("❌ Hiba a kvíz eredményének mentésekor:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt az eredmény mentésekor.' });
    } finally {
        client.release();
    }
});

app.post('/api/lesson/viewed', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { slug } = req.body;
    if (!slug) {
        return res.status(400).json({ success: false, message: 'Hiányzó tananyag azonosító.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const curriculumResult = await client.query('SELECT title FROM curriculums WHERE slug = $1', [slug]);
        if (curriculumResult.rows.length === 0) {
            throw new Error('A megadott tananyag nem található az adatbázisban.');
        }
        const { title: curriculumTitle } = curriculumResult.rows[0];

        const progressResult = await client.query(
            `INSERT INTO student_progress (user_id, activity_type, lesson_slug, started_at, completed_at)
             VALUES ($1, 'lesson_viewed', $2, NOW(), NOW())`,
            [userId, slug]
        );

        await client.query('COMMIT');

        const userDetails = await pool.query('SELECT real_name, parental_email FROM users WHERE id = $1', [userId]);
        if (userDetails.rows.length > 0 && userDetails.rows[0].parental_email) {
            const { real_name, parental_email } = userDetails.rows[0];
            const mailOptions = {
                from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
                to: parental_email,
                subject: `Fókusz Mester - ${real_name} új leckét tekintett meg!`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                        <h2>Kedves Szülő!</h2>
                        <p>Gyermeke, <strong>${real_name}</strong>, megtekintett egy új tananyagot a Fókusz Mester platformon.</p>
                        <h3>Részletek:</h3>
                        <ul>
                            <li><strong>Tananyag:</strong> ${curriculumTitle}</li>
                            <li><strong>Dátum:</strong> ${new Date().toLocaleString('hu-HU')}</li>
                        </ul>
                        <p>Üdvözlettel,<br>A Fókusz Mester csapata</p>
                    </div>
                `,
            };
            transporter.sendMail(mailOptions).catch(err => logger.error("Szülői értesítő e-mail küldési hiba:", { message: err.message, stack: err.stack }));
        }

        res.status(200).json({ success: true, message: 'Lecke megtekintése rögzítve.' });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error("❌ Hiba a lecke megtekintésének rögzítésekor:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    } finally {
        client.release();
    }
});

app.get('/api/teacher/class/:classId/students', authenticateToken, authorizeTeacher, async (req, res) => {
    const { classId } = req.params;
    const teacherId = req.user.userId;
    try {
        const classCheck = await pool.query('SELECT 1 FROM classes WHERE id = $1 AND teacher_id = $2', [classId, teacherId]);
        if (classCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: "Nincs jogosultsága ehhez az osztályhoz." });
        }
        
        const query = `
            SELECT u.id, u.real_name, u.email
            FROM users u
            JOIN classmemberships cm ON u.id = cm.user_id
            WHERE cm.class_id = $1
            ORDER BY u.real_name;
        `;
        const { rows } = await pool.query(query, [classId]);
        res.status(200).json({ success: true, students: rows });
    } catch (error) {
        logger.error(`❌ Hiba a(z) ${classId} osztály diákjainak lekérdezésekor:`, { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

app.get('/api/teacher/student/:studentId/progress', authenticateToken, authorizeTeacher, async (req, res) => {
    const { studentId } = req.params;
    const teacherId = req.user.userId;
    try {
        const accessCheck = await pool.query(`
            SELECT 1 FROM classmemberships cm
            JOIN classes c ON cm.class_id = c.id
            WHERE cm.user_id = $1 AND c.teacher_id = $2
        `, [studentId, teacherId]);
        
        if (accessCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: "Nincs jogosultsága ennek a diáknak az adataihoz." });
        }

        const query = `
            SELECT sp.activity_type, sp.lesson_slug, sp.quiz_slug, sp.score_percentage, sp.completed_at, sp.metadata,
                   c.title AS curriculum_title
            FROM student_progress sp
            LEFT JOIN curriculums c ON sp.quiz_slug = c.slug OR sp.lesson_slug = c.slug
            WHERE sp.user_id = $1
            ORDER BY sp.completed_at DESC, sp.started_at DESC;
        `;
        const { rows } = await pool.query(query, [studentId]);
        res.status(200).json({ success: true, progress: rows });
    } catch (error) {
        logger.error(`❌ Hiba a(z) ${studentId} diák haladásának lekérdezésekor:`, { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
    }
});

app.get('/api/admin/users', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.username, u.email, u.role, u.created_at, u.archived, t.is_approved
            FROM users u
            LEFT JOIN teachers t ON u.id = t.user_id
            ORDER BY u.created_at DESC;
        `;
        const { rows } = await pool.query(query);
        res.status(200).json({ success: true, users: rows });
    } catch (error) {
        logger.error("Hiba a felhasználók lekérdezésekor:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt a felhasználók lekérdezésekor.' });
    }
});

app.get('/api/admin/messages', authenticateToken, authorizeAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, email, subject, message, is_archived, created_at FROM contact_messages ORDER BY created_at DESC'
        );
        res.status(200).json({ success: true, messages: rows });
    } catch (error) {
        logger.error("Hiba a kapcsolatfelvételi üzenetek lekérdezésekor:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, message: 'Szerverhiba történt az üzenetek lekérdezésekor.'});
    }
});

app.delete('/api/admin/clear-users', authenticateToken, authorizeAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Minden felhasználói adat sikeresen törölve.' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error("Adatbázis törlési hiba:", { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Hiba történt a törlés során.' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/google/verify', async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name, sub: provider_id } = payload;

        if (!email) {
            return res.status(400).json({ success: false, message: 'A Google nem adta át az e-mail címedet.' });
        }

        const userExists = await pool.query("SELECT id FROM users WHERE ((provider = 'google' AND provider_id = $1) OR email = $2) AND archived = false", [provider_id, email]);
        if (userExists.rows.length > 0) {
            throw new Error('Ezzel a Google fiókkal vagy e-mail címmel már regisztráltak. Kérjük, jelentkezz be.');
        }

        res.status(200).json({ success: true, name, email, provider_id });

    } catch (err) {
        logger.error("Google token-ellenőrzési hiba:", { message: err.message, stack: err.stack });
        res.status(400).json({ success: false, message: err.message || 'Szerverhiba történt a Google azonosítás során.' });
    }
});

// 2. LÉPÉS: Regisztráció befejezése a Google adatokkal és a kiegészítő űrlap adatokkal
app.post('/api/register/google', async (req, res) => {
    const {
        email, name, provider_id, role,
        parental_email, classCode, vipCode, referralCode, specialCode
    } = req.body;

    if (!email || !name || !provider_id || !role) {
        return res.status(400).json({ success: false, message: 'Hiányzó alapvető regisztrációs adatok.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userExists = await client.query("SELECT id FROM users WHERE email = $1 AND archived = false", [email]);
        if (userExists.rows.length > 0) throw new Error('Ez az e-mail cím már regisztrálva van.');

        let classId = null;
        if (role === 'student' && classCode) {
            const classResult = await client.query('SELECT id, max_students FROM classes WHERE class_code = $1 AND is_active = true', [classCode]);
            if (classResult.rows.length === 0) throw new Error('Érvénytelen osztálykód.');
            classId = classResult.rows[0].id;
        }
        
        let isPermanentFree = false;
        if (specialCode && specialCode === process.env.SPECIAL_ACCESS_CODE) {
            isPermanentFree = true;
        }

        const password_hash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
        const referralCodeNew = `FKSZ-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

        const insertUserQuery = `
            INSERT INTO users (username, real_name, email, parental_email, password_hash, role, referral_code, provider, provider_id, email_verified, is_permanent_free)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'google', $8, true, $9)
            RETURNING *;
        `;
        const newUserResult = await client.query(insertUserQuery, [
            name, name, email, parental_email || null, password_hash, role, referralCodeNew, provider_id, isPermanentFree
        ]);
        const user = newUserResult.rows[0];

        if (role === 'teacher') {
            await client.query('INSERT INTO teachers (user_id, is_approved, vip_code) VALUES ($1, false, $2)', [user.id, vipCode || null]);
        }

        if (role === 'student' && classId) {
            await client.query('INSERT INTO classmemberships (user_id, class_id) VALUES ($1, $2)', [user.id, classId]);
        }
        
        let referrerId = null;
        if (referralCode) {
          const referrerResult = await client.query('SELECT id FROM users WHERE referral_code = $1 AND archived = false', [referralCode]);
          if (referrerResult.rows.length > 0) {
              referrerId = referrerResult.rows[0].id;
              await client.query('INSERT INTO referrals (referrer_user_id, referred_user_id) VALUES ($1, $2)', [referrerId, user.id]);
          }
        }
        
        if (role !== 'teacher' && !isPermanentFree) {
            await client.query(
                `INSERT INTO subscriptions (user_id, status, current_period_start, current_period_end, payment_provider)
                 VALUES ($1, 'trialing', NOW(), NOW() + INTERVAL '30 days', 'system') ON CONFLICT (user_id) DO NOTHING;`,
                [user.id]
            );
        }

        const newSessionId = crypto.randomBytes(32).toString('hex');
        await client.query(
            'UPDATE users SET active_session_id = $1 WHERE id = $2',
            [newSessionId, user.id]
        );

        const jwtToken = jwt.sign(
            { userId: user.id, role: user.role, sessionId: newSessionId },
            process.env.SECRET_KEY,
            { expiresIn: '1d' }
        );

        await client.query('COMMIT');
        
        const fullUserProfile = await getFullUserProfile(user.id);

        res.status(200).json({ success: true, token: jwtToken, user: fullUserProfile });

    } catch (err) {
        await client.query('ROLLBACK');
        logger.error("Google regisztráció befejezési hiba:", { message: err.message, stack: err.stack });
        res.status(400).json({ success: false, message: err.message || 'Szerverhiba történt.' });
    } finally {
        client.release();
    }
});

app.post('/api/contact', authLimiter, async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: 'Minden mező kitöltése kötelező.' });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ success: false, message: 'Érvénytelen e-mail cím formátum.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const adminRecipient = process.env.ADMIN_EMAIL || process.env.MAIL_DEFAULT_SENDER;
    if (!adminRecipient) {
        logger.error('❌ ADMIN_EMAIL is not set. Cannot send contact form email.');
        return res.status(500).json({ success: false, message: 'A szerver nincs megfelelően beállítva az üzenetek fogadására.' });
    }

    await client.query(
        `INSERT INTO contact_messages (name, email, subject, message) VALUES ($1, $2, $3, $4)`,
        [name, email, subject, message]
    );

    const adminMailOptions = {
      from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
      to: adminRecipient,
      subject: `Új kapcsolatfelvétel: ${subject}`,
      replyTo: email,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Új üzenet érkezett a Fókusz Mester weboldalról</h2>
          <p><strong>Feladó neve:</strong> ${validator.escape(name)}</p>
          <p><strong>Feladó e-mail címe:</strong> ${validator.escape(email)}</p>
          <p><strong>Tárgy:</strong> ${validator.escape(subject)}</p>
          <hr>
          <h3>Üzenet:</h3>
          <p style="white-space: pre-wrap; background-color: #f4f4f4; padding: 15px; border-radius: 5px;">${validator.escape(message)}</p>
        </div>
      `,
    };

    const userConfirmationOptions = {
      from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
      to: email,
      subject: 'Megkaptuk üzenetét! - Fókusz Mester',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Köszönjük, hogy felvette velünk a kapcsolatot!</h2>
          <p>Kedves ${validator.escape(name)}!</p>
          <p>Ez egy automatikus visszaigazolás arról, hogy az alábbi üzenetét sikeresen megkaptuk. Munkatársunk hamarosan válaszolni fog Önnek.</p>
          <hr>
          <h3>Az Ön által küldött üzenet:</h3>
          <p><strong>Tárgy:</strong> ${validator.escape(subject)}</p>
          <p style="white-space: pre-wrap; background-color: #f4f4f4; padding: 15px; border-radius: 5px;">${validator.escape(message)}</p>
          <hr>
          <p>Üdvözlettel,<br>A Fókusz Mester csapata</p>
        </div>
      `,
    };

    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userConfirmationOptions)
    ]);
    
    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Köszönjük üzenetét! A részletekről és a további teendőkről visszaigazoló e-mailt küldtünk.' });

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('❌ Hiba a kapcsolatfelvételi űrlap feldolgozása során:', { message: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Szerverhiba történt az üzenet küldése közben.' });
  } finally {
      client.release();
  }
});

cron.schedule('0 1 * * *', async () => { 
  logger.info('Running scheduled job: Checking for expiring trials...');
  
  const sendReminderEmail = async (user, daysLeft) => {
    const subject = daysLeft > 1
      ? `Emlékeztető: A Fókusz Mester próbaidőszakod ${daysLeft} nap múlva lejár!`
      : `Utolsó emlékeztető: A Fókusz Mester próbaidőszakod 24 órán belül lejár!`;

    const mailOptions = {
      from: `"${process.env.MAIL_SENDER_NAME}" <${process.env.MAIL_DEFAULT_SENDER}>`,
      to: user.email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Kedves ${user.username}!</h2>
          <p>Ez egy emlékeztető, hogy a 30 napos ingyenes prémium próbaidőszakod hamarosan lejár.</p>
          <p><strong>A próbaidőszakodból hátralévő idő: ${daysLeft} nap.</strong></p>
          <p>Ne veszítsd el a hozzáférésedet a prémium tananyagokhoz és eszközökhöz! Válassz előfizetési csomagot még ma, és folytasd a tanulást megszakítás nélkül.</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.FRONTEND_URL}/profil" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Előfizetek most</a>
          </div>
          <p>Ha már előfizettél, kérjük, hagyd figyelmen kívül ezt az üzenetet.</p>
          <p>Üdvözlettel,<br>A Fókusz Mester csapata</p>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info(`✅ Reminder email sent to ${user.email} (${daysLeft} days left).`);
    } catch (error) {
      logger.error(`❌ Failed to send reminder email to ${user.email}:`, { message: error.message, stack: error.stack });
    }
  };

  try {
    const sevenDaysQuery = `
      SELECT u.email, u.username FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'trialing' AND s.current_period_end::date = (NOW() + INTERVAL '7 days')::date;
    `;
    const sevenDaysResult = await pool.query(sevenDaysQuery);
    for (const user of sevenDaysResult.rows) {
      await sendReminderEmail(user, 7);
    }

    const oneDayQuery = `
      SELECT u.email, u.username FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'trialing' AND s.current_period_end::date = (NOW() + INTERVAL '1 day')::date;
    `;
    const oneDayResult = await pool.query(oneDayQuery);
    for (const user of oneDayResult.rows) {
      await sendReminderEmail(user, 1);
    }
  } catch (error) {
    logger.error('❌ Error during scheduled trial check:', { message: error.message, stack: error.stack });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`✅ A Fókusz Mester szerver elindult a ${PORT} porton.`);
});