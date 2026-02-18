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
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth-context";

export default function ForgotPasswordScreen() {
  const { forgotPassword } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0F172A", "#1E293B", "#0F172A"]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Platform.OS === "web" ? 67 + 30 : insets.top + 30,
              paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#F1F5F9" />
          </Pressable>

          {sent ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Check Your Email</Text>
              <Text style={styles.successText}>
                If an account exists with that email, we've sent password reset instructions.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.backToLoginButton, pressed && { opacity: 0.85 }]}
                onPress={() => router.back()}
              >
                <Text style={styles.backToLoginText}>Back to Sign In</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <View style={styles.iconBox}>
                  <Ionicons name="key-outline" size={32} color="#0EA5E9" />
                </View>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Enter the email associated with your account and we'll send reset instructions.
                </Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#64748B"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed && styles.submitButtonPressed,
                    loading && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Send Reset Link</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  header: { marginBottom: 32 },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(14,165,233,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#F1F5F9",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    lineHeight: 22,
  },
  form: { gap: 16 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#F1F5F9",
  },
  submitButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#0EA5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  successIcon: { marginBottom: 24 },
  successTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#F1F5F9",
    marginBottom: 12,
    textAlign: "center",
  },
  successText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  backToLoginButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  backToLoginText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#0EA5E9",
  },
});
