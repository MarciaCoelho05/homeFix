const jwt = require('jsonwebtoken');

function getUserFromToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) throw new Error('Unauthorized');

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error('Forbidden');
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const user = getUserFromToken(req);
    res.status(200).json({ user });
  } catch (err) {
    res.status(err.message === 'Unauthorized' ? 401 : 403).json({ message: err.message });
  }
};