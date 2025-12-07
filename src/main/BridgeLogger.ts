import fs from 'fs';
import { join } from 'path';

export interface BridgeEvent {
  timestamp: number;
  groups: string[];
}

export interface MetricsData {
  bridgesLast7d: number;
  bridgesLast30d: number;
  bridgesLast6m: number;
  bridgesLast1y: number;
  topGroups: { name: string; count: number }[];
}

export class BridgeLogger {
  private historyPath: string;
  private events: BridgeEvent[] = [];

  constructor(dataRoot: string) {
    this.historyPath = join(dataRoot, 'history.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.historyPath)) {
        const raw = fs.readFileSync(this.historyPath, 'utf-8');
        this.events = JSON.parse(raw);
      }
    } catch (e) {
      console.error('[BridgeLogger] Failed to load history:', e);
      this.events = [];
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.historyPath, JSON.stringify(this.events, null, 2));
    } catch (e) {
      console.error('[BridgeLogger] Failed to save history:', e);
    }
  }

  public logBridge(groups: string[]) {
    this.events.push({
      timestamp: Date.now(),
      groups
    });
    this.save();
  }

  public getMetrics(): MetricsData {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const countSince = (days: number) => {
      const cutoff = now - (days * oneDay);
      return this.events.filter(e => e.timestamp >= cutoff).length;
    };

    // Metrics
    const bridgesLast7d = countSince(7);
    const bridgesLast30d = countSince(30);
    const bridgesLast6m = countSince(180);
    const bridgesLast1y = countSince(365);

    // Top Groups
    const groupCounts: Record<string, number> = {};
    this.events.forEach(e => {
      e.groups.forEach(g => {
        if (g === 'Default') return; // Exclude Default
        groupCounts[g] = (groupCounts[g] || 0) + 1;
      });
    });

    const topGroups = Object.entries(groupCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    return {
      bridgesLast7d,
      bridgesLast30d,
      bridgesLast6m,
      bridgesLast1y,
      topGroups
    };
  }
}
