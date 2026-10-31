import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1', withCredentials: true });
api.interceptors.response.use((response) => response.data, (error) => Promise.reject(new Error(error.response?.data?.message || 'The server could not complete that request.')));
export default api;
