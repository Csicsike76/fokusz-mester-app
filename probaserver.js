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

const whitelist = ['http://localhost:3000', process.env.FRONTEND_URL];
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
  console.log(`[${new Date().toISOString()}] Bejövő kérés: ${req.method} ${req.originalUrl}`);
  next();
});

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

const getFullUserProfile = async (userId) => {
    const userQuery = `
        SELECT
            u.id, u.username, u.real_name, u.email, u.role, u.referral_code, u.created_at,
            u.profile_metadata, u.is_permanent_free
        FROM users u
        WHERE u.id = $1;
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
    const earnedRewards = Math.floor(successfulReferrals / 5);

    userProfile.successful_referrals = successfulReferrals;
    userProfile.earned_rewards = earnedRewards;
    
    userProfile.is_subscribed = userProfile.is_permanent_free || !!activeSub || !!futureSub;

    return userProfile;
};

const dependencies = {
    pool,
    transporter,
    stripe,
    googleClient,
    authLimiter,
    authenticateToken,
    authenticateTokenOptional,
    authorizeAdmin,
    authorizeTeacher,
    getFullUserProfile,
    bcrypt,
    jwt,
    crypto,
    path,
    fsSync,
    fsp,
    validator,
    axios,
    express
};

app.use(require('./routes/paymentRoutes')(dependencies));
app.use(express.json());
app.use(require('./routes/authRoutes')(dependencies));
app.use(require('./routes/userRoutes')(dependencies));
app.use(require('./routes/teacherRoutes')(dependencies));
app.use(require('./routes/adminRoutes')(dependencies));
app.use(require('./routes/contentRoutes')(dependencies));

cron.schedule('0 1 * * *', async () => { 
  console.log('Running scheduled job: Checking for expiring trials...');
  
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
      console.log(`✅ Reminder email sent to ${user.email} (${daysLeft} days left).`);
    } catch (error) {
      console.error(`❌ Failed to send reminder email to ${user.email}:`, error);
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
    console.error('❌ Error during scheduled trial check:', error);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ A Fókusz Mester szerver elindult a ${PORT} porton.`);
});