import { axiosInstance } from "./axios";

export const signup = async (signupData) => {
  const response = await axiosInstance.post("/auth/signup", signupData);
  return response.data;
};

export const login = async (loginData) => {
  const response = await axiosInstance.post("/auth/login", loginData);
  return response.data;
};
export const logout = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

export const getAuthUser = async () => {
  try {
    const res = await axiosInstance.get("/auth/me");
    return res.data;
  } catch (error) {
    console.log("Error in getAuthUser:", error);
    return null;
  }
};

export const completeOnboarding = async (userData) => {
  const response = await axiosInstance.post("/auth/onboarding", userData);
  return response.data;
};

export async function getUserFriends() {
  const response = await axiosInstance.get("/users/friends");
  return response.data;
}

export async function getRecommendedUsers() {
  const response = await axiosInstance.get("/users");
  return response.data;
}

export async function getOutgoingFriendReqs() {
  const response = await axiosInstance.get("/users/outgoing-friend-requests");
  return response.data;
}

export async function sendFriendRequest(userId) {
  const response = await axiosInstance.post(`/users/friend-request/${userId}`);
  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/users/friend-requests");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(`/users/friend-request/${requestId}/accept`);
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

export async function getRooms() {
  try {
    const res = await axiosInstance.get("/rooms");
    return res.data;
  } catch (error) {
    if (error.response?.status === 401) return [];
    throw error;
  }
}

export async function createRoom(roomData) {
  const res = await axiosInstance.post("/rooms", roomData);
  return res.data;
}

export async function joinRoom(roomId) {
  const res = await axiosInstance.post(`/rooms/${roomId}/join`);
  return res.data;
}

export async function updateRoom(roomId, roomData) {
  const res = await axiosInstance.patch(`/rooms/${roomId}`, roomData);
  return res.data;
}

export async function deleteRoom(roomId) {
  const res = await axiosInstance.delete(`/rooms/${roomId}`);
  return res.data;
}

export async function getUnreadCounts() {
  const res = await axiosInstance.get("/messages/unread/counts");
  return res.data;
}

export async function translateText(text, targetLanguage) {
  const res = await axiosInstance.post("/ai/translate", { text, targetLanguage });
  return res.data;
}

export async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  const res = await axiosInstance.post("/ai/transcribe", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function getTodaysChallenges() {
  const res = await axiosInstance.get("/challenges/today");
  return res.data;
}

export async function submitChallengeAnswer(challengeId, challengeIndex, userAnswer) {
  const res = await axiosInstance.post("/challenges/submit", {
    challengeId,
    challengeIndex,
    userAnswer,
  });
  return res.data;
}

export async function refreshChallenges() {
  const res = await axiosInstance.post("/challenges/refresh");
  return res.data;
}