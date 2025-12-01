import axiosInstance from "@/utils/axiosInstance";
import axios from "axios";

const API_URL_REG = "/api/users";
const API_URL_LOG = "/auth";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export const registerUser = async (
  username: string,
  email: string,
  passwordHash: string
): Promise<any> => {
  return axiosInstance.post(`${API_URL_REG}`, {
    username,
    email,
    passwordHash,
  });
};

export const loginUser = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const response = await axiosInstance.post(`${API_URL_LOG}/login`, {
    email,
    password,
  });

  const { accessToken, refreshToken } = response.data;
  return {
    refreshToken,
    accessToken,
  };
};

export const resetPassword = async (
  email: string,
  newPassword: string
): Promise<any> => {
  return axiosInstance.post(`${API_URL_LOG}/reset-password`, {
    email,
    password: newPassword,
  });
};

export const refreshToken = async (token: string): Promise<string> => {
  const response = await axiosInstance.post(`${API_URL_LOG}/refresh`, {
    refreshToken: token,
  });
  return response.data.refreshToken;
};

export const fetchUserProfile = async (accessToken: string): Promise<any> => {
  return axiosInstance.get(`${API_URL_LOG}/profile`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

// export const updateUserProfile = async (
//   userId: number,
//   updatedData: {
//     username?: string;
//     email?: string;
//     passwordHash?: string;
//     semester?: number;
//     study?: string;
//     profilePicture?: string;
//   },
//   accessToken: string
// ): Promise<any> => {
//   return axiosInstance.patch(`${API_URL_REG}/${userId}`, updatedData, {
//     headers: {
//       Authorization: `Bearer ${accessToken}`,
//     },
//   });
// };

export const updateUserProfile = async (
  userId: number,
  updatedData: {
    username?: string;
    email?: string;
    passwordHash?: string;
    semester?: number;
    study?: string;
    profilePicture?: string;
  },
  accessToken: string
): Promise<any> => {
  try {
    const res = await axiosInstance.put(
      `${API_URL_REG}/${userId}`,
      updatedData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    console.log("updateUserProfile success:", res.data);
    return res;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.log("updateUserProfile error status:", error.response?.status);
      console.log("updateUserProfile error data:", error.response?.data);
    } else {
      console.log("updateUserProfile unknown error:", error);
    }
    throw error;
  }
};

// Test connection function to debug connectivity issues
// export const testConnection = async (): Promise<boolean> => {
//   try {
//     const response = await axiosInstance.get(`${API_BASE_URL}/api/health`);
//     console.log("Connection successful!", response.data);
//     return true;
//   } catch (error: any) {
//     console.error("Connection test failed:", error.message);
//     return false;
//   }
// };

// Dynamic API configuration function - can be used to update API base URL at runtime
export const updateApiBaseUrl = async (
  newBaseUrl: string
): Promise<boolean> => {
  try {
    console.log(`Updating API base URL to: ${newBaseUrl}`);
    // Here you could also save this to AsyncStorage for persistence
    // await AsyncStorage.setItem("apiBaseUrl", newBaseUrl);
    return true;
  } catch (error: any) {
    console.error("Failed to update API base URL:", error.message);
    return false;
  }
};
