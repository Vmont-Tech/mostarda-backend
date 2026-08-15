import { statfs } from "node:fs/promises";
import os from "node:os";

export type HardwareFactStatus = "PASS" | "FAIL" | "UNKNOWN" | "BLOCKED";

export interface HardwareFact<T> {
  readonly status: HardwareFactStatus;
  readonly value: T;
  readonly source: "LOCAL_HOST_RUNTIME" | "NOT_COLLECTED";
}

export interface HardwareDiscoveryResult {
  readonly validationStatus: "SOFTWARE_VERIFIED";
  readonly physicalHardwareStatus: "NOT_PERFORMED";
  readonly mxqProvisioning: "BLOCKED";
  readonly hardwareModel: HardwareFact<null>;
  readonly facts: {
    readonly os: HardwareFact<string>;
    readonly architecture: HardwareFact<string>;
    readonly memoryBytes: HardwareFact<number>;
    readonly storageBytes: HardwareFact<number | null>;
    readonly networkInterfaces: HardwareFact<readonly string[]>;
  };
  readonly capabilities: {
    readonly gpu: HardwareFact<null>;
    readonly display: HardwareFact<null>;
    readonly codecs: HardwareFact<null>;
    readonly bootloader: HardwareFact<null>;
    readonly secureBoot: HardwareFact<null>;
    readonly recovery: HardwareFact<null>;
  };
}

export class HostHardwareAdapter {
  readonly #storageRoot: string;

  constructor(storageRoot: string) {
    if (storageRoot.trim().length === 0) throw new Error("hardware adapter storage root is required");
    this.#storageRoot = storageRoot;
  }

  async discover(): Promise<HardwareDiscoveryResult> {
    const networkInterfaces = Object.entries(os.networkInterfaces())
      .filter(([, entries]) => entries !== undefined && entries.length > 0)
      .map(([name]) => name);
    let storageBytes: number | null = null;
    try {
      const stats = await statfs(this.#storageRoot);
      storageBytes = Number(stats.blocks) * Number(stats.bsize);
    } catch {
      storageBytes = null;
    }
    return {
      validationStatus: "SOFTWARE_VERIFIED",
      physicalHardwareStatus: "NOT_PERFORMED",
      mxqProvisioning: "BLOCKED",
      hardwareModel: unknownFact(null),
      facts: {
        os: { status: "PASS", value: `${process.platform} ${os.release()}`, source: "LOCAL_HOST_RUNTIME" },
        architecture: { status: "PASS", value: os.arch(), source: "LOCAL_HOST_RUNTIME" },
        memoryBytes: { status: "PASS", value: os.totalmem(), source: "LOCAL_HOST_RUNTIME" },
        storageBytes: { status: storageBytes === null ? "UNKNOWN" : "PASS", value: storageBytes, source: storageBytes === null ? "NOT_COLLECTED" : "LOCAL_HOST_RUNTIME" },
        networkInterfaces: { status: "PASS", value: networkInterfaces, source: "LOCAL_HOST_RUNTIME" },
      },
      capabilities: {
        gpu: unknownFact(null),
        display: unknownFact(null),
        codecs: unknownFact(null),
        bootloader: unknownFact(null),
        secureBoot: unknownFact(null),
        recovery: unknownFact(null),
      },
    };
  }
}

function unknownFact<T>(value: T): HardwareFact<T> {
  return { status: "UNKNOWN", value, source: "NOT_COLLECTED" };
}
