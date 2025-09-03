const express = require('express');
const validator = require('validator');
const pool = require('../config/db');
const transporter = require('../config/mailer');
const { authLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/', authLimiter, async (req, res) => {
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
        console.error('❌ ADMIN_EMAIL is not set. Cannot send contact form email.');
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
    console.error('❌ Hiba a kapcsolatfelvételi űrlap feldolgozása során:', error);
    res.status(500).json({ success: false, message: 'Szerverhiba történt az üzenet küldése közben.' });
  } finally {
      client.release();
  }
});

module.exports = router;