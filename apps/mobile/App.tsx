import type { AuthLoginResponse } from "@basecamp/api";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  createMobileLoginRequest,
  mobileBetaDistribution,
  normalizeBasecampServerUrl
} from "./src/connection";

interface SignedInSession {
  displayName: string;
  username: string;
  expiresAt: string;
}

export default function App() {
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Enter your Basecamp server URL and local account.");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [session, setSession] = useState<SignedInSession | undefined>();

  const normalizedServerUrl = useMemo(() => {
    try {
      return normalizeBasecampServerUrl(serverUrl);
    } catch {
      return undefined;
    }
  }, [serverUrl]);

  const canSignIn =
    !isSigningIn && serverUrl.trim().length > 0 && username.trim().length > 0 && password.length > 0;

  async function signIn() {
    setIsSigningIn(true);
    setStatus("Signing in with the local Basecamp account...");

    try {
      const loginRequest = createMobileLoginRequest({ serverUrl, username, password });
      const response = await fetch(loginRequest.endpoint, {
        method: loginRequest.method,
        headers: loginRequest.headers,
        body: JSON.stringify(loginRequest.body)
      });

      if (!response.ok) {
        throw new Error(`Sign-in failed with HTTP ${response.status}.`);
      }

      const login = (await response.json()) as AuthLoginResponse;

      setPassword("");
      setSession({
        displayName: login.user.displayName,
        username: login.user.username,
        expiresAt: login.expiresAt
      });
      setStatus(`Signed in to ${normalizeBasecampServerUrl(serverUrl)}.`);
    } catch (error) {
      setSession(undefined);
      setStatus(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.eyebrow}>TestFlight beta</Text>
            <Text style={styles.title}>Basecamp Mobile</Text>
            <Text style={styles.subtitle}>
              Connect an iPhone to a self-hosted Basecamp server with local username and password auth.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Server URL</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                inputMode="url"
                onChangeText={setServerUrl}
                placeholder="https://basecamp.example"
                returnKeyType="next"
                style={styles.input}
                textContentType="URL"
                value={serverUrl}
              />
              <Text style={styles.helpText}>
                {normalizedServerUrl ?? "Use an admin-controlled LAN, VPN, or TLS URL."}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setUsername}
                placeholder="admin-created username"
                returnKeyType="next"
                style={styles.input}
                textContentType="username"
                value={username}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setPassword}
                placeholder="password"
                returnKeyType="done"
                secureTextEntry
                style={styles.input}
                textContentType="password"
                value={password}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={!canSignIn}
              onPress={() => void signIn()}
              style={({ pressed }) => [
                styles.button,
                !canSignIn ? styles.buttonDisabled : undefined,
                pressed && canSignIn ? styles.buttonPressed : undefined
              ]}
            >
              {isSigningIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
            </Pressable>
          </View>

          <View style={styles.statusPanel}>
            <Text style={styles.statusLabel}>Connection</Text>
            <Text style={styles.statusText}>{status}</Text>
            {session === undefined ? null : (
              <Text style={styles.sessionText}>
                {session.displayName} ({session.username}), expires {new Date(session.expiresAt).toLocaleString()}
              </Text>
            )}
          </View>

          <View style={styles.metadataGrid}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>iOS</Text>
              <Text style={styles.metadataValue}>{mobileBetaDistribution.minimumIosVersion}+</Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Build</Text>
              <Text style={styles.metadataValue}>{mobileBetaDistribution.iosBuildNumber}</Text>
            </View>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Auth</Text>
              <Text style={styles.metadataValue}>Local</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f5ef"
  },
  keyboardAvoidingView: {
    flex: 1
  },
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 24
  },
  header: {
    gap: 8,
    paddingTop: 24
  },
  eyebrow: {
    color: "#596b42",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: "#20251f",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0
  },
  subtitle: {
    color: "#536052",
    fontSize: 17,
    lineHeight: 24
  },
  form: {
    gap: 16
  },
  field: {
    gap: 8
  },
  label: {
    color: "#2b332c",
    fontSize: 15,
    fontWeight: "700"
  },
  input: {
    minHeight: 52,
    borderColor: "#c8c2b4",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#fffdf8",
    color: "#20251f",
    fontSize: 16,
    paddingHorizontal: 14
  },
  helpText: {
    color: "#697468",
    fontSize: 13,
    lineHeight: 18
  },
  button: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#2f5f45",
    paddingHorizontal: 18
  },
  buttonPressed: {
    backgroundColor: "#244a36"
  },
  buttonDisabled: {
    backgroundColor: "#8f9b8e"
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800"
  },
  statusPanel: {
    gap: 8,
    borderColor: "#d9d1c2",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#fffdf8",
    padding: 16
  },
  statusLabel: {
    color: "#596b42",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  statusText: {
    color: "#20251f",
    fontSize: 16,
    lineHeight: 23
  },
  sessionText: {
    color: "#536052",
    fontSize: 14,
    lineHeight: 20
  },
  metadataGrid: {
    flexDirection: "row",
    gap: 10
  },
  metadataItem: {
    flex: 1,
    minHeight: 74,
    justifyContent: "center",
    borderColor: "#d9d1c2",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#ece7da",
    padding: 12
  },
  metadataLabel: {
    color: "#596b42",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  metadataValue: {
    color: "#20251f",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4
  }
});
