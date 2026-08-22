import {
  createDashboardSummary,
  type DashboardSummary,
  type InventoryDashboardSummary,
  type QuestSummary
} from "@basecamp/api";
import { basecampSeed } from "@basecamp/content";
import {
  createCommandOutbox,
  createOfflineReadModel,
  createScanWorkflow,
  mobileRoutes,
  parseQuickCapture,
  type CommandOutbox,
  type MobileRoute,
  type OfflineReadModel,
  type QuickCaptureParseResult,
  type ScanWorkflow
} from "@basecamp/sync";

export {
  createMobileLoginRequest,
  localLoginEndpoint,
  mobileDistribution,
  normalizeBasecampServerUrl,
  type MobileBuildPath,
  type MobileLoginRequest
} from "./connection";
export {
  applyMobileSyncResponse,
  createEvidenceUploadRequest,
  createMobileFieldScreens,
  createMobileFieldSession,
  createPendingEvidenceUpload,
  createSyncBatchRequest,
  defaultEvidenceLink,
  markMobileSyncFailure,
  previewScanWorkflow,
  queueAssetActionCommand,
  queueQuickCaptureCommand,
  queueQuestStatusCommand,
  queueScanCommand,
  restoreMobileOutbox,
  routeForScannedCode,
  serializeMobileOutbox,
  type MobileFieldScreen,
  type MobileFieldScreenKind,
  type MobileFieldSession,
  type MobilePendingEvidenceUpload,
  type MobileQueuedCommandResult
} from "./field-workflows";
export {
  createIphoneValidationReport,
  iphoneValidationRows,
  type IPhoneValidationEnvironment,
  type IPhoneValidationIssue,
  type IPhoneValidationReportInput,
  type IPhoneValidationRow
} from "./validation";

export interface MobileScreen {
  route: MobileRoute;
  label: string;
  badgeCount: number;
  primaryAction: string;
  emptyState: string;
}

export interface MobilePermissionPlan {
  permission: "camera" | "local_network" | "photos" | "notifications";
  whenRequested: string;
  requiredFor: string;
}

export interface MobileAppShell {
  appName: "Basecamp Mobile";
  stack: "Expo React Native";
  minimumIosVersion: string;
  buildPath: "local_admin_controlled_ios_v1";
  serverUrlSetup: "manual_url_or_pairing_qr";
  screens: MobileScreen[];
  permissions: MobilePermissionPlan[];
  offline: {
    firstSyncRequired: boolean;
    readModel: OfflineReadModel;
    outbox: CommandOutbox;
  };
  sampleCapture: QuickCaptureParseResult;
  sampleScan: ScanWorkflow;
}

export function createMobileAppShell(
  summary: DashboardSummary = createDashboardSummary(basecampSeed),
  options: {
    clientId?: string;
    generatedAt?: string;
    cursor?: string;
  } = {}
): MobileAppShell {
  const clientId = options.clientId ?? "mobile-preview";
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const readModel = createOfflineReadModel(summary, {
    generatedAt,
    ...(options.cursor === undefined ? {} : { cursor: options.cursor })
  });

  return {
    appName: "Basecamp Mobile",
    stack: "Expo React Native",
    minimumIosVersion: "17.0",
    buildPath: "local_admin_controlled_ios_v1",
    serverUrlSetup: "manual_url_or_pairing_qr",
    screens: mobileRoutes.map((route) => screenForRoute(route, summary.inventory, summary.activeQuests)),
    permissions: [
      {
        permission: "camera",
        whenRequested: "First barcode or QR scan.",
        requiredFor: "Barcode inventory capture and Basecamp asset QR lookup."
      },
      {
        permission: "local_network",
        whenRequested: "First connection to a LAN-only Basecamp server.",
        requiredFor: "Self-hosted server pairing and sync on the local network."
      },
      {
        permission: "photos",
        whenRequested: "First evidence photo attachment.",
        requiredFor: "Quest, inventory, asset, and maintenance evidence."
      },
      {
        permission: "notifications",
        whenRequested: "When maintenance reminders are enabled.",
        requiredFor: "Maintenance due and sync failure reminders."
      }
    ],
    offline: {
      firstSyncRequired: false,
      readModel,
      outbox: createCommandOutbox(clientId)
    },
    sampleCapture: parseQuickCapture("Bought four gallons of water", {
      clientId,
      localSequence: 1,
      now: generatedAt
    }),
    sampleScan: createScanWorkflow(
      { kind: "qr", value: "basecamp://assets/asset-backup-generator" },
      { clientId, localSequence: 2, now: generatedAt }
    )
  };
}

function screenForRoute(
  route: MobileRoute,
  inventory: InventoryDashboardSummary,
  activeQuests: QuestSummary[]
): MobileScreen {
  if (route === "home") {
    return {
      route,
      label: "Home",
      badgeCount: activeQuests.length + inventory.maintenanceDue.length,
      primaryAction: "Review today's field work",
      emptyState: "Choose a starter quest locally or sync with a server to load assigned work."
    };
  }

  if (route === "capture") {
    return {
      route,
      label: "Capture",
      badgeCount: 0,
      primaryAction: "Enter quick capture text",
      emptyState: "Capture inventory, maintenance, drills, skills, failures, and quest progress."
    };
  }

  if (route === "scan") {
    return {
      route,
      label: "Scan",
      badgeCount: 0,
      primaryAction: "Scan barcode or QR",
      emptyState: "Camera permission is requested only when scanning starts."
    };
  }

  if (route === "quests") {
    return {
      route,
      label: "Quests",
      badgeCount: activeQuests.length,
      primaryAction: "Open active quest",
      emptyState: "Choose a starter quest locally or sync with a server to load assigned quests."
    };
  }

  if (route === "inventory") {
    return {
      route,
      label: "Inventory",
      badgeCount: inventory.items.length,
      primaryAction: "Update inventory",
      emptyState: "Inventory appears after first sync or offline capture."
    };
  }

  return {
    route,
    label: "Offline",
    badgeCount: inventory.maintenanceDue.length,
    primaryAction: "Review cached readiness data",
    emptyState: "Local capture works before server sync; reconnect when you are ready to upload."
  };
}
