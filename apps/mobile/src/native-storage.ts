import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import {
  restoreMobileOutbox,
  serializeMobileOutbox,
  type MobilePendingEvidenceUpload
} from "./field-workflows";
import type { AuthUserSummary } from "@basecamp/api";
import type { CommandOutbox } from "@basecamp/sync";

const authTokenKey = "basecamp.mobile.auth.token";
const authSessionKey = "basecamp.mobile.auth.session";
const localJourneyKey = "basecamp.mobile.localJourney";
const outboxKey = "basecamp.mobile.outbox";
const pendingEvidenceKey = "basecamp.mobile.pendingEvidence";

export interface StoredMobileSession {
  serverUrl: string;
  expiresAt: string;
  user: AuthUserSummary;
}

export interface RestoredMobileSession extends StoredMobileSession {
  token: string;
}

export interface StoredMobileJourney {
  categoryId: string;
  questId: string;
  startedAt: string;
  mode: "local" | "synced";
}

export async function saveMobileSession(input: RestoredMobileSession): Promise<void> {
  await SecureStore.setItemAsync(authTokenKey, input.token);
  await AsyncStorage.setItem(authSessionKey, JSON.stringify({
    serverUrl: input.serverUrl,
    expiresAt: input.expiresAt,
    user: input.user
  } satisfies StoredMobileSession));
}

export async function loadMobileSession(): Promise<RestoredMobileSession | undefined> {
  const [token, serializedSession] = await Promise.all([
    SecureStore.getItemAsync(authTokenKey),
    AsyncStorage.getItem(authSessionKey)
  ]);

  if (token === null || serializedSession === null) {
    return undefined;
  }

  try {
    const session = JSON.parse(serializedSession) as StoredMobileSession;

    return {
      ...session,
      token
    };
  } catch {
    await clearMobileSession();
    return undefined;
  }
}

export async function clearMobileSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(authTokenKey),
    AsyncStorage.removeItem(authSessionKey)
  ]);
}

export async function saveMobileJourney(input: StoredMobileJourney): Promise<void> {
  await AsyncStorage.setItem(localJourneyKey, JSON.stringify(input));
}

export async function loadMobileJourney(): Promise<StoredMobileJourney | undefined> {
  const serialized = await AsyncStorage.getItem(localJourneyKey);

  if (serialized === null) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(serialized) as StoredMobileJourney;

    if (
      typeof parsed.categoryId !== "string" ||
      typeof parsed.questId !== "string" ||
      typeof parsed.startedAt !== "string" ||
      (parsed.mode !== "local" && parsed.mode !== "synced")
    ) {
      await AsyncStorage.removeItem(localJourneyKey);
      return undefined;
    }

    return parsed;
  } catch {
    await AsyncStorage.removeItem(localJourneyKey);
    return undefined;
  }
}

export async function saveOutbox(outbox: CommandOutbox): Promise<void> {
  await AsyncStorage.setItem(outboxKey, serializeMobileOutbox(outbox));
}

export async function loadOutbox(clientId: string): Promise<CommandOutbox | undefined> {
  const serialized = await AsyncStorage.getItem(outboxKey);

  if (serialized === null) {
    return undefined;
  }

  return restoreMobileOutbox(serialized, clientId);
}

export async function savePendingEvidence(uploads: MobilePendingEvidenceUpload[]): Promise<void> {
  await AsyncStorage.setItem(pendingEvidenceKey, JSON.stringify(uploads));
}

export async function loadPendingEvidence(): Promise<MobilePendingEvidenceUpload[]> {
  const serialized = await AsyncStorage.getItem(pendingEvidenceKey);

  if (serialized === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(serialized) as MobilePendingEvidenceUpload[];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
