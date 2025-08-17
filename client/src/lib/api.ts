import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: "https://shopnish-lzrf.onrender.com", // ✅ Render वाली live URL डालो
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // ✅ backticks और template string
  }
  return config;
});

export default api;
