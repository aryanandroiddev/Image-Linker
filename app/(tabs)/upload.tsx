import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { File } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { getApiUrl, queryClient } from "@/lib/query-client";

export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [uploadedTitle, setUploadedTitle] = useState("");

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setShareLink(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  async function handleUpload() {
    if (!imageUri) {
      Alert.alert("Error", "Please select an image first");
      return;
    }

    const imageTitle = title.trim() || "Untitled";
    setUploading(true);

    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/images/upload", baseUrl);

      const formData = new FormData();
      formData.append("title", imageTitle);

      if (Platform.OS === "web") {
        const response = await window.fetch(imageUri);
        const blob = await response.blob();
        formData.append("image", blob, "image.jpg");

        const uploadRes = await window.fetch(url.toString(), {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(errText);
        }

        const data = await uploadRes.json();
        generateShareLink(data.shareToken, imageTitle);
      } else {
        const file = new File(imageUri);
        formData.append("image", file as any);

        const uploadRes = await expoFetch(url.toString(), {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(errText);
        }

        const data = await uploadRes.json();
        generateShareLink(data.shareToken, imageTitle);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error("Upload error:", e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Upload Failed", "Please try again");
    } finally {
      setUploading(false);
    }
  }

  function generateShareLink(token: string, imgTitle: string) {
    const domain = process.env.EXPO_PUBLIC_DOMAIN?.replace(":5000", "") || "";
    const link = `https://${domain}/api/share/${token}`;
    setShareLink(link);
    setUploadedTitle(imgTitle);
  }

  async function copyLink() {
    if (shareLink) {
      await Clipboard.setStringAsync(shareLink);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Copied!", "Share link copied to clipboard. Anyone with this link can view the image.");
    }
  }

  function resetForm() {
    setImageUri(null);
    setTitle("");
    setShareLink(null);
    setUploadedTitle("");
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 + 12 : insets.top + 12 },
        ]}
      >
        <Text style={styles.headerTitle}>Upload</Text>
        <Text style={styles.headerSubtitle}>Share images with a private link</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {shareLink ? (
          <View style={styles.successCard}>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.successTitle}>Image Uploaded!</Text>
              <Text style={styles.successSubtitle}>"{uploadedTitle}" is ready to share</Text>
            </View>

            <View style={styles.linkBox}>
              <Text style={styles.linkLabel}>Share Link</Text>
              <View style={styles.linkRow}>
                <Text style={styles.linkText} numberOfLines={2}>
                  {shareLink}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.copyButton, pressed && { opacity: 0.85 }]}
                onPress={copyLink}
              >
                <Ionicons name="copy-outline" size={18} color="#fff" />
                <Text style={styles.copyButtonText}>Copy Link</Text>
              </Pressable>
            </View>

            <Text style={styles.privacyNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#6B7280" />{" "}
              Only people with this link can view the image
            </Text>

            <Pressable
              style={({ pressed }) => [styles.uploadAnotherButton, pressed && { opacity: 0.85 }]}
              onPress={resetForm}
            >
              <Ionicons name="add" size={20} color="#0EA5E9" />
              <Text style={styles.uploadAnotherText}>Upload Another</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.uploadCard}>
            <Pressable
              style={({ pressed }) => [
                styles.imagePicker,
                imageUri && styles.imagePickerWithImage,
                pressed && { opacity: 0.9 },
              ]}
              onPress={pickImage}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.placeholderContent}>
                  <View style={styles.addIconCircle}>
                    <Ionicons name="image-outline" size={32} color="#0EA5E9" />
                  </View>
                  <Text style={styles.placeholderTitle}>Tap to select an image</Text>
                  <Text style={styles.placeholderText}>JPG, PNG, HEIC up to 10MB</Text>
                </View>
              )}
            </Pressable>

            {imageUri && (
              <Pressable style={styles.changeImageBtn} onPress={pickImage}>
                <Ionicons name="refresh-outline" size={16} color="#0EA5E9" />
                <Text style={styles.changeImageText}>Change Image</Text>
              </Pressable>
            )}

            <View style={styles.titleInputContainer}>
              <Ionicons name="text-outline" size={20} color="#6B7280" style={styles.titleIcon} />
              <TextInput
                style={styles.titleInput}
                placeholder="Give your image a title (optional)"
                placeholderTextColor="#9CA3AF"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.uploadButton,
                !imageUri && styles.uploadButtonDisabled,
                pressed && imageUri && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              ]}
              onPress={handleUpload}
              disabled={!imageUri || uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                  <Text style={styles.uploadButtonText}>Upload & Get Link</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#1A1D26",
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  uploadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  imagePicker: {
    height: 240,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePickerWithImage: {
    borderStyle: "solid",
    borderColor: "#0EA5E9",
    borderWidth: 2,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  placeholderContent: {
    alignItems: "center",
    gap: 8,
  },
  addIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(14,165,233,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  placeholderTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#374151",
  },
  placeholderText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#9CA3AF",
  },
  changeImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginTop: 8,
  },
  changeImageText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#0EA5E9",
  },
  titleInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    marginTop: 16,
  },
  titleIcon: { marginRight: 12 },
  titleInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#1A1D26",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#0EA5E9",
    marginTop: 20,
  },
  uploadButtonDisabled: { opacity: 0.4 },
  uploadButtonText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    alignItems: "center",
  },
  successHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#1A1D26",
    marginTop: 12,
  },
  successSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    marginTop: 4,
  },
  linkBox: {
    width: "100%",
    backgroundColor: "#F0F9FF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    marginBottom: 16,
  },
  linkLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#0284C7",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  linkRow: {
    marginBottom: 12,
  },
  linkText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#0369A1",
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0EA5E9",
    borderRadius: 10,
    paddingVertical: 12,
  },
  copyButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  privacyNote: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadAnotherButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#0EA5E9",
    width: "100%",
  },
  uploadAnotherText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#0EA5E9",
  },
});
