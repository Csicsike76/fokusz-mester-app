const pool = require('../config/db');

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
    const trialSub = subsResult.rows.find(s => s.status === 'trialing' && new Date(s.current_period_end) > new Date());
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
    
    userProfile.is_subscribed = userProfile.is_permanent_free || !!activeSub || !!futureSub || (!!trialSub && new Date(trialSub.current_period_end) > new Date());

    return userProfile;
};

module.exports = {
    getFullUserProfile
};