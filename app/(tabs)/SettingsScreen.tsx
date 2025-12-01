import React, { useState, useEffect, useContext, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Text,
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { User, SettingItemProps, AppNavigationProp } from "../../types/types";
import { AuthContext } from "../../contexts/AuthContext";
import { ThemeContext } from "../../contexts/ThemeContext";
import { useRouter } from "expo-router";
import axios from "axios";
import { API_BASE_URL } from "@/config/apiConfig";
import { get } from "react-native/Libraries/TurboModule/TurboModuleRegistry";

// avatar ID -> image source mapping
const AVATAR_IMAGES: Record<string, any> = {
  avatar1: require("../../assets/images/avatar/avatar1.png"),
  avatar2: require("../../assets/images/avatar/avatar2.png"),
  avatar3: require("../../assets/images/avatar/avatar3.png"),
  avatar4: require("../../assets/images/avatar/avatar4.png"),
  avatar5: require("../../assets/images/avatar/avatar5.png"),
  avatar6: require("../../assets/images/avatar/avatar6.png"),
  avatar7: require("../../assets/images/avatar/avatar7.png"),
  avatar8: require("../../assets/images/avatar/avatar8.png"),
  defaultAvatar: require("../../assets/images/avatar/1.jpeg"),
};

export default function SettingsScreen() {
  const router = useRouter();
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);

  const [language, setLanguage] = useState("English");
  const [languageCode, setLanguageCode] = useState("en");
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Invitations states
  const [invitations, setInvitations] = useState<
    { id: number; [key: string]: any }[]
  >([]);
  const [showInvitationsModal, setShowInvitationsModal] = useState(false);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState(false);

  const { user: authUser, logout, deleteAccount } = useContext(AuthContext);
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);

  const navigation = useNavigation<AppNavigationProp>();

  const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "zh", name: "Chinese (Simplified)" },
    { code: "ja", name: "Japanese" },
    { code: "ar", name: "Arabic" },
    { code: "ru", name: "Russian" },
    { code: "pt", name: "Portuguese" },
    { code: "hi", name: "Hindi" },
  ];

  useFocusEffect(
    useCallback(() => {
      // Reset private profile toggle to off every time screen is focused
      setPrivateProfile(false);
      // fetchInvitations();
    }, [])
  );

  useEffect(() => {
    console.log("Current authUser:", authUser);
  }, [authUser]);

  const fetchInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const token =
        (await AsyncStorage.getItem("accessToken")) ||
        (await AsyncStorage.getItem("authToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token) {
        console.error("No authentication token found");
        Alert.alert(
          "Error",
          "You are not logged in. Please log in and try again."
        );
        return;
      }

      console.log("Fetching invitations with auth token");

      const invitationsResponse = await axios.get(
        `${API_BASE_URL}/api/Invitation/byUserId`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (invitationsResponse.status === 200) {
        console.log("Fetched raw invitations:", invitationsResponse.data);

        const enhancedInvitations = await Promise.all(
          invitationsResponse.data.map(async (invitation: any) => {
            const enhancedInvitation = { ...invitation };

            try {
              // Fetch chatroom details
              const chatroomResponse = await axios.get(
                `${API_BASE_URL}/api/chatroom/${invitation.chatRoomId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (chatroomResponse.status === 200) {
                enhancedInvitation.chatRoomName =
                  chatroomResponse.data.name || "Chat Group";
              }

              // Fetch sender details
              const senderResponse = await axios.get(
                `${API_BASE_URL}/api/users/${invitation.senderId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (senderResponse.status === 200) {
                enhancedInvitation.senderName =
                  senderResponse.data.username || "Unknown";
              }

              return enhancedInvitation;
            } catch (error) {
              console.log("Error enhancing invitation data:", error);
              return enhancedInvitation;
            }
          })
        );

        console.log("Enhanced invitations with names:", enhancedInvitations);
        setInvitations(enhancedInvitations);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          // Handle 404 error gracefully
          console.log("No invitations found.");
          setInvitations([]); // Set invitations to an empty array
        } else if (error.response?.status === 401) {
          Alert.alert("Error", "Unauthorized. Please log in again.");
        } else {
          console.error("Error fetching invitations:", error);
          Alert.alert(
            "Error",
            "Failed to load invitations. Please try again later."
          );
        }
      } else {
        console.error("Unexpected error fetching invitations:", error);
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoadingInvitations(false);
    }
  };

  const acceptInvitation = async (invitationId: number) => {
    setProcessingInvitation(true);
    try {
      const token =
        (await AsyncStorage.getItem("accessToken")) ||
        (await AsyncStorage.getItem("authToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token) {
        console.error("No authentication token found");
        return;
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/Invitation/accept/${invitationId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 || response.status === 204) {
        Alert.alert("Success", "Invitation accepted successfully!");
        setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      Alert.alert("Error", "Failed to accept invitation. Please try again.");
    } finally {
      setProcessingInvitation(false);
    }
  };

  const declineInvitation = async (invitationId: number) => {
    setProcessingInvitation(true);
    try {
      const token =
        (await AsyncStorage.getItem("accessToken")) ||
        (await AsyncStorage.getItem("authToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token) {
        console.error("No authentication token found");
        return;
      }

      const response = await axios.delete(
        `${API_BASE_URL}/api/Invitation/decline/${invitationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200 || response.status === 204) {
        Alert.alert("Success", "Invitation declined successfully.");
        setInvitations(invitations.filter((inv) => inv.id !== invitationId));
      }
    } catch (error) {
      console.error("Error declining invitation:", error);
      Alert.alert("Error", "Failed to decline invitation. Please try again.");
    } finally {
      setProcessingInvitation(false);
    }
  };

  const handleLogOut = async () => {
    try {
      logout();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Load saved language preference
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const savedLanguageCode = await AsyncStorage.getItem(
          "preferredLanguage"
        );
        if (savedLanguageCode) {
          setLanguageCode(savedLanguageCode);
          // Find the language name for the saved code
          const languageItem = LANGUAGES.find(
            (lang) => lang.code === savedLanguageCode
          );
          if (languageItem) {
            setLanguage(languageItem.name);
          }
        }
      } catch (error) {
        console.error("Error loading language preference:", error);
      }
    };

    loadLanguagePreference();
  }, []);

  // Handle language selection
  const selectLanguage = async (code: string, name: string) => {
    try {
      await AsyncStorage.setItem("preferredLanguage", code);
      setLanguageCode(code);
      setLanguage(name);
      setShowLanguageModal(false);
    } catch (error) {
      console.error("Error saving language preference:", error);
      Alert.alert("Error", "Failed to save language preference.");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              Alert.alert("Success", "Your account has been deleted.");
            } catch (error) {
              if (error instanceof Error) {
                Alert.alert(
                  "Error",
                  error.message || "Failed to delete account."
                );
              } else {
                Alert.alert("Error", "Failed to delete account.");
              }
            }
          },
        },
      ]
    );
  };

  const openInvitationsModal = () => {
    fetchInvitations();
    setShowInvitationsModal(true);
  };

  const getAvatarSource = () => {
    const key = authUser?.profilePicture;

    if (key && AVATAR_IMAGES[key]) {
      return AVATAR_IMAGES[key];
    }

    // Default avatar
    return AVATAR_IMAGES["defaultAvatar"];
  };

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.darkContainer]}>
      <Text style={[styles.header, darkMode && styles.darkText]}>Settings</Text>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={() => router.push("/AvatarScreen")}>
            <Image
              source={getAvatarSource()}
              // source={{ uri: "https://picsum.photos/200" }}
              style={styles.profileImage}
            />
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={18} color="white" />
            </View>
          </TouchableOpacity>

          <Text style={[styles.username, darkMode && styles.darkText]}>
            {authUser?.username || "Guest"}
          </Text>
          <TouchableOpacity
            style={styles.editNameButton}
            onPress={() => {
              router.push("/ProfileScreen");
            }}
          >
            <Text style={styles.editNameText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
            Account
          </Text>
          {/* <SettingItem
            title="Online Status"
            isToggle={true}
            isOn={onlineStatus}
            onPress={() => setOnlineStatus(!onlineStatus)}
            icon="radio-button-on"
            darkMode={darkMode}
          /> */}
          <SettingItem
            title="Private Profile"
            isToggle={true}
            isOn={privateProfile}
            onPress={() => {
              const newValue = !privateProfile;

              setPrivateProfile(newValue);
              if (newValue) {
                router.push("/PrivateProfile");
              }
            }}
            icon="lock-closed"
            darkMode={darkMode}
          />
          <SettingItem
            title="Check Invitations"
            onPress={openInvitationsModal}
            icon="mail"
            darkMode={darkMode}
          />
          <SettingItem
            title="Delete Account"
            onPress={handleDeleteAccount}
            icon="trash"
            darkMode={darkMode}
          />
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>
            Appearance
          </Text>
          <SettingItem
            title="Language"
            value={language}
            onPress={() => setShowLanguageModal(true)}
            icon="globe"
            darkMode={darkMode}
          />
          <SettingItem
            title="Dark Mode"
            isToggle={true}
            isOn={darkMode}
            onPress={toggleDarkMode}
            icon="contrast"
            darkMode={darkMode}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogOut}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[styles.modalContent, darkMode && styles.darkModalContent]}
          >
            <Text
              style={[styles.modalTitle, darkMode && styles.darkModalTitle]}
            >
              Select Language
            </Text>

            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    languageCode === item.code && styles.selectedLanguageItem,
                    darkMode && styles.darkLanguageItem,
                  ]}
                  onPress={() => selectLanguage(item.code, item.name)}
                >
                  <Text
                    style={[
                      styles.languageText,
                      languageCode === item.code && styles.selectedLanguageText,
                      darkMode && styles.darkText,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {languageCode === item.code && (
                    <Ionicons
                      name="checkmark"
                      size={22}
                      color={darkMode ? "#82B1FF" : "#4A90E2"}
                    />
                  )}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={[styles.closeButton, darkMode && styles.darkCloseButton]}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text
                style={[
                  styles.closeButtonText,
                  darkMode && styles.darkCloseButtonText,
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Invitations Modal */}
      <Modal
        visible={showInvitationsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInvitationsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[styles.modalContent, darkMode && styles.darkModalContent]}
          >
            <Text
              style={[styles.modalTitle, darkMode && styles.darkModalTitle]}
            >
              Invitations
            </Text>

            {loadingInvitations ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={[styles.loadingText, darkMode && styles.darkText]}>
                  Loading invitations...
                </Text>
              </View>
            ) : invitations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="mail-outline"
                  size={50}
                  color={darkMode ? "#666" : "#ccc"}
                />
                <Text style={[styles.emptyText, darkMode && styles.darkText]}>
                  No invitations found
                </Text>
              </View>
            ) : (
              <FlatList
                data={invitations}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.invitationItem,
                      darkMode && styles.darkInvitationItem,
                    ]}
                  >
                    <View style={styles.invitationInfo}>
                      <Text
                        style={[
                          styles.invitationTitle,
                          darkMode && styles.darkText,
                        ]}
                      >
                        {item.chatRoomName || "Chat Group"}
                      </Text>
                      <Text
                        style={[
                          styles.invitationSender,
                          darkMode && styles.darkTextSecondary,
                        ]}
                      >
                        From: {item.senderName || "Unknown"}
                      </Text>
                    </View>
                    <View style={styles.invitationActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={() => acceptInvitation(item.id)}
                        disabled={processingInvitation}
                      >
                        <Text style={styles.actionButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.declineButton]}
                        onPress={() => declineInvitation(item.id)}
                        disabled={processingInvitation}
                      >
                        <Text style={styles.actionButtonText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              style={[styles.closeButton, darkMode && styles.darkCloseButton]}
              onPress={() => setShowInvitationsModal(false)}
            >
              <Text
                style={[
                  styles.closeButtonText,
                  darkMode && styles.darkCloseButtonText,
                ]}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  value,
  onPress,
  isToggle,
  isOn,
  icon,
  darkMode,
}) => (
  <TouchableOpacity
    style={[styles.settingItem, darkMode && styles.darkSettingItem]}
    onPress={onPress}
    disabled={isToggle}
  >
    <View style={styles.settingLeft}>
      {icon && (
        <Ionicons
          name={icon}
          size={24}
          color={darkMode ? "#82B1FF" : "#4A90E2"}
          style={styles.settingIcon}
        />
      )}
      <Text style={[styles.settingTitle, darkMode && styles.darkText]}>
        {title}
      </Text>
    </View>
    <View style={styles.settingRight}>
      {isToggle ? (
        <Switch
          value={isOn}
          onValueChange={onPress}
          trackColor={{
            false: "#cccccc",
            true: darkMode ? "#82B1FF" : "#4A90E2",
          }}
        />
      ) : (
        <>
          {value && (
            <Text
              style={[
                styles.settingValue,
                darkMode && styles.darkTextSecondary,
              ]}
            >
              {value}
            </Text>
          )}
          <Ionicons
            name="chevron-forward"
            size={20}
            color={darkMode ? "#aaa" : "#666"}
          />
        </>
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  darkContainer: {
    backgroundColor: "#121212",
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 20,
    marginVertical: 15,
    color: "#000",
  },
  darkText: {
    color: "#fff",
  },
  darkTextSecondary: {
    color: "#aaa",
  },
  profileSection: {
    alignItems: "center",
    marginVertical: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e1e1e1",
  },
  cameraIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4A90E2",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  username: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },
  editNameButton: {
    marginTop: 5,
  },
  editNameText: {
    color: "#4A90E2",
    fontSize: 14,
  },
  sectionContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginHorizontal: 20,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  darkSettingItem: {
    borderBottomColor: "#333",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingIcon: {
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 16,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingValue: {
    color: "#666",
    marginRight: 5,
  },
  logoutButton: {
    marginHorizontal: 20,
    marginVertical: 30,
    paddingVertical: 15,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginVertical: 10,
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    margin: 8,
    borderWidth: 2,
    borderColor: "#ccc",
  },
  avatarSelected: {
    borderColor: "#4A90E2",
    borderWidth: 3,
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    maxHeight: "70%",
  },
  darkModalContent: {
    backgroundColor: "#333",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#000",
    textAlign: "center",
  },
  darkModalTitle: {
    color: "#fff",
  },
  languageItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  darkLanguageItem: {
    borderBottomColor: "#333",
  },
  selectedLanguageItem: {
    backgroundColor: "#f0f8ff",
  },
  languageText: {
    fontSize: 16,
    color: "#000",
  },
  selectedLanguageText: {
    fontWeight: "bold",
    color: "#4A90E2",
  },
  closeButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    alignItems: "center",
  },
  darkCloseButton: {
    backgroundColor: "#444",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  darkCloseButtonText: {
    color: "#fff",
  },

  // Invitation styles
  invitationItem: {
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#4A90E2",
  },
  darkInvitationItem: {
    backgroundColor: "#222",
    borderLeftColor: "#82B1FF",
  },
  invitationInfo: {
    marginBottom: 10,
  },
  invitationTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  invitationSender: {
    fontSize: 14,
    color: "#666",
  },
  invitationActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 10,
    minWidth: 80,
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#4CAF50",
  },
  declineButton: {
    backgroundColor: "#F44336",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "500",
  },
  loaderContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
