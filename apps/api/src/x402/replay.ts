import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ReplayStore {
  claim(key: string): Promise<boolean>;
}

export class InMemoryReplayStore implements ReplayStore {
  private readonly used = new Set<string>();

  async claim(key: string): Promise<boolean> {
    if (this.used.has(key)) return false;
    this.used.add(key);
    return true;
  }
}

export class FileReplayStore implements ReplayStore {
  constructor(private readonly directory: string) {}

  async claim(key: string): Promise<boolean> {
    if (!/^[0-9a-f]{64}$/.test(key)) {
      throw new Error("invalid replay key");
    }
    await mkdir(this.directory, { recursive: true });
    try {
      await writeFile(join(this.directory, key), "", { flag: "wx" });
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        return false;
      }
      throw error;
    }
  }
}
