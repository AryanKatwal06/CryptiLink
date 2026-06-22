import axios from 'axios';
import { ENV } from '../src/config/env';

export const createApiClient = (baseURL = '') => {
  const resolvedBaseURL = baseURL || ENV.API_BASE_URL;
  const client = axios.create({ baseURL: resolvedBaseURL, timeout: 10000 });

  client.interceptors.request.use((config) => config);
  client.interceptors.response.use(
    (res) => res,
    (err) => Promise.reject(err),
  );

  return client;
};

export default createApiClient;
