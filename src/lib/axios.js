import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL || "";
const BASE_URL = apiUrl ? apiUrl.replace(/\/+$/, "") + "/api" : "/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});