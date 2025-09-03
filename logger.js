// logger.js

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info', // A legalacsonyabb logolási szint, ami naplózásra kerül
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }), // Ha error objektumot kap, a stack trace-t is logolja
    winston.format.splat(),
    winston.format.json() // A logok JSON formátumúak lesznek
  ),
  defaultMeta: { service: 'fokusz-mester-backend' }, // Minden loghoz hozzáadja ezt a mezőt
  transports: [
    // Hibaüzenetek mentése az `error.log` fájlba
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // Minden log mentése a `combined.log` fájlba
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Fejlesztői környezetben a konzolra is írjon ki olvashatóbb formátumban
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
} else {
    // Éles környezetben a Render.com log streamje miatt a konzolra is JSON formátumban írunk
    logger.add(new winston.transports.Console());
}

module.exports = logger;