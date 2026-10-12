// Native credentials are supplied by the operator, never synthesized in source control.
module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), './plugins/with-revenuecat'],
  android: { ...config.android, ...(process.env.GEETA_GOOGLE_SERVICES_FILE ? { googleServicesFile: process.env.GEETA_GOOGLE_SERVICES_FILE } : {}) },
});
