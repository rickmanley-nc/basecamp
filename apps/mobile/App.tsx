import {
  apiRoutes,
  createDashboardSummary,
  type AuthLoginResponse,
  type DashboardSummary,
  type EvidenceUploadResponse
} from "@basecamp/api";
import { basecampSeed } from "@basecamp/content";
import type { PreparednessCategory, QuestTemplate } from "@basecamp/domain";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
  applyMobileSyncResponse,
  createEvidenceUploadRequest,
  createMobileFieldValidationSnapshot,
  createMobileFieldScreens,
  createMobileFieldSession,
  createMobileLoginRequest,
  createPendingEvidenceUpload,
  createSyncBatchRequest,
  defaultEvidenceLink,
  markMobileSyncFailure,
  mobileDistribution,
  normalizeBasecampServerUrl,
  previewScanWorkflow,
  queueAssetActionCommand,
  queueQuickCaptureCommand,
  queueQuestStatusCommand,
  queueScanCommand,
  routeForScannedCode,
  type MobilePendingEvidenceUpload
} from "./src";
import {
  clearMobileSession,
  loadMobileJourney,
  loadMobileSession,
  loadOutbox,
  loadPendingEvidence,
  saveMobileJourney,
  saveMobileSession,
  saveOutbox,
  savePendingEvidence,
  type RestoredMobileSession,
  type StoredMobileJourney
} from "./src/native-storage";
import { createCommandOutbox, mobileRoutes, type CommandOutbox, type MobileRoute, type ScanWorkflow } from "@basecamp/sync";

const clientId = "mobile-field-client";
const generatedAt = "2026-08-21T00:00:00.000Z";

type AppMode = "onboarding" | "quest" | "console" | "sync";

interface StarterCategory {
  category: PreparednessCategory;
  quest: QuestTemplate;
  accent: string;
  icon: string;
  hook: string;
}

interface BootstrapPlan {
  title: string;
  description: string;
  rows: Array<{ label: string; value: string }>;
  warning?: string;
}

const starterCategoryIds = [
  "water",
  "medical",
  "power",
  "communications",
  "home-resilience",
  "evacuation",
  "food",
  "shelter"
] as const;

const categoryThemes: Record<string, { accent: string; icon: string; hook: string }> = {
  water: {
    accent: "#1f7a8c",
    icon: "H2O",
    hook: "Start with the resource you miss fastest."
  },
  medical: {
    accent: "#b94145",
    icon: "MED",
    hook: "Make supplies findable before stress does the searching."
  },
  power: {
    accent: "#b7791f",
    icon: "PWR",
    hook: "Turn outage plans into tested capability."
  },
  communications: {
    accent: "#4f46a5",
    icon: "COM",
    hook: "Build contact paths that still work under pressure."
  },
  "home-resilience": {
    accent: "#2f855a",
    icon: "HOME",
    hook: "Harden the place that carries most of the load."
  },
  evacuation: {
    accent: "#c05621",
    icon: "GO",
    hook: "Make leaving deliberate instead of improvised."
  },
  food: {
    accent: "#6b7f22",
    icon: "FOOD",
    hook: "Create simple depth in what you can eat and cook."
  },
  shelter: {
    accent: "#73523f",
    icon: "SHEL",
    hook: "Keep people warm, dry, and protected."
  }
};

export default function App() {
  const beaconPulse = useRef(new Animated.Value(0)).current;
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isBusy, setIsBusy] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("onboarding");
  const [journey, setJourney] = useState<StoredMobileJourney | undefined>();
  const [session, setSession] = useState<RestoredMobileSession | undefined>();
  const [summary, setSummary] = useState<DashboardSummary>(() => createDashboardSummary(basecampSeed));
  const [outbox, setOutbox] = useState<CommandOutbox>(() => createCommandOutbox(clientId));
  const [pendingEvidence, setPendingEvidence] = useState<MobilePendingEvidenceUpload[]>([]);
  const [activeRoute, setActiveRoute] = useState<MobileRoute>("home");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("water");
  const [selectedQuestId, setSelectedQuestId] = useState<string | undefined>();
  const [quickText, setQuickText] = useState("Bought four gallons of water");
  const [manualScan, setManualScan] = useState("basecamp://assets/asset-backup-generator");
  const [lastScan, setLastScan] = useState<ScanWorkflow | undefined>();
  const [scannerPaused, setScannerPaused] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const normalizedServerUrl = useMemo(() => {
    try {
      return normalizeBasecampServerUrl(serverUrl);
    } catch {
      return undefined;
    }
  }, [serverUrl]);
  const fieldScreens = useMemo(() => createMobileFieldScreens(), []);
  const starterCategories = useMemo(() => createStarterCategories(), []);
  const selectedStarter = useMemo(
    () => findStarterCategory(starterCategories, selectedCategoryId, selectedQuestId),
    [selectedCategoryId, selectedQuestId, starterCategories]
  );
  const fieldSession = useMemo(
    () =>
      createMobileFieldSession({
        summary,
        clientId,
        serverUrl: session?.serverUrl ?? normalizedServerUrl ?? "http://basecamp.local:4317",
        token: session?.token ?? "",
        generatedAt,
        restoredOutbox: outbox
      }),
    [normalizedServerUrl, outbox, session, summary]
  );
  const fieldValidationSnapshot = useMemo(
    () =>
      createMobileFieldValidationSnapshot({
        readModel: fieldSession.readModel,
        outbox,
        pendingEvidence
      }),
    [fieldSession.readModel, outbox, pendingEvidence]
  );
  const pendingCommandCount = outbox.queued.filter(
    (queued) => queued.status === "pending" || queued.status === "failed"
  ).length;
  const blockedEvidenceCount = pendingEvidence.filter((upload) => upload.uploadStatus !== "uploaded").length;
  const canSignIn =
    !isBusy && serverUrl.trim().length > 0 && username.trim().length > 0 && password.length > 0;
  const bootstrapPlan = useMemo(
    () =>
      createBootstrapPlan({
        journey,
        outbox,
        pendingEvidence,
        selectedStarter,
        session,
        summary
      }),
    [journey, outbox, pendingEvidence, selectedStarter, session, summary]
  );
  const beaconScale = beaconPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35]
  });
  const beaconOpacity = beaconPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.38, 0]
  });

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(beaconPulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }),
        Animated.timing(beaconPulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true
        })
      ])
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [beaconPulse]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const [restoredSession, restoredOutbox, restoredEvidence, restoredJourney] = await Promise.all([
        loadMobileSession(),
        loadOutbox(clientId),
        loadPendingEvidence(),
        loadMobileJourney()
      ]);

      if (!mounted) {
        return;
      }

      if (restoredSession !== undefined) {
        setSession(restoredSession);
        setServerUrl(restoredSession.serverUrl);
        setUsername(restoredSession.user.username);
      }

      if (restoredJourney !== undefined) {
        setJourney(restoredJourney);
        setSelectedCategoryId(restoredJourney.categoryId);
        setSelectedQuestId(restoredJourney.questId);
        setAppMode(restoredSession === undefined ? "quest" : "console");
      } else if (restoredSession !== undefined) {
        setAppMode("console");
      }

      if (restoredOutbox !== undefined) {
        setOutbox(restoredOutbox);
      }

      setPendingEvidence(restoredEvidence);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function signIn() {
    setIsBusy(true);
    setStatus("Signing in...");

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
      const restoredSession: RestoredMobileSession = {
        serverUrl: normalizeBasecampServerUrl(serverUrl),
        token: login.token,
        expiresAt: login.expiresAt,
        user: login.user
      };

      await saveMobileSession(restoredSession);
      setPassword("");
      setSession(restoredSession);
      setAppMode(journey === undefined && pendingCommandCount === 0 && blockedEvidenceCount === 0 ? "console" : "sync");
      setStatus(`Connected as ${login.user.username}. Review the sync plan before uploading local work.`);
      await refreshDashboard(restoredSession).catch((error: unknown) => {
        setStatus(error instanceof Error ? `Connected. ${error.message}` : "Connected. Dashboard refresh failed.");
      });
    } catch (error) {
      setSession(undefined);
      setStatus(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function signOut() {
    await clearMobileSession();
    setSession(undefined);
    setAppMode(journey === undefined ? "onboarding" : "console");
    setStatus("Sync disconnected. Local field work stays on this iPhone.");
  }

  async function refreshDashboard(activeSession = session) {
    if (activeSession === undefined) {
      setStatus("Connect a Basecamp server first.");
      return;
    }

    const response = await fetch(serverApiUrl(activeSession.serverUrl, apiRoutes.dashboard), {
      headers: authorizationHeaders(activeSession)
    });

    if (!response.ok) {
      throw new Error(`Dashboard refresh failed with HTTP ${response.status}.`);
    }

    setSummary((await response.json()) as DashboardSummary);
  }

  async function refreshDashboardSafely(activeSession = session) {
    try {
      await refreshDashboard(activeSession);
      setStatus("Dashboard refreshed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Dashboard refresh failed.");
    }
  }

  function commitOutbox(nextOutbox: CommandOutbox, message: string) {
    setOutbox(nextOutbox);
    void saveOutbox(nextOutbox).catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "Outbox save failed.");
    });
    setStatus(message);
  }

  function commitPendingEvidence(nextUploads: MobilePendingEvidenceUpload[]) {
    setPendingEvidence(nextUploads);
    void savePendingEvidence(nextUploads).catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "Evidence queue save failed.");
    });
  }

  async function markJourneySynced() {
    if (journey === undefined || journey.mode === "synced") {
      return;
    }

    const syncedJourney: StoredMobileJourney = {
      ...journey,
      mode: "synced"
    };

    await saveMobileJourney(syncedJourney);
    setJourney(syncedJourney);
  }

  function queueQuickCapture() {
    if (quickText.trim().length === 0) {
      setStatus("Quick Capture is empty.");
      return;
    }

    const queued = queueQuickCaptureCommand(outbox, quickText);
    setQuickText("");
    commitOutbox(queued.outbox, `${queued.title} queued.`);
  }

  async function chooseStarterCategory(categoryId: string) {
    const starter = findStarterCategory(starterCategories, categoryId);

    if (starter === undefined) {
      setStatus("That category is not ready for mobile start yet.");
      return;
    }

    const nextJourney: StoredMobileJourney = {
      categoryId: starter.category.id,
      questId: starter.quest.id,
      startedAt: new Date().toISOString(),
      mode: session === undefined ? "local" : "synced"
    };

    setSelectedCategoryId(starter.category.id);
    setSelectedQuestId(starter.quest.id);
    setJourney(nextJourney);
    setAppMode("quest");
    await saveMobileJourney(nextJourney);
    setStatus(`${starter.category.name} starter quest is ready.`);
  }

  function startSelectedQuest() {
    if (selectedStarter === undefined) {
      setStatus("Choose a category first.");
      setAppMode("onboarding");
      return;
    }

    const queued = queueQuestStatusCommand({
      outbox,
      questId: selectedStarter.quest.id,
      questTitle: selectedStarter.quest.title,
      action: "start",
      notes: `Started locally from ${selectedStarter.category.name} onboarding.`
    });
    setActiveRoute("capture");
    setQuickText(`Completed first step for ${selectedStarter.quest.title}`);
    commitOutbox(queued.outbox, `${selectedStarter.quest.title} started locally.`);
    setAppMode("console");
  }

  function processScanValue(value: string) {
    if (value.trim().length === 0) {
      setStatus("Scan value is empty.");
      return;
    }

    const scanInput = routeForScannedCode(value.trim());
    const workflow = previewScanWorkflow(outbox, scanInput);
    setLastScan(workflow);

    const queued = queueScanCommand(outbox, scanInput);

    if (queued !== undefined) {
      commitOutbox(queued.outbox, `${queued.title} queued.`);
      return;
    }

    if (workflow.assetId !== undefined) {
      setStatus(`Asset ${workflow.assetId} opened from cache.`);
      return;
    }

    setStatus("Scan needs manual review.");
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scannerPaused) {
      return;
    }

    setScannerPaused(true);
    processScanValue(result.data);
  }

  function queueAssetAction(action: Parameters<typeof queueAssetActionCommand>[0]["action"]) {
    if (lastScan?.assetId === undefined) {
      setStatus("Scan an asset first.");
      return;
    }

    const queued = queueAssetActionCommand({
      outbox,
      assetId: lastScan.assetId,
      action,
      locationName: "Field",
      quantityDelta: 1,
      ...(action === "report_issue" ? { notes: "Reported from mobile scan." } : {})
    });

    commitOutbox(queued.outbox, queued.summary);
  }

  async function capturePhotoEvidence() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setStatus("Camera permission denied.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      mediaTypes: ["images"],
      quality: 0.7
    });

    if (result.canceled || result.assets[0] === undefined) {
      setStatus("Photo capture canceled.");
      return;
    }

    const asset = result.assets[0];
    const base64 = asset.base64;

    if (base64 === undefined || base64 === null) {
      setStatus("Photo bytes were not available.");
      return;
    }

    await addPendingEvidence({
      kind: "photo",
      title: "Field photo evidence",
      fileName: asset.fileName ?? `field-photo-${Date.now()}.jpg`,
      contentType: asset.mimeType ?? "image/jpeg",
      localUri: asset.uri,
      base64
    });
  }

  async function pickDocumentEvidence() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ["application/pdf", "image/*", "text/plain"]
    });

    if (result.canceled || result.assets[0] === undefined) {
      setStatus("Document pick canceled.");
      return;
    }

    const asset = result.assets[0];
    const base64 =
      asset.base64 ??
      (await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64
      }));

    await addPendingEvidence({
      kind: asset.mimeType?.startsWith("image/") ? "photo" : "document",
      title: asset.name,
      fileName: asset.name,
      contentType: asset.mimeType ?? "application/octet-stream",
      localUri: asset.uri,
      base64
    });
  }

  async function addPendingEvidence(input: {
    kind: MobilePendingEvidenceUpload["kind"];
    title: string;
    fileName: string;
    contentType: string;
    localUri: string;
    base64: string;
  }) {
    const link = summary.activeQuests[0] === undefined
      ? defaultEvidenceLink()
      : { entityType: "quest" as const, entityId: summary.activeQuests[0].id };
    const pending = createPendingEvidenceUpload({
      kind: input.kind,
      entityType: link.entityType,
      entityId: link.entityId,
      title: input.title,
      fileName: input.fileName,
      contentType: input.contentType,
      localUri: input.localUri,
      capturedAt: new Date().toISOString()
    });
    const nextUploads = [pending, ...pendingEvidence];

    commitPendingEvidence(nextUploads);

    if (session === undefined) {
      setStatus("Evidence saved offline.");
      return;
    }

    await uploadPendingEvidenceItem(pending, input.base64, nextUploads);
  }

  async function uploadPendingEvidenceItem(
    pending: MobilePendingEvidenceUpload,
    base64?: string,
    sourceUploads = pendingEvidence
  ): Promise<MobilePendingEvidenceUpload[]> {
    if (session === undefined) {
      throw new Error("Connect a Basecamp server before uploading evidence.");
    }

    const payload =
      base64 ??
      (await FileSystem.readAsStringAsync(pending.localUri, {
        encoding: FileSystem.EncodingType.Base64
      }));
    const response = await fetch(serverApiUrl(session.serverUrl, apiRoutes.evidenceUpload), {
      method: "POST",
      headers: {
        ...authorizationHeaders(session),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(createEvidenceUploadRequest(pending, payload))
    });

    if (!response.ok) {
      throw new Error(`Evidence upload failed with HTTP ${response.status}.`);
    }

    const uploaded = (await response.json()) as EvidenceUploadResponse;
    const nextUploads = sourceUploads.map((upload) =>
      upload.localId === pending.localId ? uploadedEvidenceUpload(upload, uploaded.storageKey) : upload
    );

    commitPendingEvidence(nextUploads);
    setStatus(`Evidence uploaded: ${uploaded.storageKey}.`);

    return nextUploads;
  }

  async function retryEvidenceUpload(pending: MobilePendingEvidenceUpload) {
    if (session === undefined) {
      setAppMode("sync");
      setStatus("Connect a Basecamp server before uploading evidence.");
      return;
    }

    setIsBusy(true);
    setStatus(`Uploading evidence: ${pending.fileName}`);

    try {
      await uploadPendingEvidenceItem(pending);
    } catch (error) {
      const nextUploads = pendingEvidence.map((upload) =>
        upload.localId === pending.localId
          ? {
              ...upload,
              uploadStatus: "failed" as const,
              lastError: error instanceof Error ? error.message : "Evidence upload failed."
            }
          : upload
      );

      commitPendingEvidence(nextUploads);
      setStatus(error instanceof Error ? error.message : "Evidence upload failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function syncNow() {
    if (session === undefined) {
      setAppMode("sync");
      setStatus("Connect a Basecamp server before syncing.");
      return;
    }

    setIsBusy(true);
    setStatus("Syncing...");

    try {
      let uploads = pendingEvidence;

      for (const pending of pendingEvidence.filter((upload) => upload.uploadStatus !== "uploaded")) {
        try {
          uploads = await uploadPendingEvidenceItem(pending, undefined, uploads);
        } catch (error) {
          uploads = uploads.map((upload) =>
            upload.localId === pending.localId
              ? {
                  ...upload,
                  uploadStatus: "failed" as const,
                  lastError: error instanceof Error ? error.message : "Evidence upload failed."
                }
              : upload
          );
          commitPendingEvidence(uploads);
        }
      }

      const request = createSyncBatchRequest(outbox, fieldSession.readModel.cursor);
      const failedEvidenceCount = uploads.filter((upload) => upload.uploadStatus === "failed").length;

      if (request.commands.length === 0) {
        await refreshDashboard(session);
        setStatus(
          failedEvidenceCount === 0
            ? "No commands to sync."
            : `No commands to sync. ${failedEvidenceCount} evidence upload(s) need retry.`
        );
        return;
      }

      const response = await fetch(serverApiUrl(session.serverUrl, apiRoutes.sync), {
        method: "POST",
        headers: {
          ...authorizationHeaders(session),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Sync failed with HTTP ${response.status}.`);
      }

      const syncResponse = (await response.json()) as Parameters<typeof applyMobileSyncResponse>[1];
      const nextOutbox = applyMobileSyncResponse(outbox, syncResponse);
      if (syncResponse.conflicts.length === 0) {
        await markJourneySynced();
      }
      commitOutbox(
        nextOutbox,
        syncResponse.conflicts.length === 0
          ? failedEvidenceCount === 0
            ? `Synced ${request.commands.length} command(s).`
            : `Synced ${request.commands.length} command(s). ${failedEvidenceCount} evidence upload(s) need retry.`
          : `${syncResponse.conflicts.length} sync conflict(s) need review.`
      );
      await refreshDashboard(session);
    } catch (error) {
      const nextOutbox = markMobileSyncFailure(outbox, error instanceof Error ? error.message : "Sync failed.");
      commitOutbox(nextOutbox, error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={appMode === "onboarding" ? "light-content" : "dark-content"} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={[styles.container, appMode === "onboarding" ? styles.onboardingContainer : undefined]}
          keyboardShouldPersistTaps="handled"
        >
          {appMode === "onboarding" ? (
            renderOnboarding()
          ) : (
            <>
              <View style={styles.header}>
                <View>
                  <Text style={styles.eyebrow}>{mobileDistribution.buildPath}</Text>
                  <Text style={styles.title}>Basecamp Mobile</Text>
                </View>
                <Text style={styles.statusText}>{status}</Text>
              </View>

              {appMode === "sync" ? renderSyncSetup() : appMode === "quest" ? renderQuestFlow() : renderFieldConsole()}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  function renderOnboarding() {
    return (
      <View style={styles.onboarding}>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroKicker}>Basecamp Mobile</Text>
            <Text style={styles.heroTitle}>Begin where you are.</Text>
            <Text style={styles.heroText}>
              Pick a first preparedness quest, capture progress in the field, and sync with a server when you decide.
            </Text>
          </View>
          <View style={styles.heroMap} accessibilityLabel="Basecamp route beacon">
            <View style={styles.ridgeLarge} />
            <View style={styles.ridgeSmall} />
            <View style={styles.routeSegmentPrimary} />
            <View style={styles.routeSegmentSecondary} />
            <Animated.View
              style={[
                styles.beaconPulse,
                {
                  opacity: beaconOpacity,
                  transform: [{ scale: beaconScale }]
                }
              ]}
            />
            <View style={styles.beaconDot} />
            <View style={[styles.waypoint, styles.waypointOne]} />
            <View style={[styles.waypoint, styles.waypointTwo]} />
          </View>
        </View>

        <View style={styles.onboardingSection}>
          <Text style={styles.sectionTitle}>Choose a first quest</Text>
          <View style={styles.categoryGrid}>
            {starterCategories.map((starter) => (
              <Pressable
                accessibilityRole="button"
                key={starter.category.id}
                onPress={() => {
                  void chooseStarterCategory(starter.category.id);
                }}
                style={({ pressed }) => [
                  styles.categoryCard,
                  { borderColor: starter.accent },
                  pressed ? styles.categoryCardPressed : undefined
                ]}
              >
                <View style={[styles.categoryIcon, { backgroundColor: starter.accent }]}>
                  <Text style={styles.categoryIconText}>{starter.icon}</Text>
                </View>
                <View style={styles.categoryText}>
                  <Text style={styles.categoryName}>{starter.category.name}</Text>
                  <Text style={styles.categoryHook}>{starter.hook}</Text>
                  <Text style={styles.questMeta}>
                    {starter.quest.estimatedMinutes} min, {starter.quest.xp} XP
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.onboardingActions}>
          <SecondaryButton label="Connect Server" onPress={() => setAppMode("sync")} />
          <SecondaryButton label="Open Field Kit" onPress={() => setAppMode("console")} />
        </View>
      </View>
    );
  }

  function renderQuestFlow() {
    if (selectedStarter === undefined) {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Choose a category</Text>
          <Text style={styles.bodyText}>Select a preparedness category to start locally.</Text>
          <PrimaryButton label="Choose Category" onPress={() => setAppMode("onboarding")} />
        </View>
      );
    }

    return (
      <View style={styles.console}>
        <View style={[styles.questHero, { borderColor: selectedStarter.accent }]}>
          <View style={styles.questHeader}>
            <View style={[styles.categoryIcon, { backgroundColor: selectedStarter.accent }]}>
              <Text style={styles.categoryIconText}>{selectedStarter.icon}</Text>
            </View>
            <View style={styles.listText}>
              <Text style={styles.eyebrow}>{selectedStarter.category.name}</Text>
              <Text style={styles.questTitle}>{selectedStarter.quest.title}</Text>
            </View>
          </View>
          <Text style={styles.bodyText}>{selectedStarter.quest.whyItMatters}</Text>
          <View style={styles.questStats}>
            <Metric label="Minutes" value={String(selectedStarter.quest.estimatedMinutes)} />
            <Metric label="XP" value={String(selectedStarter.quest.xp)} />
            <Metric label="Level" value={String(selectedStarter.quest.targetLevel)} />
          </View>
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Validation</Text>
            <Text style={styles.metaText}>{selectedStarter.quest.validation}</Text>
          </View>
          {selectedStarter.quest.accomplishments === undefined ? null : (
            <View style={styles.chipRow}>
              {selectedStarter.quest.accomplishments.slice(0, 3).map((accomplishment) => (
                <View key={accomplishment} style={styles.infoChip}>
                  <Text style={styles.infoChipText}>{accomplishment}</Text>
                </View>
              ))}
            </View>
          )}
          <ActionRow>
            <PrimaryButton label="Start Quest" onPress={startSelectedQuest} />
            <SecondaryButton label="Capture Evidence" onPress={() => {
              setActiveRoute("capture");
              setAppMode("console");
              void capturePhotoEvidence();
            }} />
            <SecondaryButton label="Field Kit" onPress={() => setAppMode("console")} />
            <SecondaryButton label="Sync" onPress={() => setAppMode("sync")} />
          </ActionRow>
        </View>

        <SecondaryButton label="Change Category" onPress={() => setAppMode("onboarding")} />
      </View>
    );
  }

  function renderSyncSetup() {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Sync With Your Server</Text>
        <Text style={styles.bodyText}>
          Local quests and evidence stay on this iPhone until you connect a self-hosted Basecamp server.
        </Text>
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>{bootstrapPlan.title}</Text>
          <Text style={styles.metaText}>{bootstrapPlan.description}</Text>
          <View style={styles.planRows}>
            {bootstrapPlan.rows.map((row) => (
              <View key={row.label} style={styles.planRow}>
                <Text style={styles.planLabel}>{row.label}</Text>
                <Text style={styles.planValue}>{row.value}</Text>
              </View>
            ))}
          </View>
          {bootstrapPlan.warning === undefined ? null : (
            <Text style={styles.warningText}>{bootstrapPlan.warning}</Text>
          )}
        </View>
        {session === undefined ? null : (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Connected</Text>
            <Text style={styles.metaText}>
              {session.user.displayName} at {session.serverUrl}
            </Text>
          </View>
        )}
        {session === undefined ? (
          <>
            <Field label="Server URL">
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
              <Text style={styles.metaText}>{normalizedServerUrl ?? "Waiting for server URL"}</Text>
            </Field>
            <Field label="Username">
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
            </Field>
            <Field label="Password">
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
            </Field>
          </>
        ) : null}
        <ActionRow>
          {session === undefined ? (
            <PrimaryButton disabled={!canSignIn} label="Connect" loading={isBusy} onPress={() => void signIn()} />
          ) : (
            <PrimaryButton disabled={isBusy} label="Sync Now" loading={isBusy} onPress={() => void syncNow()} />
          )}
          <SecondaryButton label="Back" onPress={() => setAppMode(journey === undefined ? "onboarding" : "console")} />
          {session === undefined ? null : <SecondaryButton label="Disconnect" onPress={() => void signOut()} />}
        </ActionRow>
      </View>
    );
  }

  function renderFieldConsole() {
    const localStatus =
      selectedStarter === undefined
        ? "Saved on this iPhone until you connect a Basecamp server."
        : `${selectedStarter.category.name}: ${selectedStarter.quest.title}`;

    return (
      <View style={styles.console}>
        <View style={styles.sessionBar}>
          <View>
            <Text style={styles.sessionName}>{session?.user.displayName ?? "Local Field Kit"}</Text>
            <Text style={styles.metaText}>{session?.serverUrl ?? localStatus}</Text>
          </View>
          {session === undefined ? (
            <Pressable accessibilityRole="button" onPress={() => setAppMode("sync")} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Sync</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.smallButton}>
              <Text style={styles.smallButtonText}>Sign Out</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.metrics}>
          <Metric label="Score" value={String(summary.readinessScore)} />
          <Metric label="Queued" value={String(pendingCommandCount)} />
          <Metric label="Evidence" value={String(blockedEvidenceCount)} />
        </View>

        <View style={styles.tabs}>
          {mobileRoutes.map((route) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeRoute === route }}
              key={route}
              onPress={() => setActiveRoute(route)}
              style={[styles.tab, activeRoute === route ? styles.tabActive : undefined]}
            >
              <Text style={[styles.tabText, activeRoute === route ? styles.tabTextActive : undefined]}>
                {fieldScreens.find((screen) => screen.route === route)?.label ?? route}
              </Text>
            </Pressable>
          ))}
        </View>

        {renderActiveScreen()}
      </View>
    );
  }

  function renderActiveScreen() {
    if (activeRoute === "home") {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Today</Text>
          <Text style={styles.bodyText}>
            {session === undefined ? "Local-only field work" : summary.preparednessLevel}
          </Text>
          <Text style={styles.bodyText}>
            {selectedStarter === undefined
              ? `${summary.activeQuests.length} active quest(s), ${summary.inventory.maintenanceDue.length} maintenance item(s) due.`
              : `Current quest: ${selectedStarter.quest.title}.`}
          </Text>
          <ActionRow>
            <PrimaryButton
              disabled={isBusy}
              label={session === undefined ? "Open Quest" : "Refresh"}
              loading={isBusy}
              onPress={() => {
                if (session === undefined) {
                  setAppMode(selectedStarter === undefined ? "onboarding" : "quest");
                  return;
                }

                void refreshDashboardSafely();
              }}
            />
            <SecondaryButton disabled={isBusy} label={session === undefined ? "Connect Sync" : "Sync"} onPress={() => {
              if (session === undefined) {
                setAppMode("sync");
                return;
              }

              void syncNow();
            }} />
          </ActionRow>
        </View>
      );
    }

    if (activeRoute === "capture") {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Quick Capture</Text>
          <TextInput
            multiline
            onChangeText={setQuickText}
            placeholder="Bought four gallons of water"
            style={[styles.input, styles.textArea]}
            value={quickText}
          />
          <ActionRow>
            <PrimaryButton label="Queue" onPress={queueQuickCapture} />
            <SecondaryButton label="Photo" onPress={() => void capturePhotoEvidence()} />
            <SecondaryButton label="Document" onPress={() => void pickDocumentEvidence()} />
          </ActionRow>
          <EvidenceList
            canRetry={session !== undefined && !isBusy}
            onRetry={(upload) => void retryEvidenceUpload(upload)}
            uploads={pendingEvidence}
          />
        </View>
      );
    }

    if (activeRoute === "scan") {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Scan</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setManualScan}
            placeholder="Barcode or Basecamp QR payload"
            style={styles.input}
            value={manualScan}
          />
          <ActionRow>
            <PrimaryButton label="Process" onPress={() => processScanValue(manualScan)} />
            <SecondaryButton label={scannerPaused ? "Resume" : "Pause"} onPress={() => setScannerPaused(!scannerPaused)} />
          </ActionRow>
          {renderCameraScanner()}
          {lastScan === undefined ? null : (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>{lastScan.title}</Text>
              <Text style={styles.metaText}>{lastScan.offlineBehavior}</Text>
              {lastScan.assetId === undefined ? null : (
                <View style={styles.assetActions}>
                  {lastScan.availableAssetActions.map((action) => (
                    <Pressable
                      accessibilityRole="button"
                      key={action}
                      onPress={() => queueAssetAction(action)}
                      style={styles.actionChip}
                    >
                      <Text style={styles.actionChipText}>{action.replace(/_/g, " ")}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      );
    }

    if (activeRoute === "quests") {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Active Quests</Text>
          {fieldSession.readModel.activeQuests.length === 0 ? (
            selectedStarter === undefined ? (
              <Text style={styles.metaText}>No active quests cached.</Text>
            ) : (
              <View style={styles.listRow}>
                <View style={styles.listText}>
                  <Text style={styles.rowTitle}>{selectedStarter.quest.title}</Text>
                  <Text style={styles.metaText}>Started locally from {selectedStarter.category.name}.</Text>
                </View>
                <SecondaryButton label="Done" onPress={() => {
                  const queued = queueQuestStatusCommand({
                    outbox,
                    questId: selectedStarter.quest.id,
                    questTitle: selectedStarter.quest.title,
                    action: "complete",
                    notes: `Completed locally from ${selectedStarter.category.name} mobile quest.`
                  });
                  commitOutbox(queued.outbox, `${selectedStarter.quest.title} queued.`);
                }} />
              </View>
            )
          ) : (
            fieldSession.readModel.activeQuests.slice(0, 5).map((quest) => (
              <View key={quest.id} style={styles.listRow}>
                <View style={styles.listText}>
                  <Text style={styles.rowTitle}>{quest.title}</Text>
                  <Text style={styles.metaText}>{quest.status}</Text>
                </View>
                <SecondaryButton label="Done" onPress={() => {
                  const queued = queueQuestStatusCommand({
                    outbox,
                    questId: quest.id,
                    questTitle: quest.title,
                    action: "complete",
                    notes: "Completed from mobile active quest list."
                  });
                  commitOutbox(queued.outbox, `${quest.title} queued.`);
                }} />
              </View>
            ))
          )}
        </View>
      );
    }

    if (activeRoute === "inventory") {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Inventory</Text>
          {fieldSession.readModel.inventory.items.slice(0, 8).map((item) => (
            <View key={item.id} style={styles.listRow}>
              <View style={styles.listText}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.metaText}>
                  {item.quantity} {item.unit}
                </Text>
              </View>
              <SecondaryButton label="+1" onPress={() => {
                const queued = queueQuickCaptureCommand(outbox, `added 1 ${item.unit} of ${item.name}`);
                commitOutbox(queued.outbox, `${item.name} adjustment queued.`);
              }} />
            </View>
          ))}
        </View>
      );
    }

    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Offline</Text>
        <Text style={styles.bodyText}>
          {session === undefined
            ? "Queued field work stays local until you connect a Basecamp server."
            : "Queued field work syncs when the server accepts the batch."}
        </Text>
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Cached Field Data</Text>
          <View style={styles.planRows}>
            {fieldValidationSnapshot.rows.map((row) => (
              <View key={row.label} style={styles.planRow}>
                <Text style={styles.planLabel}>{row.label}</Text>
                <Text style={styles.planValue}>{row.value}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.metaText}>
            {fieldSession.readModel.cursor === undefined
              ? `Generated ${fieldSession.readModel.generatedAt}`
              : `Cursor ${fieldSession.readModel.cursor}`}
          </Text>
        </View>
        <View style={styles.metrics}>
          <Metric label="Pending" value={String(fieldValidationSnapshot.pendingCommands)} />
          <Metric label="Conflicts" value={String(fieldValidationSnapshot.conflictCommands)} />
          <Metric label="Evidence" value={String(fieldValidationSnapshot.pendingEvidence)} />
        </View>
        <ActionRow>
          <PrimaryButton
            disabled={isBusy}
            label={session === undefined ? "Connect Sync" : "Sync"}
            loading={isBusy}
            onPress={() => {
              if (session === undefined) {
                setAppMode("sync");
                return;
              }

              void syncNow();
            }}
          />
          <SecondaryButton
            disabled={session === undefined}
            label="Refresh"
            onPress={() => void refreshDashboardSafely()}
          />
        </ActionRow>
        {outbox.queued.length === 0 ? (
          <Text style={styles.metaText}>Outbox empty.</Text>
        ) : (
          outbox.queued.map((queued) => (
            <View key={queued.command.commandId} style={styles.queueRow}>
              <Text style={styles.rowTitle}>{queued.command.intent.type}</Text>
              <Text style={styles.metaText}>
                {queued.status}, retry {queued.retryCount}
              </Text>
              {queued.lastError === undefined ? null : <Text style={styles.errorText}>{queued.lastError}</Text>}
            </View>
          ))
        )}
      </View>
    );
  }

  function renderCameraScanner() {
    if (cameraPermission === null) {
      return <Text style={styles.metaText}>Camera permission pending.</Text>;
    }

    if (cameraPermission?.granted !== true) {
      return (
        <SecondaryButton label="Allow Camera" onPress={() => {
          void requestCameraPermission();
        }} />
      );
    }

    return (
      <View style={styles.cameraFrame}>
        <CameraView
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128"]
          }}
          facing="back"
          onBarcodeScanned={scannerPaused ? undefined : handleBarcodeScanned}
          style={styles.camera}
        />
      </View>
    );
  }
}

function createStarterCategories(): StarterCategory[] {
  return starterCategoryIds.flatMap((categoryId) => {
    const category = basecampSeed.categories.find((candidate) => candidate.id === categoryId);
    const quest = starterQuestForCategory(categoryId);
    const theme = categoryThemes[categoryId];

    if (category === undefined || quest === undefined || theme === undefined) {
      return [];
    }

    return [
      {
        category,
        quest,
        accent: theme.accent,
        icon: theme.icon,
        hook: theme.hook
      }
    ];
  });
}

function starterQuestForCategory(categoryId: string): QuestTemplate | undefined {
  return basecampSeed.quests
    .filter((quest) => quest.categoryId === categoryId)
    .sort((left, right) => {
      if (left.targetLevel !== right.targetLevel) {
        return left.targetLevel - right.targetLevel;
      }

      const priorityDelta = priorityRank(left.priority) - priorityRank(right.priority);

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return left.estimatedMinutes - right.estimatedMinutes;
    })[0];
}

function priorityRank(priority: QuestTemplate["priority"]): number {
  if (priority === "high") {
    return 0;
  }

  if (priority === "medium") {
    return 1;
  }

  return 2;
}

function findStarterCategory(
  starters: StarterCategory[],
  categoryId: string,
  questId?: string
): StarterCategory | undefined {
  const categoryStarter = starters.find((starter) => starter.category.id === categoryId);

  if (categoryStarter === undefined || questId === undefined || categoryStarter.quest.id === questId) {
    return categoryStarter;
  }

  const quest = basecampSeed.quests.find((candidate) => candidate.id === questId);

  if (quest === undefined) {
    return categoryStarter;
  }

  return {
    ...categoryStarter,
    quest
  };
}

function createBootstrapPlan(input: {
  journey: StoredMobileJourney | undefined;
  outbox: CommandOutbox;
  pendingEvidence: MobilePendingEvidenceUpload[];
  selectedStarter: StarterCategory | undefined;
  session: RestoredMobileSession | undefined;
  summary: DashboardSummary;
}): BootstrapPlan {
  const pendingCommands = input.outbox.queued.filter(
    (queued) => queued.status === "pending" || queued.status === "failed" || queued.status === "conflict"
  );
  const pendingEvidence = input.pendingEvidence.filter((upload) => upload.uploadStatus !== "uploaded");
  const serverQuestCount = input.summary.activeQuests.length;
  const starterTitle = input.selectedStarter?.quest.title ?? "No starter quest selected";

  if (input.journey !== undefined && input.journey.mode === "local") {
    return {
      title: "Mobile Start",
      description: "This iPhone has local progress. Connect, review this plan, then sync when you are ready.",
      rows: [
        { label: "Local Quest", value: starterTitle },
        { label: "Queued Commands", value: String(pendingCommands.length) },
        { label: "Pending Evidence", value: String(pendingEvidence.length) },
        { label: "Server Quests", value: `${serverQuestCount} visible after sign-in` }
      ],
      warning:
        "If the server already changed the same quest, Basecamp keeps the item visible as a conflict instead of silently overwriting it."
    };
  }

  if (input.session === undefined && pendingCommands.length === 0 && pendingEvidence.length === 0) {
    return {
      title: "Web Or Server Start",
      description: "No local field work is waiting. Connecting will pull server-created quests and inventory onto this iPhone.",
      rows: [
        { label: "Local Quest", value: "None yet" },
        { label: "Queued Commands", value: "0" },
        { label: "Pending Evidence", value: "0" },
        { label: "Server Quests", value: "Loaded after sign-in" }
      ]
    };
  }

  const hasConflict = pendingCommands.some((queued) => queued.status === "conflict");

  return {
    title: "Paired",
    description: "This iPhone can upload queued work and refresh server-created assignments.",
    rows: [
      { label: "Local Quest", value: input.journey === undefined ? "None selected" : starterTitle },
      { label: "Queued Commands", value: String(pendingCommands.length) },
      { label: "Pending Evidence", value: String(pendingEvidence.length) },
      { label: "Server Quests", value: String(serverQuestCount) }
    ],
    ...(hasConflict
      ? { warning: "One or more queued commands needs human review before the field kit is fully reconciled." }
      : {})
  };
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      {props.children}
    </View>
  );
}

function ActionRow(props: { children: ReactNode }) {
  return <View style={styles.actionRow}>{props.children}</View>;
}

function PrimaryButton(props: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled === true}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.button,
        props.disabled === true ? styles.buttonDisabled : undefined,
        pressed && props.disabled !== true ? styles.buttonPressed : undefined
      ]}
    >
      {props.loading === true ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{props.label}</Text>}
    </Pressable>
  );
}

function SecondaryButton(props: { disabled?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={props.disabled === true}
      onPress={props.onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        props.disabled === true ? styles.secondaryButtonDisabled : undefined,
        pressed && props.disabled !== true ? styles.secondaryButtonPressed : undefined
      ]}
    >
      <Text style={styles.secondaryButtonText}>{props.label}</Text>
    </Pressable>
  );
}

function Metric(props: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{props.label}</Text>
      <Text style={styles.metricValue}>{props.value}</Text>
    </View>
  );
}

function EvidenceList(props: {
  canRetry: boolean;
  onRetry: (upload: MobilePendingEvidenceUpload) => void;
  uploads: MobilePendingEvidenceUpload[];
}) {
  if (props.uploads.length === 0) {
    return <Text style={styles.metaText}>No evidence queued.</Text>;
  }

  return (
    <View style={styles.list}>
      {props.uploads.slice(0, 4).map((upload) => (
        <View key={upload.localId} style={styles.queueRow}>
          <View style={styles.listRowHeader}>
            <View style={styles.listText}>
              <Text style={styles.rowTitle}>{upload.title}</Text>
              <Text style={styles.metaText}>
                {upload.uploadStatus}, {upload.fileName}
              </Text>
            </View>
            {upload.uploadStatus === "uploaded" ? null : (
              <SecondaryButton disabled={!props.canRetry} label="Retry" onPress={() => props.onRetry(upload)} />
            )}
          </View>
          {upload.lastError === undefined ? null : <Text style={styles.errorText}>{upload.lastError}</Text>}
        </View>
      ))}
    </View>
  );
}

function serverApiUrl(serverUrl: string, route: string): string {
  return `${serverUrl}${route}`;
}

function authorizationHeaders(session: RestoredMobileSession) {
  return {
    authorization: `Bearer ${session.token}`
  };
}

function uploadedEvidenceUpload(upload: MobilePendingEvidenceUpload, storageKey: string): MobilePendingEvidenceUpload {
  const { lastError: _lastError, ...rest } = upload;

  return {
    ...rest,
    uploadStatus: "uploaded",
    uploadedStorageKey: storageKey
  };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef3ef"
  },
  keyboardAvoidingView: {
    flex: 1
  },
  container: {
    flexGrow: 1,
    gap: 18,
    padding: 18
  },
  onboardingContainer: {
    backgroundColor: "#142421",
    padding: 0
  },
  onboarding: {
    flex: 1,
    gap: 20,
    paddingBottom: 24
  },
  hero: {
    minHeight: 430,
    justifyContent: "space-between",
    backgroundColor: "#142421",
    paddingBottom: 28,
    paddingHorizontal: 22,
    paddingTop: 48
  },
  heroCopy: {
    gap: 12,
    maxWidth: 420
  },
  heroKicker: {
    color: "#9ec6b7",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  heroTitle: {
    color: "#fffdf8",
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 46
  },
  heroText: {
    color: "#d9e6df",
    fontSize: 17,
    lineHeight: 24
  },
  heroMap: {
    height: 190,
    overflow: "hidden",
    position: "relative"
  },
  ridgeLarge: {
    bottom: 18,
    height: 96,
    left: 6,
    position: "absolute",
    right: 28,
    transform: [{ rotate: "-4deg" }],
    borderColor: "#6fb29a",
    borderRadius: 8,
    borderTopWidth: 4
  },
  ridgeSmall: {
    bottom: 56,
    height: 70,
    left: 92,
    position: "absolute",
    right: 10,
    transform: [{ rotate: "7deg" }],
    borderColor: "#f0b35c",
    borderRadius: 8,
    borderTopWidth: 4
  },
  routeSegmentPrimary: {
    bottom: 64,
    height: 4,
    left: 52,
    position: "absolute",
    width: 180,
    transform: [{ rotate: "-19deg" }],
    backgroundColor: "#d9e6df",
    borderRadius: 8
  },
  routeSegmentSecondary: {
    bottom: 98,
    height: 4,
    left: 190,
    position: "absolute",
    width: 112,
    transform: [{ rotate: "24deg" }],
    backgroundColor: "#d9e6df",
    borderRadius: 8
  },
  beaconPulse: {
    bottom: 116,
    height: 78,
    left: 254,
    position: "absolute",
    width: 78,
    borderColor: "#f0b35c",
    borderRadius: 39,
    borderWidth: 3
  },
  beaconDot: {
    bottom: 144,
    height: 22,
    left: 282,
    position: "absolute",
    width: 22,
    backgroundColor: "#f0b35c",
    borderColor: "#fffdf8",
    borderRadius: 11,
    borderWidth: 3
  },
  waypoint: {
    height: 18,
    position: "absolute",
    width: 18,
    backgroundColor: "#6fb29a",
    borderColor: "#fffdf8",
    borderRadius: 9,
    borderWidth: 3
  },
  waypointOne: {
    bottom: 58,
    left: 44
  },
  waypointTwo: {
    bottom: 88,
    left: 172
  },
  onboardingSection: {
    gap: 14,
    paddingHorizontal: 18
  },
  sectionTitle: {
    color: "#fffdf8",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0
  },
  categoryGrid: {
    gap: 10
  },
  categoryCard: {
    minHeight: 112,
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#fffdf8",
    padding: 12
  },
  categoryCardPressed: {
    opacity: 0.86
  },
  categoryIcon: {
    alignItems: "center",
    height: 56,
    justifyContent: "center",
    width: 56,
    borderRadius: 8
  },
  categoryIconText: {
    color: "#fffdf8",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0
  },
  categoryText: {
    flex: 1,
    gap: 4
  },
  categoryName: {
    color: "#20251f",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0
  },
  categoryHook: {
    color: "#43514a",
    fontSize: 14,
    lineHeight: 19
  },
  questMeta: {
    color: "#5f6f68",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  onboardingActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 18
  },
  header: {
    gap: 10,
    paddingTop: 16
  },
  eyebrow: {
    color: "#596b42",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: "#20251f",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0
  },
  statusText: {
    color: "#536052",
    fontSize: 15,
    lineHeight: 21
  },
  console: {
    gap: 14
  },
  panel: {
    gap: 14,
    borderColor: "#d9d1c2",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#fffdf8",
    padding: 14
  },
  panelTitle: {
    color: "#20251f",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0
  },
  questHero: {
    gap: 14,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: "#fffdf8",
    padding: 14
  },
  questHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  questTitle: {
    color: "#20251f",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29
  },
  questStats: {
    flexDirection: "row",
    gap: 10
  },
  sessionBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  sessionName: {
    color: "#20251f",
    fontSize: 17,
    fontWeight: "800"
  },
  metrics: {
    flexDirection: "row",
    gap: 10
  },
  metric: {
    flex: 1,
    minHeight: 64,
    justifyContent: "center",
    borderColor: "#d9d1c2",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#ece7da",
    padding: 10
  },
  metricLabel: {
    color: "#596b42",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  metricValue: {
    color: "#20251f",
    fontSize: 20,
    fontWeight: "800"
  },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  tab: {
    borderColor: "#c8c2b4",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: "#2f5f45",
    borderColor: "#2f5f45"
  },
  tabText: {
    color: "#2b332c",
    fontSize: 14,
    fontWeight: "700"
  },
  tabTextActive: {
    color: "#fff"
  },
  field: {
    gap: 7
  },
  label: {
    color: "#2b332c",
    fontSize: 15,
    fontWeight: "700"
  },
  input: {
    minHeight: 50,
    borderColor: "#c8c2b4",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#fffdf8",
    color: "#20251f",
    fontSize: 16,
    paddingHorizontal: 12
  },
  textArea: {
    minHeight: 98,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#2f5f45",
    paddingHorizontal: 16
  },
  buttonPressed: {
    backgroundColor: "#244a36"
  },
  buttonDisabled: {
    backgroundColor: "#8f9b8e"
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800"
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#c8c2b4",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#fffdf8",
    paddingHorizontal: 14
  },
  secondaryButtonPressed: {
    backgroundColor: "#ece7da"
  },
  secondaryButtonDisabled: {
    opacity: 0.55
  },
  secondaryButtonText: {
    color: "#2b332c",
    fontSize: 14,
    fontWeight: "800"
  },
  smallButton: {
    minHeight: 38,
    justifyContent: "center",
    borderColor: "#c8c2b4",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12
  },
  smallButtonText: {
    color: "#2b332c",
    fontSize: 13,
    fontWeight: "800"
  },
  bodyText: {
    color: "#2b332c",
    fontSize: 16,
    lineHeight: 22
  },
  metaText: {
    color: "#697468",
    fontSize: 13,
    lineHeight: 18
  },
  errorText: {
    color: "#8a2f2f",
    fontSize: 13,
    lineHeight: 18
  },
  warningText: {
    color: "#8a5a18",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  resultBox: {
    gap: 7,
    borderColor: "#d9d1c2",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12
  },
  resultTitle: {
    color: "#20251f",
    fontSize: 16,
    fontWeight: "800"
  },
  planRows: {
    gap: 6
  },
  planRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  planLabel: {
    color: "#596b42",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  planValue: {
    color: "#20251f",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "right"
  },
  assetActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  infoChip: {
    borderColor: "#bfd3c8",
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#eef7f2",
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  infoChipText: {
    color: "#1f3d35",
    fontSize: 12,
    fontWeight: "800"
  },
  actionChip: {
    borderColor: "#c8c2b4",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  actionChipText: {
    color: "#2b332c",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  cameraFrame: {
    height: 220,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#20251f"
  },
  camera: {
    flex: 1
  },
  list: {
    gap: 8
  },
  listRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    borderTopColor: "#ece7da",
    borderTopWidth: 1,
    paddingTop: 10
  },
  listRowHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  listText: {
    flex: 1,
    gap: 3
  },
  rowTitle: {
    color: "#20251f",
    fontSize: 15,
    fontWeight: "800"
  },
  queueRow: {
    gap: 4,
    borderTopColor: "#ece7da",
    borderTopWidth: 1,
    paddingTop: 10
  }
});
