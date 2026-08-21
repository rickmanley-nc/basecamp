import { createMobileAppShell } from "./index";

const shell = createMobileAppShell(undefined, {
  clientId: "mobile-preview",
  generatedAt: "2026-08-21T00:00:00.000Z"
});

console.log(JSON.stringify({
  appName: shell.appName,
  stack: shell.stack,
  screens: shell.screens.map((screen) => screen.label),
  sampleCapture: shell.sampleCapture.confirmationCard.title,
  sampleScan: shell.sampleScan.title
}, null, 2));
