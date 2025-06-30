const bcrypt = require('bcryptjs');

const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    isVerified: true,
    isActive: true,
  };

  const userData = { ...defaultUser, ...overrides };
  
  // Hash password
  userData.passwordHash = await bcrypt.hash(userData.password, 4);
  delete userData.password;

  return userData;
};

const createAdminUser = async (overrides = {}) => {
  return createTestUser({
    email: 'admin@example.com',
    role: 'admin',
    ...overrides,
  });
};

const createPremiumUser = async (overrides = {}) => {
  return createTestUser({
    email: 'premium@example.com',
    role: 'premium',
    ...overrides,
  });
};

const testUsers = {
  validUser: {
    email: 'valid@example.com',
    password: 'ValidPassword123!',
    firstName: 'Valid',
    lastName: 'User',
  },
  invalidEmail: {
    email: 'invalid-email',
    password: 'ValidPassword123!',
    firstName: 'Invalid',
    lastName: 'User',
  },
  weakPassword: {
    email: 'weak@example.com',
    password: '123',
    firstName: 'Weak',
    lastName: 'Password',
  },
  existingUser: {
    email: 'existing@example.com',
    password: 'ExistingPassword123!',
    firstName: 'Existing',
    lastName: 'User',
  },
};

module.exports = {
  createTestUser,
  createAdminUser,
  createPremiumUser,
  testUsers,
};
