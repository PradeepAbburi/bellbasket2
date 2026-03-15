const Razorpay = require('razorpay');

module.exports = async function handler(req, res) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { planId, email, phone } = req.body;

    if (!planId) {
        return res.status(400).json({ error: 'Plan ID is required' });
    }

    // Define Razorpay Plan Mapping from your Razorpay Dashboard
    // You MUST go into your Razorpay Dashboard -> Subscriptions -> Plans and copy the Plan IDs here.
    const razorpayPlanIds = {
        'monthly': process.env.RAZORPAY_PLAN_MONTHLY || 'plan_SOdAW4dQUdoS3t', // Map to a Pro-level plan
        'half_yearly': process.env.RAZORPAY_PLAN_HALF_YEARLY || 'plan_SOdAW4dQUdoS3t', // Map to a Pro-level plan
        'yearly': process.env.RAZORPAY_PLAN_YEARLY || 'plan_SOdAW4dQUdoS3t', // Map to a Pro-level plan
        'basic': process.env.RAZORPAY_PLAN_BASIC || 'plan_SOd9m3EBfxmyzz',
        'growth': process.env.RAZORPAY_PLAN_GROWTH || 'plan_SOdA97Znz2aH4X',
        'pro': process.env.RAZORPAY_PLAN_PRO || 'plan_SOdAW4dQUdoS3t'
    };

    const razorpayPlanId = razorpayPlanIds[planId];

    const RZP_KEY = process.env.RAZORPAY_KEY_ID || 'rzp_live_SOdEdShZkzzIyY';
    const RZP_SECRET = process.env.RAZORPAY_KEY_SECRET || 'wGUoK0z7HXTohHYsYcjMCcnB';

    try {
        const razorpay = new Razorpay({
            key_id: RZP_KEY,
            key_secret: RZP_SECRET,
        });

        const isMonthly = planId === 'monthly';

        const subscription = await razorpay.subscriptions.create({
            plan_id: razorpayPlanId,
            customer_notify: 1,
            total_count: isMonthly ? 60 : 1, // Only monthly plan auto-renews (total 5 years). Others stop after 1 cycle.
            expire_by: Math.floor(new Date().setFullYear(new Date().getFullYear() + 5) / 1000),
            notes: {
                vendor_email: email,
                vendor_phone: phone,
            }
        });

        return res.status(200).json({
            subscription_id: subscription.id,
            entity: subscription
        });

    } catch (error) {
        console.error('Razorpay Subscription Error:', error);
        return res.status(500).json({
            error: 'SUBSCRIPTION_CREATION_FAILED',
            details: error.message || error.description || error
        });
    }
}
