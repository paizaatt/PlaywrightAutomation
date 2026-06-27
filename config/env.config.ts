import path from 'path';

export const authStoragePath = path.join(__dirname, '../.auth/user.json');
export const apiAuthStoragePath = path.join(__dirname, '../.auth/api-session.json');

export const env = {
  baseUrl: process.env.BASE_URL ?? 'http://localhost:8080',
  apiBaseUrl: process.env.API_BASE_URL ?? 'https://be-truytimkhobau-sc.attops.net',
  auth: {
    username: process.env.UI_AUTH_USERNAME ?? 'admin',
    password: process.env.UI_AUTH_PASSWORD ?? 'admin',
  },
  apiAuth: {
    username: process.env.API_AUTH_USERNAME ?? 'paizait',
    bank: process.env.API_AUTH_BANK ?? '4321',
    site: process.env.API_AUTH_SITE ?? 'SC88',
  },
  customAccount: {
    username: process.env.CUSTOM_USERNAME ?? 'test_paiza',
    bankNumber: process.env.CUSTOM_BANK ?? '4321',
    site: process.env.CUSTOM_SITE ?? 'SC88',
  },
};
