// client/src/lib/api.ts
import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: "https://shopnish-lzrf.onrender.com", // ✅ आपकी live backend URL
  withCredentials: true,
});

api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        // 🔄 हमेशा fresh token लो ताकि "अमान्य या पुराना टोकन" error न आए
        const token = await user.getIdToken(true);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.error("❌ Failed to get Firebase token:", err);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
