import axios from 'axios'

export const createApiClient = (baseURL = '') => {
  const client = axios.create({ baseURL, timeout: 10000 })

  client.interceptors.request.use((config) => config)
  client.interceptors.response.use((res) => res, (err) => Promise.reject(err))

  return client
}

export default createApiClient
