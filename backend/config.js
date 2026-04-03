require('dotenv').config();

module.exports = {
  MONGO_URI: process.env.MONGO_URI || 'mongodb+srv://hariramji3423n_db_user:1234567890@finance.gcfvmdn.mongodb.net/?appName=Finance',
  JWT_SECRET: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',
  PORT: process.env.PORT || 5000,
  EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
  EMAIL_USER: process.env.EMAIL_USER || 'test@example.com',
  EMAIL_PASS: process.env.EMAIL_PASS || 'password',
  NODE_ENV: process.env.NODE_ENV || 'development'
};
