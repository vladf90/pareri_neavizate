import type { Provider } from "./Provider.js";
import type { ProviderName, ProviderInfo } from "@parerineavizate/shared/models";
import { MockProvider } from "./MockProvider.js";
import { SportMonksProvider } from "./sportmonks/SportMonksProvider.js";
import { config } from "../config.js";
import { providerLogger } from "../utils/logger.js";

export class ProviderRegistry {
  private providers: Map<ProviderName, Provider> = new Map();
  private activeProviderName: ProviderName;

  constructor(activeProviderName: ProviderName = config.provider) {
    this.activeProviderName = activeProviderName;
  }

  async init(): Promise<void> {
    // Always register mock provider
    const mockProvider = new MockProvider();
    await mockProvider.init();
    this.providers.set("mock", mockProvider);

    // Only register SportMonks if it's the active provider AND token is available
    if (this.activeProviderName === "sportmonks" && config.sportmonks.token) {
      try {
        const sportMonksProvider = new SportMonksProvider();
        await sportMonksProvider.init();
        this.providers.set("sportmonks", sportMonksProvider);
      } catch (err) {
        providerLogger.warn({ error: err }, "Failed to init SportMonks provider");
        // Fall back to mock if SportMonks fails
        providerLogger.warn("Falling back to mock provider");
        this.activeProviderName = "mock";
      }
    } else if (this.activeProviderName === "sportmonks" && !config.sportmonks.token) {
      providerLogger.warn("No SportMonks token, falling back to mock provider");
      this.activeProviderName = "mock";
    }

    providerLogger.info({ provider: this.activeProviderName }, "Active provider set");
  }

  getActiveProvider(): Provider | null {
    return this.providers.get(this.activeProviderName) || null;
  }

  getProvider(name: ProviderName): Provider | null {
    return this.providers.get(name) || null;
  }

  getActiveProviderName(): ProviderName {
    return this.activeProviderName;
  }

  setActiveProvider(name: ProviderName): boolean {
    const provider = this.providers.get(name);
    if (provider && provider.isReady()) {
      this.activeProviderName = name;
      providerLogger.info({ provider: name }, "Switched provider");
      return true;
    }
    providerLogger.warn(
      { provider: name },
      "Cannot switch to provider (not ready or not registered)"
    );
    return false;
  }

  getProviderInfo(): ProviderInfo {
    const provider = this.getActiveProvider();
    return {
      name: this.activeProviderName,
      status: provider?.isReady() ? "ok" : "down",
      message: provider?.isReady() ? undefined : "Provider not ready",
      lastSuccessAt: provider?.isReady() ? Date.now() : undefined,
    };
  }

  dispose(): void {
    for (const provider of this.providers.values()) {
      provider.dispose();
    }
    this.providers.clear();
  }
}
