/** Lightweight in-process metrics for the health endpoint and logs. */
export class Metrics {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  readonly startedAt = Date.now();
  private tickDurations: number[] = [];

  inc(name: string, amount = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + amount);
  }

  set(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  observeTick(ms: number): void {
    this.tickDurations.push(ms);
    if (this.tickDurations.length > 120) this.tickDurations.shift();
  }

  snapshot(): Record<string, unknown> {
    const avgTick =
      this.tickDurations.length > 0
        ? this.tickDurations.reduce((sum, value) => sum + value, 0) / this.tickDurations.length
        : 0;
    return {
      uptimeSec: Math.round((Date.now() - this.startedAt) / 1000),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      serverTickMsAvg: Number(avgTick.toFixed(2)),
    };
  }
}
