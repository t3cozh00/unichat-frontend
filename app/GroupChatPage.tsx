import { ThemeContext } from "@/contexts/ThemeContext";
import { AuthContext } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Alert,
  ToastAndroid,
  Platform,
  ScrollView,
} from "react-native";
import { getSignalRConnection } from "../utils/SignalRConnection";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/config/apiConfig";

const AVATAR_IMAGES: Record<string, any> = {
  avatar1: require("../assets/images/avatar/avatar1.png"),
  avatar2: require("../assets/images/avatar/avatar2.png"),
  avatar3: require("../assets/images/avatar/avatar3.png"),
  avatar4: require("../assets/images/avatar/avatar4.png"),
  avatar5: require("../assets/images/avatar/avatar5.png"),
  avatar6: require("../assets/images/avatar/avatar6.png"),
  avatar7: require("../assets/images/avatar/avatar7.png"),
  avatar8: require("../assets/images/avatar/avatar8.png"),
  defaultAvatar: require("../assets/images/avatar/1.jpeg"),
};
const DEFAULT_AVATAR_SOURCE = AVATAR_IMAGES["defaultAvatar"];

// Helper function for cross-platform toast messages
const showToast = (message: string) => {
  if (Platform.OS === "web") {
    // For web, create a custom visual toast since native ones don't work
    const toastDiv = document.createElement("div");
    toastDiv.style.position = "fixed";
    toastDiv.style.bottom = "20px";
    toastDiv.style.left = "50%";
    toastDiv.style.transform = "translateX(-50%)";
    toastDiv.style.backgroundColor = "#333";
    toastDiv.style.color = "white";
    toastDiv.style.padding = "10px 20px";
    toastDiv.style.borderRadius = "5px";
    toastDiv.style.zIndex = "1000";
    toastDiv.textContent = message;

    document.body.appendChild(toastDiv);

    setTimeout(() => {
      document.body.removeChild(toastDiv);
    }, 3000);
  } else if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // For iOS or other platforms
    Alert.alert("", message);
  }

  // Also console log for debugging
  console.log("TOAST:", message);
};

export default function GroupChatPage() {
  const router = useRouter();
  const { user: authUser } = useContext(AuthContext);
  const {
    roomId,
    icon,
    title: initialTitle,
    description: initialDescription,
  }: any = useLocalSearchParams();
  const { darkMode } = useContext(ThemeContext);

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState(initialTitle || "");
  const [editDescription, setEditDescription] = useState(
    initialDescription || ""
  );
  const [title, setTitle] = useState(initialTitle || "");
  const [description, setDescription] = useState(initialDescription || "");

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    fetchMembers();
    fetchChatRoomInfo();
  }, [roomId]);

  const fetchChatRoomInfo = async () => {
    if (!roomId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/ChatRoom/${roomId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch chatroom: ${response.status}`);
      }
      const data = await response.json();

      if (data.name) {
        setTitle(data.name);
        setEditTitle(data.name);
      }
      if (data.description) {
        setDescription(data.description);
        setEditDescription(data.description);
      }
    } catch (error) {
      console.error("Error fetching chatroom info:", error);
    }
  };

  const fetchMembers = async () => {
    if (!roomId) {
      console.error("No room ID provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const token =
        (await AsyncStorage.getItem("accessToken")) ||
        (await AsyncStorage.getItem("authToken")) ||
        (await AsyncStorage.getItem("token"));

      const response = await axios.get(
        `${API_BASE_URL}/api/ChatRoom/${roomId}/members`,
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : undefined
      );

      console.log("GroupChatPage: members from API:", response.data);
      setMembers(response.data);
    } catch (error) {
      console.error("Error fetching chatroom members:", error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const HandleLeaveGroup = async () => {
    const connection = getSignalRConnection();
    if (!connection || !roomId) {
      console.error("No connection or room selected.");
      return;
    }

    try {
      const token =
        (await AsyncStorage.getItem("accessToken")) ||
        (await AsyncStorage.getItem("authToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token) {
        console.error("No auth token found");
        showToast("You need to be logged in");
        return;
      }

      if (!authUser || !authUser.id) {
        console.error("No user found in AuthContext");
        showToast("Authentication error. Please log in again.");
        return;
      }

      const userId = authUser.id;

      const response = await axios.delete(
        `${API_BASE_URL}/api/chatroom/${roomId}/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(`User removed from room in database: ${response.status}`);

      await connection.invoke("LeaveRoom", parseInt(roomId));
      console.log(`Left room ${roomId}`);

      showToast("Left the group successfully");

      // Navigate back to the chatrooms list
      router.push({
        pathname: "/",
      });
    } catch (err) {
      console.error("Error leaving room:", err);
      showToast("Failed to leave the group");
    }
  };

  const handleInvitePress = () => {
    setInviteModalVisible(true);
    setInviteInput("");
  };

  const handleSendInvite = async () => {
    console.log("Starting invitation process for input:", inviteInput);

    if (!inviteInput.trim()) {
      console.log("Empty input detected");
      showToast("Please enter a username");
      return;
    }

    setInviteLoading(true);
    try {
      console.log("Getting auth token...");
      const token =
        (await AsyncStorage.getItem("accessToken")) ||
        (await AsyncStorage.getItem("authToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token) {
        console.log("No auth token found");
        showToast("You need to be logged in");
        setInviteLoading(false);
        return;
      }
      console.log("Auth token retrieved successfully");

      // First find the user by exact username
      try {
        console.log(`Making API call to search for user: ${inviteInput}`);
        console.log(
          `Request URL: ${API_BASE_URL}/api/users?search=${encodeURIComponent(
            inviteInput
          )}`
        );

        const usersResponse = await axios.get(
          `${API_BASE_URL}/api/users?search=${encodeURIComponent(inviteInput)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        console.log("Users search API response status:", usersResponse.status);
        console.log("Users found:", usersResponse.data.length);

        // Find the exact username match
        const exactMatch = usersResponse.data.find(
          (user: any) =>
            user.username.toLowerCase() === inviteInput.toLowerCase()
        );

        if (!exactMatch) {
          console.log("No exact match found for username:", inviteInput);
          showToast("User not found");
          setInviteLoading(false);
          return;
        }

        // Check if user is already a member
        console.log("Checking if user is already a member...");

        const isMember = members.some((member) => member.id === exactMatch.id);
        if (isMember) {
          console.log("User is already a member of this group");
          showToast("User is already a member of this group");
          setInviteLoading(false);
          return;
        }

        // Send invitation using the found user ID
        try {
          console.log("Sending invitation with payload:", {
            ReceiverId: exactMatch.id,
            ChatRoomId: parseInt(roomId),
          });

          const response = await axios.post(
            `${API_BASE_URL}/api/Invitation`,
            {
              ReceiverId: exactMatch.id,
              ChatRoomId: parseInt(roomId),
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          console.log(
            "Invitation API response:",
            response.status,
            response.data
          );
          showToast("Invitation sent successfully");
          setInviteModalVisible(false);
          setInviteInput("");
        } catch (error: any) {
          console.error("Invitation error:", error);

          if (error.response) {
            if (error.response.status === 409) {
              console.log(
                "409 Conflict: Invitation already exists or user is already a member"
              );
              showToast(
                "Invitation already exists or user is already a member"
              );
            } else if (error.response.status === 400) {
              console.log("400 Bad Request:", error.response.data);
              showToast(
                typeof error.response.data === "string"
                  ? error.response.data
                  : "Invalid invitation request"
              );
            } else {
              console.log(`Error status ${error.response.status}`);
              showToast("Failed to send invitation");
            }
          } else {
            console.log("Network error or unhandled exception");
            showToast("Network error");
          }
        }
      } catch (searchError: any) {
        console.error("Error in user search:", searchError);
        showToast("Failed to find user");
      }
    } catch (error) {
      console.error("Top-level error in invitation process:", error);
      showToast("Failed to find user");
    } finally {
      console.log("Invitation process complete");
      setInviteLoading(false);
    }
  };

  const HandleEditPress = () => {
    setIsModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert("Error", "Group name cannot be empty");
      return;
    }

    try {
      const token =
        (await AsyncStorage.getItem("accessToken")) ||
        (await AsyncStorage.getItem("authToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token) {
        Alert.alert(
          "Authentication Error",
          "You need to be logged in to edit group details"
        );
        return;
      }

      const response = await axios.put(
        `${API_BASE_URL}/api/Chatroom/${roomId}`,
        {
          id: parseInt(roomId),
          name: editTitle,
          description: editDescription,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200 || response.status === 204) {
        // Update local state
        setTitle(editTitle);
        setDescription(editDescription);
        setIsModalVisible(false);

        // Update params to refresh when going back
        router.setParams({
          title: editTitle,
          description: editDescription,
        });

        Alert.alert("Success", "Group information updated successfully");
      } else {
        Alert.alert("Error", "Failed to update group information");
      }
    } catch (error) {
      console.error("Error updating group information:", error);
      Alert.alert("Error", "Failed to update group information");
    }
  };

  // Calculate how many members to show before adding "See All" button
  const visibleMembersCount = 8;
  const hasMoreMembers = members.length > visibleMembersCount;

  const getMemberAvatarSource = (member: any) => {
    const key = member?.profilePicture;

    // 1) if the profilePicture is a full URL, use it directly
    if (key && typeof key === "string" && key.startsWith("http")) {
      return { uri: key };
    }

    // 2) if it's a predefined avatar ID (avatar1 ~ avatar8)
    if (key && typeof key === "string" && AVATAR_IMAGES[key]) {
      return AVATAR_IMAGES[key];
    }

    // 3) if no avatar is set, use the default avatar
    return DEFAULT_AVATAR_SOURCE;
  };

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.header, darkMode && styles.darkHeader]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={darkMode ? "white" : "black"}
              />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, darkMode && styles.darkText]}>
              Group Info
            </Text>
            <TouchableOpacity
              onPress={HandleEditPress}
              style={styles.editButton}
            >
              <Text style={[styles.edit, darkMode && styles.darkEdit]}>
                Edit
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.infoHeader, darkMode && styles.darkInfoHeader]}>
            <Image source={{ uri: icon }} style={styles.groupIcon} />
            <Text style={[styles.title, darkMode && styles.darkTitle]}>
              {title}
            </Text>
            <Text
              style={[styles.description, darkMode && styles.darkDescription]}
            >
              {description}
            </Text>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={[styles.membersTitle, darkMode && styles.darkText]}>
              Members:
            </Text>
            <View
              style={[styles.membersGrid, darkMode && styles.darkMembersGrid]}
            >
              {members
                .slice(0, visibleMembersCount)
                .map((member: any, index: number) => (
                  <View key={index} style={styles.memberItem}>
                    <Image
                      source={getMemberAvatarSource(member)}
                      style={styles.memberAvatar}
                    />
                    <Text
                      style={[
                        styles.memberUsername,
                        darkMode && styles.darkText,
                      ]}
                      numberOfLines={1}
                    >
                      {member.username}
                    </Text>
                  </View>
                ))}
              {hasMoreMembers && (
                <TouchableOpacity
                  style={styles.seeMoreButton}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.moreAvatarPlaceholder,
                      darkMode && {
                        backgroundColor: "#444",
                        borderColor: "#555",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.moreAvatarText,
                        darkMode && { color: "#fff" },
                      ]}
                    >
                      +{members.length - visibleMembersCount}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.memberUsername,
                      darkMode && styles.darkText,
                      {
                        fontWeight: "600",
                        color: darkMode ? "#4da6ff" : "#007bff",
                      },
                    ]}
                  >
                    See More
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.inviteButton}
              onPress={handleInvitePress}
              activeOpacity={0.8}
            >
              <Text style={styles.inviteButtonText}>Invite People</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.leaveButton}
              onPress={HandleLeaveGroup}
              activeOpacity={0.8}
            >
              <Text style={styles.leaveButtonText}>Leave Group</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Edit Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, darkMode && styles.darkModalView]}>
            <Text style={[styles.modalTitle, darkMode && styles.darkText]}>
              Edit Group
            </Text>

            <Text style={[styles.modalLabel, darkMode && styles.darkText]}>
              Group Name
            </Text>
            <TextInput
              style={[styles.input, darkMode && styles.darkInput]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Enter group name"
              placeholderTextColor={darkMode ? "#aaa" : "#999"}
            />

            <Text style={[styles.modalLabel, darkMode && styles.darkText]}>
              Description
            </Text>
            <TextInput
              style={[styles.textArea, darkMode && styles.darkInput]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Enter description"
              placeholderTextColor={darkMode ? "#aaa" : "#999"}
              multiline={true}
              numberOfLines={3}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEdit}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Invite Modal */}
      <Modal
        visible={inviteModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setInviteModalVisible(false);
          setInviteInput("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, darkMode && styles.darkModalView]}>
            <Text style={[styles.modalTitle, darkMode && styles.darkText]}>
              Invite User
            </Text>

            <Text style={[styles.modalLabel, darkMode && styles.darkText]}>
              Enter username
            </Text>

            <TextInput
              style={[styles.input, darkMode && styles.darkInput]}
              value={inviteInput}
              onChangeText={setInviteInput}
              placeholder="Username"
              placeholderTextColor={darkMode ? "#aaa" : "#999"}
              autoCapitalize="none"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setInviteModalVisible(false);
                  setInviteInput("");
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  inviteLoading && styles.disabledButton,
                ]}
                onPress={handleSendInvite}
                disabled={inviteLoading}
              >
                <Text style={styles.buttonText}>
                  {inviteLoading ? "Sending..." : "Send Invite"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  darkContainer: {
    backgroundColor: "#121212",
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginTop: Platform.OS === "android" ? 35 : 0,
  },
  darkHeader: {
    backgroundColor: "#1e1e1e",
    borderBottomColor: "#333",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  darkText: {
    color: "#f0f0f0",
  },
  editButton: {
    padding: 8,
  },
  edit: {
    fontSize: 16,
    fontWeight: "500",
    color: "#007bff",
  },
  darkEdit: {
    color: "#4da6ff",
  },
  infoHeader: {
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  darkInfoHeader: {
    backgroundColor: "#2a2a2a",
    borderBottomColor: "#3d3d3d",
  },
  groupIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f58814",
    marginBottom: 6,
  },
  darkTitle: {
    color: "#ff9c44",
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  darkDescription: {
    color: "#aaa",
  },
  sectionContainer: {
    padding: 16,
  },
  membersTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    paddingLeft: 4,
  },
  membersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  darkMembersGrid: {
    backgroundColor: "#2a2a2a",
  },
  memberItem: {
    width: "25%",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  memberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#f0f0f0",
  },
  memberUsername: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    fontWeight: "500",
    width: "100%",
    marginTop: 4,
  },
  moreAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#ddd",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  moreAvatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#555",
  },
  seeMoreButton: {
    width: "25%",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 8,
    opacity: 1,
  },
  buttonContainer: {
    padding: 16,
    gap: 12,
  },
  inviteButton: {
    backgroundColor: "#2dffbf",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  leaveButton: {
    backgroundColor: "#ff3b30",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalView: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  darkModalView: {
    backgroundColor: "#2a2a2a",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
    color: "#444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    height: 100,
    textAlignVertical: "top",
    fontSize: 16,
    backgroundColor: "#fafafa",
  },
  darkInput: {
    borderColor: "#555",
    color: "white",
    backgroundColor: "#333",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelButton: {
    backgroundColor: "#ff3b30",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#34c759",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#999999",
    opacity: 0.7,
  },
});
