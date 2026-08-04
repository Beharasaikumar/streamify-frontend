import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "";
const BASE_URL = apiUrl
  ? apiUrl.endsWith("/api")
    ? apiUrl
    : `${apiUrl}/api`
  : "/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});