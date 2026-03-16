res.json({
 ip: req.headers['x-forwarded-for'],
 region: process.env.VERCEL_REGION
})
