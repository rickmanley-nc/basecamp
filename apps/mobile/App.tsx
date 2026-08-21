import {
  apiRoutes,
  createDashboardSummary,
  type AuthLoginResponse,
  type DashboardSummary,
  type EvidenceUploadResponse
} from "@basecamp/api";
import { basecampSeed } from "@basecamp/content";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  applyMobileSyncResponse,
  createEvidenceUploadRequest,
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
  queueScanCommand,
  routeForScannedCode,
  type MobilePendingEvidenceUpload
} from "./src";
import {
  clearMobileSession,
  loadMobileSession,
  loadOutbox,
  loadPendingEvidence,
  saveMobileSession,
  saveOutbox,
  savePendingEvidence,
  type RestoredMobileSession
} from "./src/native-storage";
import { createCommandOutbox, mobileRoutes, type CommandOutbox, type MobileRoute, type ScanWorkflow } from "@basecamp/sync";

const clientId = "mobile-field-client";
const generatedAt = "2026-08-21T00:00:00.000Z";

export default function App() {
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Ready");
  const [isBusy, setIsBusy] = useState(false);
  const [session, setSession] = useState<RestoredMobileSession | undefined>();
  const [summary, setSummary] = useState<DashboardSummary>(() => createDashboardSummary(basecampSeed));
  const [outbox, setOutbox] = useState<CommandOutbox>(() => createCommandOutbox(clientId));
  const [pendingEvidence, setPendingEvidence] = useState<MobilePendingEvidenceUpload[]>([]);
  const [activeRoute, setActiveRoute] = useState<MobileRoute>("home");
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
  const pendingCommandCount = outbox.queued.filter(
    (queued) => queued.status === "pending" || queued.status === "failed"
  ).length;
  const blockedEvidenceCount = pendingEvidence.filter((upload) => upload.uploadStatus !== "uploaded").length;
  const canSignIn =
    !isBusy && serverUrl.trim().length > 0 && username.trim().length > 0 && password.length > 0;

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const [restoredSession, restoredOutbox, restoredEvidence] = await Promise.all([
        loadMobileSession(),
        loadOutbox(clientId),
        loadPendingEvidence()
      ]);

      if (!mounted) {
        return;
      }

      if (restoredSession !== undefined) {
        setSession(restoredSession);
        setServerUrl(restoredSession.serverUrl);
        setUsername(restoredSession.user.username);
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
      setStatus(`Signed in as ${login.user.username}.`);
      await refreshDashboard(restoredSession).catch((error: unknown) => {
        setStatus(error instanceof Error ? `Signed in. ${error.message}` : "Signed in. Dashboard refresh failed.");
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
    setStatus("Signed out.");
  }

  async function refreshDashboard(activeSession = session) {
    if (activeSession === undefined) {
      setStatus("Sign in first.");
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

  function queueQuickCapture() {
    if (quickText.trim().length === 0) {
      setStatus("Quick Capture is empty.");
      return;
    }

    const queued = queueQuickCaptureCommand(outbox, quickText);
    setQuickText("");
    commitOutbox(queued.outbox, `${queued.title} queued.`);
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
      throw new Error("Sign in before uploading evidence.");
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

  async function syncNow() {
    if (session === undefined) {
      setStatus("Sign in first.");
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

      if (request.commands.length === 0) {
        await refreshDashboard(session);
        setStatus("No commands to sync.");
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
      commitOutbox(nextOutbox, `Synced ${request.commands.length} command(s).`);
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
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>{mobileDistribution.buildPath}</Text>
              <Text style={styles.title}>Basecamp Mobile</Text>
            </View>
            <Text style={styles.statusText}>{status}</Text>
          </View>

          {session === undefined ? renderSignIn() : renderFieldConsole()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  function renderSignIn() {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Sign In</Text>
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
        <PrimaryButton disabled={!canSignIn} label="Sign In" loading={isBusy} onPress={() => void signIn()} />
      </View>
    );
  }

  function renderFieldConsole() {
    const activeSession = session;

    if (activeSession === undefined) {
      return null;
    }

    return (
      <View style={styles.console}>
        <View style={styles.sessionBar}>
          <View>
            <Text style={styles.sessionName}>{activeSession.user.displayName}</Text>
            <Text style={styles.metaText}>{activeSession.serverUrl}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.smallButton}>
            <Text style={styles.smallButtonText}>Sign Out</Text>
          </Pressable>
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
          <Text style={styles.bodyText}>{summary.preparednessLevel}</Text>
          <Text style={styles.bodyText}>
            {summary.activeQuests.length} active quest(s), {summary.inventory.maintenanceDue.length} maintenance item(s)
            due.
          </Text>
          <ActionRow>
        <PrimaryButton
          disabled={isBusy}
          label="Refresh"
          loading={isBusy}
          onPress={() => void refreshDashboardSafely()}
        />
            <SecondaryButton disabled={isBusy} label="Sync" onPress={() => void syncNow()} />
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
          <EvidenceList uploads={pendingEvidence} />
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
            <Text style={styles.metaText}>No active quests cached.</Text>
          ) : (
            fieldSession.readModel.activeQuests.slice(0, 5).map((quest) => (
              <View key={quest.id} style={styles.listRow}>
                <View style={styles.listText}>
                  <Text style={styles.rowTitle}>{quest.title}</Text>
                  <Text style={styles.metaText}>{quest.status}</Text>
                </View>
                <SecondaryButton label="Done" onPress={() => {
                  const queued = queueQuickCaptureCommand(outbox, `completed ${quest.title}`);
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
        <ActionRow>
          <PrimaryButton disabled={isBusy} label="Sync" loading={isBusy} onPress={() => void syncNow()} />
          <SecondaryButton label="Refresh" onPress={() => void refreshDashboardSafely()} />
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

function EvidenceList(props: { uploads: MobilePendingEvidenceUpload[] }) {
  if (props.uploads.length === 0) {
    return <Text style={styles.metaText}>No evidence queued.</Text>;
  }

  return (
    <View style={styles.list}>
      {props.uploads.slice(0, 4).map((upload) => (
        <View key={upload.localId} style={styles.queueRow}>
          <Text style={styles.rowTitle}>{upload.title}</Text>
          <Text style={styles.metaText}>
            {upload.uploadStatus}, {upload.fileName}
          </Text>
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
    backgroundColor: "#f5f2ea"
  },
  keyboardAvoidingView: {
    flex: 1
  },
  container: {
    flexGrow: 1,
    gap: 18,
    padding: 18
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
  assetActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
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
