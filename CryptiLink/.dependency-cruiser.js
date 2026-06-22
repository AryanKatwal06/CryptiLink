module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Prevent circular dependencies',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'components-no-api',
      comment: 'Components must not access backend modules or direct API adapters',
      severity: 'error',
      from: { path: '^mobile/components' },
      to: { path: '^backend' },
    },
    {
      name: 'offline-no-wallet-mutation',
      comment: 'offline helpers must not modify wallet domain directly',
      severity: 'warn',
      from: { path: '^mobile/offline' },
      to: { path: '^backend/wallet' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: '(^|/)node_modules/',
  },
};
