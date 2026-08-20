import seedJson from "../../content/seed/basecamp-seed-v0.json";
import {
  defineSeedDataset,
  type BasecampSeed,
  type CapabilityStateSnapshot,
  type QuestTemplate
} from "../src/index";

const seed: BasecampSeed = defineSeedDataset(seedJson);
const firstQuest: QuestTemplate = seed.quests[0] ?? raise("expected seeded quest");

const requiredCapabilityState: CapabilityStateSnapshot = {
  owned: true,
  configured: true,
  tested: true,
  validated: true,
  maintained: true
};

export { firstQuest, requiredCapabilityState, seed };

function raise(message: string): never {
  throw new Error(message);
}
