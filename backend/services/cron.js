const cron = require('node-cron');
const pool = require('../config/db');
const transporter = require('../config/mailer');

const startCronJobs = () => {
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
};

module.exports = { startCronJobs };