const expressSession = require('express-session');
const { RedisStore } = require('connect-redis');
const Redis = require('ioredis');
require('dotenv').config();

function setupSession(app) {
  const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  app.use(
    expressSession({
      store: new RedisStore({ client: redisClient }),
      secret: process.env.SESSION_SECRET || 'dev_secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
      },
    })
  );
}

function requireAuth(req, res, next) {
  if (req.session?.adminUser) return next();
  return res.redirect('/admin/login');
}

module.exports = { setupSession, requireAuth };
