import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showToast } from "@/utils/showToast";
import { useRouter } from "expo-router";
import * as signalR from "@microsoft/signalr";

import {
  registerUser,
  loginUser,
  fetchUserProfile,
  updateUserProfile,
} from "@/services/authService";
import User from "../types/Users";
import { navigateToLogin } from "../services/navigationHelper";
import { API_BASE_URL } from "../config/apiConfig";

type AuthContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  login: (email: string, password: string) => Promise<void>;
  register: (newUser: {
    username: string;
    email: string;
    password: string;
  }) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  verificationEmail: string | null;
  setVerificationEmail: React.Dispatch<React.SetStateAction<string | null>>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: async () => {},
  deleteAccount: async () => false,
  verificationEmail: null,
  setVerificationEmail: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null
  );
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const accessToken = await AsyncStorage.getItem("accessToken");
        const refreshToken = await AsyncStorage.getItem("refreshToken");

        // 1) if no tokens, just return
        if (!accessToken && !refreshToken) {
          console.log("No tokens found, user not logged in.");
          return;
        }

        // 2) if accessToken exists, try to fetch user profile
        if (accessToken) {
          try {
            const profileRes = await fetchUserProfile(accessToken);
            setUser(profileRes.data);
            console.log("Loaded user with existing access token.");
            return;
          } catch (err) {
            console.warn(
              "Stored access token invalid, will try refresh with refreshToken..."
            );
          }
        }

        // 3) if accessToken is invalid, try to refresh with refreshToken
        if (refreshToken) {
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (response.ok) {
            const { accessToken: newAccessToken } = await response.json();
            await AsyncStorage.setItem("accessToken", newAccessToken);

            const profileRes = await fetchUserProfile(newAccessToken);
            setUser(profileRes.data);
            console.log("Loaded user after refreshing access token.");
          } else {
            // 4) if refresh also fails, clear storage and stay logged out
            console.warn("Refresh token invalid, clearing stored tokens.");
            await AsyncStorage.multiRemove([
              "accessToken",
              "refreshToken",
              "user",
              "userData",
            ]);
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Error loading user on app start:", error);
        // In case of any error, ensure user is logged out
      }
    };

    loadUser();
  }, []);

  const isValidEmail = (email: string) => {
    return (
      email.endsWith("@oamk.fi") ||
      email.endsWith("@students.oamk.fi") ||
      email.endsWith("@fontys.nl") ||
      email.endsWith("@student.fontys.nl")
    );
  };

  // Register a new user
  const register = async ({
    username,
    email,
    password,
  }: {
    username: string;
    email: string;
    password: string;
  }) => {
    if (!isValidEmail(email)) {
      showToast(
        "error",
        "Invalid Email",
        "Email must be an OAMK or Fontys email."
      );
      router.replace("/WelcomeScreen");
      return;
    }

    if (password.length < 8) {
      showToast(
        "error",
        "Weak Password",
        "Password must be at least 8 characters."
      );
      router.replace("/WelcomeScreen");
      return;
    }

    try {
      await registerUser(username, email, password);
      setVerificationEmail(email);
      showToast(
        "success",
        "Registration successful!",
        "Please verify your email."
      );
      router.replace("/auth/login");
    } catch (error: any) {
      showToast(
        "error",
        "Registration failed",
        error.response?.data.message || "Please try again."
      );
      router.replace("/WelcomeScreen");
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { refreshToken, accessToken } = await loginUser(email, password);

      await AsyncStorage.setItem("refreshToken", refreshToken);
      await AsyncStorage.setItem("accessToken", accessToken);

      const profileRes = await fetchUserProfile(accessToken);
      setUser(profileRes.data);

      showToast("success", "Login successful!", "Welcome back 👋");
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("Login failed:", error);
      showToast("error", "Login failed", "Incorrect email or password.");
      router.replace("/WelcomeScreen");
    }
  };

  // Update user profile
  // const updateUser = async (updatedUserData: Partial<User>) => {
  //   try {
  //     const accessToken = await AsyncStorage.getItem("accessToken");
  //     if (!accessToken || !user?.id) throw new Error("Missing auth info");

  //     const response = await updateUserProfile(
  //       user.id,
  //       updatedUserData,
  //       accessToken
  //     );

  //     console.log("Updated user from backend:", response.data);

  //     setUser(response.data);
  //     await AsyncStorage.setItem("user", JSON.stringify(response.data));
  //     await AsyncStorage.setItem("userData", JSON.stringify(response.data));
  //   } catch (error) {
  //     console.error("Update failed:", error);
  //   }
  // };
  const updateUser = async (updatedUserData: Partial<User>) => {
    try {
      const accessToken = await AsyncStorage.getItem("accessToken");
      if (!accessToken || !user?.id) throw new Error("Missing auth info");

      // Merge existing user data with updates
      const payload: Partial<User> = {
        ...user,
        ...updatedUserData,
      };

      const response = await updateUserProfile(user.id, payload, accessToken);

      console.log(
        "updateUserProfile success flag from backend:",
        response.data
      );

      // build new user object in frontend
      const updatedUser: User = {
        ...(user as User),
        ...updatedUserData,
      };
      console.log("Updated user (frontend merged object):", updatedUser);
      setUser(updatedUser);

      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
    } catch (error) {
      console.error("Update failed in AuthContext.updateUser:", error);
      // ❗ important: re-throw the error make sure AvatarScreen can catch it
      throw error;
    }
  };

  // Logout the user
  const logout = async () => {
    await AsyncStorage.removeItem("userData");
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("accessToken");
    await AsyncStorage.removeItem("refreshToken");
    setUser(null);
    navigateToLogin();
  };

  //delete account
  const deleteAccount = async () => {
    try {
      // 1. Get the access token and user ID
      const accessToken = await AsyncStorage.getItem("accessToken");

      if (!accessToken) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      // 2. Get the current user ID - you need this to delete the specific user
      let userId;

      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        const parsedData = JSON.parse(userData);
        userId = parsedData.id;
      }

      if (!userId) {
        // If user ID isn't in userData, try to get it from user state
        if (user && user.id) {
          userId = user.id;
        } else {
          // If still no ID, try to get it from profile API
          const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            userId = profileData.id;
          }
        }
      }

      if (!userId) {
        throw new Error("Could not determine user ID for deletion");
      }

      console.log("Sending delete account request for user ID:", userId);

      // 3. Send the DELETE request to the correct endpoint
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log("Delete account response status:", response.status);

      // 4. Handle the response
      if (response.status >= 200 && response.status < 300) {
        // Success - clear storage and update state
        await AsyncStorage.removeItem("userData");
        await AsyncStorage.removeItem("user");
        await AsyncStorage.removeItem("accessToken");
        await AsyncStorage.removeItem("refreshToken");

        setUser(null);

        // Navigate to login
        navigateToLogin();

        return true;
      } else {
        // Error handling
        let errorMessage = "Failed to delete account";

        switch (response.status) {
          case 401:
            errorMessage = "Unauthorized. Please log in again.";
            break;
          case 403:
            errorMessage = "You do not have permission to delete this account.";
            break;
          case 404:
            errorMessage = "User account not found.";
            break;
          case 500:
            errorMessage = "Server error. Please try again later.";
            break;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Delete account error:", error);
      throw error;
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    const token = await AsyncStorage.getItem("accessToken");
    if (!token) {
      console.error("Access token is missing");
    }
    return token;
  };

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(`${API_BASE_URL}/hub`, {
      accessTokenFactory: async () => {
        const token = await AsyncStorage.getItem("accessToken");
        return token || "";
      },
    })
    .withAutomaticReconnect()
    .build();

  connection.onclose(async (error) => {
    console.error("SignalR connection closed:", error);

    if (error?.message.includes("401")) {
      console.log("Access token expired. Attempting to refresh...");

      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (response.ok) {
            const { accessToken: newAccessToken } = await response.json();
            await AsyncStorage.setItem("accessToken", newAccessToken);

            // Restart the SignalR connection
            await connection.start();
            console.log("SignalR connection restarted successfully.");
          } else {
            console.error("Failed to refresh token. Logging out...");
            logout();
          }
        } catch (refreshError) {
          console.error("Error refreshing token:", refreshError);
          logout();
        }
      } else {
        console.error("No refresh token found. Logging out...");
        logout();
      }
    }
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        register,
        updateUser,
        logout,
        deleteAccount,
        verificationEmail,
        setVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
