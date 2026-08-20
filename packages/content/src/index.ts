import seedJson from "../seed/basecamp-seed-v0.json";
import { defineSeedDataset, type BasecampSeed, type BasecampSeedInput } from "@basecamp/domain";
import { validateSeedDataset, type SeedValidationResult } from "./validation";

export const rawSeedDataset = seedJson satisfies BasecampSeedInput;
export const basecampSeed: BasecampSeed = defineSeedDataset(rawSeedDataset);
export const seedValidation: SeedValidationResult = validateSeedDataset(basecampSeed);

export { validateSeedDataset, type SeedValidationIssue, type SeedValidationResult } from "./validation";
