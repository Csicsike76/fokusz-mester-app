const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');

const pool = require('../config/db');
const transporter = require('../config/mailer');
const { authLimiter } = require('../middleware/rateLimiters');
const { getFullUserProfile } = require('../utils/user');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const router = express.Router();

router.post('/register-teacher', async (req, res) => {
  const { email, username, password, referrerCode } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ success: false, message: 'Minden mező kitöltése kötelező.' });
  }

  try {
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
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

    const verifyLink = `${process.env.BACKEND_URL}/api/verify-teacher-email-link?token=${verify_token}`;

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
    console.log(`✅ Jóváhagyó e-mail elküldve: ${email}`);

    if (referrerCode) {
      const referrerResult = await pool.query('SELECT id FROM users WHERE referral_code = $1', [referrerCode]);
      if (referrerResult.rows.length > 0) {
        const referrerId = referrerResult.rows[0].id;
        await pool.query('INSERT INTO referrals (referrer_user_id, referred_user_id, created_at) VALUES ($1, $2, NOW())', [referrerId, newUser.rows[0].id]);
        console.log(`✅ Referral rögzítve: referrer ${referrerId}, referred ${newUser.rows[0].id}`);
      } else {
        console.warn(`❌ Érvénytelen referrerCode: ${referrerCode}`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Regisztráció kész, a tanári fiók jóváhagyására e-mailt küldtünk.',
    });
  } catch (error) {
    console.error('Tanári regisztráció hiba:', error);
    res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
  }
});

router.post('/verify-teacher', async (req, res) => {
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
    console.error('Tanári jóváhagyás hiba:', error);
    res.status(500).json({ success: false, message: 'Szerverhiba történt.' });
  }
});

router.post('/register', authLimiter, async (req, res) => {
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
      INSERT INTO users (username, real_name, email, parental_email, password_hash, role, referral_code, email_verification_token, email_verification_expires, is_permanent_free, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, created_at
    `;
    const newUserResult = await client.query(insertUserQuery, [
      username,
      username, // real_name is set to username
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
      const teacherIsApprovedResult = await client.query('SELECT is_approved from teachers where user_id=$1', [newUserId]);
      if(!teacherIsApprovedResult.rows[0].is_approved) {
        const backendUrl = process.env.BACKEND_URL;
        if (!backendUrl) {
            console.error('FATAL: BACKEND_URL environment variable is not set. Cannot generate teacher approval link.');
            throw new Error('Server configuration error: The approval link cannot be generated.');
        }
        const approvalUrl = `${backendUrl}/api/admin/approve-teacher-by-link/${newUserId}?secret=${process.env.ADMIN_SECRET}`;
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

router.get('/verify-email/:token', async (req, res) => {
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
    console.error("Email-ellenőrzési hiba:", error);
    res
      .status(500)
      .json({ success: false, message: 'Szerverhiba történt a megerősítés során.' });
  } finally {
    client.release();
  }
});

router.post('/login', authLimiter, async (req, res) => {
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

router.post('/forgot-password', authLimiter, async (req, res) => {
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

router.post('/reset-password/:token', async (req, res) => {
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

router.post('/google/verify', async (req, res) => {
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

        const userExists = await pool.query("SELECT id FROM users WHERE (provider = 'google' AND provider_id = $1) OR email = $2", [provider_id, email]);
        if (userExists.rows.length > 0) {
            throw new Error('Ezzel a Google fiókkal vagy e-mail címmel már regisztráltak. Kérjük, jelentkezz be.');
        }

        res.status(200).json({ success: true, name, email, provider_id });

    } catch (err) {
        console.error("Google token-ellenőrzési hiba:", err);
        res.status(400).json({ success: false, message: err.message || 'Szerverhiba történt a Google azonosítás során.' });
    }
});

router.post('/register/google', async (req, res) => {
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

        const userExists = await client.query("SELECT id FROM users WHERE email = $1", [email]);
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
          const referrerResult = await client.query('SELECT id FROM users WHERE referral_code = $1', [referralCode]);
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

        const jwtToken = jwt.sign({ userId: user.id, role: user.role }, process.env.SECRET_KEY, { expiresIn: '1d' });

        await client.query('COMMIT');
        
        const fullUserProfile = await getFullUserProfile(user.id);

        res.status(200).json({ success: true, token: jwtToken, user: fullUserProfile });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Google regisztráció befejezési hiba:", err);
        res.status(400).json({ success: false, message: err.message || 'Szerverhiba történt.' });
    } finally {
        client.release();
    }
});

module.exports = router;