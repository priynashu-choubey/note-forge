import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'noteforge-access-secret-dev';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'noteforge-refresh-secret-dev';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS || '7');

export const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: `${REFRESH_EXPIRY_DAYS}d` }
  );
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};

export const getRefreshExpiryDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + REFRESH_EXPIRY_DAYS);
  return date;
};
