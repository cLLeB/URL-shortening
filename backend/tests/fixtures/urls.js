const createTestUrl = (overrides = {}) => {
  const defaultUrl = {
    originalUrl: 'https://example.com',
    title: 'Test URL',
    description: 'A test URL for testing purposes',
    isActive: true,
    isPublic: true,
    clickCount: 0,
  };

  return { ...defaultUrl, ...overrides };
};

const createCustomAliasUrl = (overrides = {}) => {
  return createTestUrl({
    originalUrl: 'https://custom.example.com',
    customAlias: 'custom-test',
    title: 'Custom Alias URL',
    ...overrides,
  });
};

const createExpiredUrl = (overrides = {}) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return createTestUrl({
    originalUrl: 'https://expired.example.com',
    title: 'Expired URL',
    expiresAt: yesterday.toISOString(),
    ...overrides,
  });
};

const createPrivateUrl = (overrides = {}) => {
  return createTestUrl({
    originalUrl: 'https://private.example.com',
    title: 'Private URL',
    isPublic: false,
    ...overrides,
  });
};

const testUrls = {
  validUrl: {
    originalUrl: 'https://valid.example.com',
    title: 'Valid URL',
    description: 'A valid URL for testing',
  },
  invalidUrl: {
    originalUrl: 'not-a-valid-url',
    title: 'Invalid URL',
  },
  longUrl: {
    originalUrl: 'https://example.com/very/long/path/that/goes/on/and/on/with/many/segments/and/parameters?param1=value1&param2=value2&param3=value3',
    title: 'Long URL',
  },
  customAliasUrl: {
    originalUrl: 'https://custom.example.com',
    customAlias: 'my-custom-link',
    title: 'Custom Alias URL',
  },
  invalidCustomAlias: {
    originalUrl: 'https://example.com',
    customAlias: 'ab', // Too short
    title: 'Invalid Custom Alias',
  },
  specialCharsAlias: {
    originalUrl: 'https://example.com',
    customAlias: 'special@chars!', // Invalid characters
    title: 'Special Characters Alias',
  },
};

const createClickData = (overrides = {}) => {
  const defaultClick = {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    referer: 'https://google.com',
    country: 'US',
    region: 'California',
    city: 'San Francisco',
    deviceType: 'desktop',
    browser: 'Chrome',
    os: 'Windows',
    isBot: false,
  };

  return { ...defaultClick, ...overrides };
};

const createBotClick = (overrides = {}) => {
  return createClickData({
    userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
    browser: 'Googlebot',
    isBot: true,
    ...overrides,
  });
};

const createMobileClick = (overrides = {}) => {
  return createClickData({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
    deviceType: 'mobile',
    browser: 'Safari',
    os: 'iOS',
    ...overrides,
  });
};

module.exports = {
  createTestUrl,
  createCustomAliasUrl,
  createExpiredUrl,
  createPrivateUrl,
  testUrls,
  createClickData,
  createBotClick,
  createMobileClick,
};
