import type {
  InstalledPackageGeneration,
  InstalledPackageResult,
  PackageDescriptor,
  PackageInstallation,
} from "../src/contracts/package-read-models.mjs";
import type { PackageInstallProgress } from "./package-installer.mjs";

export type { PackageInstallProgress } from "./package-installer.mjs";

export interface InstallPublishedPackageOptions {
  catalog: unknown;
  catalogUrl: string;
  addComponents?: readonly string[];
  addFileIds?: readonly string[];
  preserveLocalSource?: boolean;
  fetchImpl?: typeof fetch;
  onProgress?: ((progress: PackageInstallProgress) => void) | null;
  signal?: AbortSignal | null;
}

export function installPublishedPackage(
  game: string,
  options: InstallPublishedPackageOptions,
): Promise<InstalledPackageResult & {
  entry: unknown;
  descriptor: PackageDescriptor;
  descriptorUrl: string;
}>;

export function publishedPackageStatus(game: string, catalog: unknown): Promise<{
  installation: PackageInstallation | null;
  generation: InstalledPackageGeneration | null;
  published: unknown;
  updateAvailable: boolean;
}>;
