module.exports = {
  name: 'PaySys',
  displayName: 'PaySys',
  slug: 'paysys',
  scheme: 'paysys',
  version: '0.0.0',
  orientation: 'portrait',
  platforms: ['ios', 'android'],
  extra: {
    API_BASE_URL: process.env.API_BASE_URL || '',
    APP_ENV: process.env.APP_ENV || 'development',
  },
};
