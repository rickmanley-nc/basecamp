export type IPhoneValidationIssue = 75 | 76 | 77 | 93 | 94;

export type IPhoneValidationEnvironment = "cloud-pilot" | "physical-iphone" | "simulator";

export interface IPhoneValidationRow {
  area: string;
  issues: IPhoneValidationIssue[];
  environment: IPhoneValidationEnvironment;
  steps: string;
  passCriteria: string;
  evidenceToRecord: string[];
}

export interface IPhoneValidationReportInput {
  date?: string;
  tester?: string;
  iphoneModel?: string;
  iosVersion?: string;
  appVersionBuild?: string;
  installChannel?: "Xcode development install" | "ad hoc" | "TestFlight" | "stable release" | "other";
  serverUrlMode?: "LAN" | "VPN" | "secure remote" | "other";
  deploymentProfile?: "cloud-pilot" | "local-dev" | "homelab" | "unknown";
  databaseKind?: "postgresql" | "sqlite" | "unknown";
  backupConfirmed?: "yes" | "no";
}

export const iphoneValidationRows: IPhoneValidationRow[] = [
  {
    area: "Install",
    issues: [75, 77, 93],
    environment: "physical-iphone",
    steps: "Install the locally produced build through the selected Apple-supported path and open it.",
    passCriteria: "App installs, opens without crashing, and shows the mobile-first Basecamp onboarding flow.",
    evidenceToRecord: ["iPhone model", "iOS version", "Basecamp Mobile build", "install channel"]
  },
  {
    area: "First-run local quest",
    issues: [77, 93],
    environment: "physical-iphone",
    steps: "Open the app without entering a server URL, choose a preparedness category, and start the starter quest.",
    passCriteria: "The app does not require server sign-in, persists the selected quest locally, and queues quest progress offline.",
    evidenceToRecord: ["category chosen", "starter quest shown", "local queue result"]
  },
  {
    area: "Mobile/web bootstrap",
    issues: [76, 77, 94],
    environment: "physical-iphone",
    steps: "Review the Sync plan, connect to the server, sync mobile-start local quest progress, then confirm web-start server assignments refresh onto the phone.",
    passCriteria: "Mobile-start quest progress uploads with a stable quest ID; web-start active quests refresh after sign-in; duplicate starter progress is accepted idempotently or shown as a visible conflict.",
    evidenceToRecord: ["sync plan shown", "mobile-start sync result", "web-start refresh result", "duplicate or conflict result"]
  },
  {
    area: "Server URL",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "Enter the cloud-pilot server URL using only the public-safe URL mode in report notes.",
    passCriteria: "URL is accepted from the optional Sync path; invalid URLs show a clear error and do not save credentials.",
    evidenceToRecord: ["server URL mode", "deployment profile"]
  },
  {
    area: "Sign-in",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "Sign in with an admin-created local username/password account.",
    passCriteria: "Sign-in succeeds; password field clears; token is stored securely; Home refreshes from the server.",
    evidenceToRecord: ["local auth result", "password omitted from notes"]
  },
  {
    area: "First sync",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "Refresh Home and Offline data while connected to the cloud-pilot server.",
    passCriteria: "Home, Quests, Inventory, and Offline screens show server-backed data or an explicit empty state.",
    evidenceToRecord: ["database kind", "active profile", "pass/fail notes"]
  },
  {
    area: "Local Network",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "If iOS prompts for Local Network access, allow it and retry sync.",
    passCriteria: "LAN/private server sync works after permission is granted. If denied, the failure is understandable.",
    evidenceToRecord: ["permission prompt result", "sync result"]
  },
  {
    area: "Quick Capture online",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "From Capture, queue an inventory-style entry such as adding water, then sync while online.",
    passCriteria: "Command appears in the outbox, sync attempts, and the server accepts it or shows a conflict.",
    evidenceToRecord: ["command type", "accepted or conflict result"]
  },
  {
    area: "Evidence photo",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "From Capture, take or select a photo and upload it while online.",
    passCriteria: "Permission prompt appears when expected; upload succeeds or stays retryable; no phone-local URI appears in server metadata.",
    evidenceToRecord: ["Photos or Camera permission result", "storage result", "retry result", "URI leak check"]
  },
  {
    area: "Evidence document",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "Attach a document if one is available on the iPhone.",
    passCriteria: "Document picker opens, upload succeeds or gives a clear actionable retry state.",
    evidenceToRecord: ["picker result", "upload result", "retry result"]
  },
  {
    area: "Basecamp QR scan",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "From Scan, grant Camera permission and scan a Basecamp asset QR tag.",
    passCriteria: "Asset workflow appears with inspect, maintain, move, adjust quantity, report issue, and instructions actions.",
    evidenceToRecord: ["Camera permission result", "asset workflow result"]
  },
  {
    area: "Barcode scan",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "Scan a commercial barcode.",
    passCriteria: "Inventory confirmation appears with barcode context, quantity, location, and notes fields.",
    evidenceToRecord: ["barcode confirmation result"]
  },
  {
    area: "Offline cache",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "Turn on airplane mode and open Home, Quests, Inventory, and Offline.",
    passCriteria: "Previously synced data remains visible enough for field use, including the Offline cached-data snapshot; online-only failures do not erase cached data.",
    evidenceToRecord: ["offline visible data", "failure text if any"]
  },
  {
    area: "Offline queue restart",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "While offline, create a Quick Capture entry and scan or manually enter a code. Force-close and reopen the app.",
    passCriteria: "Pending commands survive app restart and remain visible in Offline/outbox state.",
    evidenceToRecord: ["queued command count before restart", "queued command count after restart"]
  },
  {
    area: "Reconnect sync",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "Turn airplane mode off, return to the same network, and sync.",
    passCriteria: "Pending commands upload idempotently or show a user-visible conflict; accepted commands are not duplicated.",
    evidenceToRecord: ["accepted count", "conflict count", "duplicate check"]
  },
  {
    area: "Conflict visibility",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "If a conflict appears, open it and read the message.",
    passCriteria: "Conflict explains what needs human review without exposing internal payloads or secrets.",
    evidenceToRecord: ["conflict message quality", "secret leak check"]
  },
  {
    area: "Sign-out",
    issues: [76, 77],
    environment: "physical-iphone",
    steps: "Sign out, close the app, and reopen it.",
    passCriteria: "The prior session is gone; protected server data requires sign-in again.",
    evidenceToRecord: ["session cleared result"]
  },
  {
    area: "Lost device/user disable procedure",
    issues: [75, 77],
    environment: "cloud-pilot",
    steps: "Confirm the operator can disable the test user from the server runbook.",
    passCriteria: "User disable guidance is understandable; no password or token is recorded publicly.",
    evidenceToRecord: ["disable path checked", "secret-free notes"]
  }
];

export function createIphoneValidationReport(input: IPhoneValidationReportInput = {}): string {
  const field = (value: string | undefined) => value ?? "";
  const rowLines = iphoneValidationRows.map(
    (row) => `| ${row.area} |  | ${row.environment}; issues ${row.issues.map((issue) => `#${issue}`).join(", ")} | |`
  );

  return [
    "## Physical iPhone Validation",
    "",
    "- Date: " + field(input.date),
    "- Tester: " + field(input.tester),
    "- iPhone model: " + field(input.iphoneModel),
    "- iOS version: " + field(input.iosVersion),
    "- Basecamp Mobile version/build: " + field(input.appVersionBuild),
    "- Install channel: " + field(input.installChannel),
    "- Server URL mode: " + field(input.serverUrlMode),
    "- Deployment profile: " + field(input.deploymentProfile),
    "- Database kind: " + field(input.databaseKind),
    "- Backup confirmed before test: " + field(input.backupConfirmed),
    "",
    "Do not include passwords, tokens, private hostnames, private IPs, pairing secrets, or phone-local file URIs.",
    "",
    "| Area | Pass/Fail | Scope | Notes |",
    "| --- | --- | --- | --- |",
    ...rowLines,
    "",
    "## Follow-Ups",
    "",
    "- Blockers:",
    "- Bugs:",
    "- Documentation gaps:",
    "- Screenshots attached: yes/no"
  ].join("\n");
}
