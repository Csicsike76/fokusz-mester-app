const express = require('express');
const crypto = require('crypto');
const pool = require('../config/db');
const stripe = require('../config/stripe');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// This route is special, it uses a raw body parser defined in server.js
// The actual route path is '/api/payment/stripe-webhook'
router.post('/stripe-webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`❌ Stripe webhook signature error: ${err.message}`);
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
          console.log(`✅ Tanári osztály sikeresen létrehozva (fizetés után): ${className}, Tanár ID: ${userId}`);
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
          console.log(`✅ Előfizetés sikeresen rögzítve (checkout.session.completed) a felhasználóhoz: ${userId}`);

          console.log(`Ajánlói rendszer ellenőrzése a felhasználóhoz: ${userId}`);
          const referralResult = await client.query('SELECT referrer_user_id FROM referrals WHERE referred_user_id = $1', [userId]);
          if (referralResult.rows.length > 0) {
            const referrerId = referralResult.rows[0].referrer_user_id;
            console.log(`Találat! Az új előfizetőt (${userId}) ez a felhasználó ajánlotta: ${referrerId}`);

            const successfulReferralsResult = await client.query(
              `SELECT COUNT(DISTINCT r.referred_user_id)
               FROM referrals r
               JOIN subscriptions s ON r.referred_user_id = s.user_id
               WHERE r.referrer_user_id = $1 AND s.status IN ('active', 'trialing') AND s.plan_id IS NOT NULL`,
              [referrerId]
            );
            const newTotalReferrals = parseInt(successfulReferralsResult.rows[0].count, 10);
            console.log(`Az ajánló (${referrerId}) új sikeres ajánlásainak száma: ${newTotalReferrals}`);

            if (newTotalReferrals > 0 && newTotalReferrals % 5 === 0) {
              console.log(`JUTALOM JÁR! Az ajánló (${referrerId}) elérte a(z) ${newTotalReferrals}. sikeres ajánlást.`);
              const referrerSubscription = await client.query(
                "SELECT id FROM subscriptions WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
                [referrerId]
              );
              if (referrerSubscription.rows.length > 0) {
                const sub = referrerSubscription.rows[0];
                await client.query("UPDATE subscriptions SET current_period_end = current_period_end + INTERVAL '1 month' WHERE id = $1", [sub.id]);
                console.log(`✅ A(z) ${referrerId} felhasználó előfizetése meghosszabbítva 1 hónappal.`);
                await client.query(
                  `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Jutalmat kaptál!', 'Egy általad ajánlott felhasználó előfizetett, így jutalmul 1 hónap prémium hozzáférést írtunk jóvá neked. Köszönjük!', 'reward')`,
                  [referrerId]
                );
                console.log(`✅ Értesítés elküldve a(z) ${referrerId} felhasználónak a jutalomról.`);
              } else {
                console.log(`Az ajánló (${referrerId}) nem rendelkezik aktív előfizetéssel, így nem kap jutalmat.`);
              }
            }
          }
        }
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscriptionUpdated = event.data.object;
        const customerIdUpdated = subscriptionUpdated.customer;
        const customerUpdated = await stripe.customers.retrieve(customerIdUpdated);
        const userIdUpdated = customerUpdated.metadata.userId;

        if (!userIdUpdated) throw new Error(`Hiányzó userId a Stripe Customer (${customerIdUpdated}) metaadataiból a subscription esemény során!`);

        await client.query(
          `UPDATE subscriptions 
           SET status = $1, current_period_end = to_timestamp($2), updated_at = NOW()
           WHERE user_id = $3`,
          [subscriptionUpdated.status, subscriptionUpdated.current_period_end, userIdUpdated]
        );
        console.log(`✅ Előfizetés státusza frissítve (${subscriptionUpdated.id}) esemény (${event.type}) alapján: ${subscriptionUpdated.status}`);
        break;
    }

    await client.query('COMMIT');
  } catch (dbError) {
    await client.query('ROLLBACK');
    console.error('❌ Hiba a Stripe webhook feldolgozása során:', dbError);
  } finally {
    client.release();
  }

  res.json({ received: true });
});

router.post('/create-checkout-session', authenticateToken, async (req, res) => {
    const { interval } = req.body;
    const userId = req.user.userId;

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
        console.error('❌ Hiba a Stripe Checkout session létrehozásakor:', error);
        res.status(500).json({ success: false, message: 'Szerverhiba történt a fizetési folyamat indításakor.' });
    }
});

router.post('/create-billing-portal-session', authenticateToken, async (req, res) => {
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

module.exports = router;