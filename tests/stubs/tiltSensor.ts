import { TiltGate, type TiltDirection } from '../../src/core/tiltGate';

/**
 * `TiltSensor`-ის ორეული. `expo-sensors` `react-native`-ს ითრევს, რომელიც
 * Node-ში არ იშლება — ამიტომ ტესტში მხოლოდ ნატიური ფენა იცვლება.
 *
 * **გადაწყვეტილების ლოგიკა (`TiltGate`) ნამდვილია** — ის ცალკე იტესტება
 * `tiltGate.test.ts`-ში. აქ მხოლოდ `DeviceMotion`-ის გამოწერაა ამოღებული.
 */
export class TiltSensor {
  private gate = new TiltGate();
  private onTilt: ((direction: TiltDirection) => void) | null = null;
  private running = false;

  get isCalibrating(): boolean {
    return this.gate.isCalibrating;
  }

  static async isAvailable(): Promise<boolean> {
    return false;
  }

  start(onTilt: (direction: TiltDirection) => void): void {
    this.onTilt = onTilt;
    this.gate.reset();
    this.running = true;
  }

  /** ტესტისთვის — დახრის ხელით მიწოდება, სენსორის გარეშე. */
  feed(z: number, now: number): void {
    if (!this.running) return;
    const direction = this.gate.feed(z, now);
    if (direction) this.onTilt?.(direction);
  }

  lockAfterManualInput(): void {
    this.gate.lockAfterManualInput(Date.now() / 1000);
  }
  recalibrate(): void {
    this.gate.reset();
  }
  stop(): void {
    this.running = false;
    this.onTilt = null;
  }
  pause(): void {
    this.running = false;
  }
  resume(): void {
    this.gate.reset();
    this.running = this.onTilt !== null;
  }
}
