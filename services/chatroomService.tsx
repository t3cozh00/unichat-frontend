import axiosInstance from "@/utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config/apiConfig";
import GroupChat from "../types/GroupChat";

const API_URL_CHAT = "/api";

export const fetchChatRooms = async () => {
  try {
    const response = await axiosInstance.get(`${API_URL_CHAT}/chatroom`);
    return response.data;
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    throw error;
  }
};

export const fetchOwnChatRooms = async (): Promise<GroupChat[]> => {
  try {
    const token = await AsyncStorage.getItem("accessToken");
    if (!token) {
      throw new Error("No access token found. Please log in again.");
    }

    const response = await fetch(`${API_BASE_URL}/api/ChatRoom/byUserId`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      throw new Error("Unauthorized. Please log in again.");
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch own chat rooms: ${response.statusText}`);
    }

    const chatRooms = await response.json();
    return chatRooms.map((room: any) => ({
      id: room.id,
      name: room.name,
      description: room.description,
    }));
  } catch (error) {
    console.error("Error fetching own chat rooms:", error);
    throw error;
  }
};

export const createGroupChat = async (data: {
  name: string;
  description: string;
}) => {
  const response = await axiosInstance.post(`${API_URL_CHAT}/chatroom`, data);
  return response.data;
};
