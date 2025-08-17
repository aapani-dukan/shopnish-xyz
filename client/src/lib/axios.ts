import axios from "axios";
import { auth } from "./firebase"; // अगर तुम Firebase auth use कर रहे हो

const api = axios.create({
  baseURL: "http://localhost:5000", // अपने backend का URL डालो
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
