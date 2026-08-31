import { DeviceMotion } from 'expo-sensors';
import type { EventSubscription } from 'expo-modules-core';
import { TiltGate, type TiltDirection } from './tiltGate';

/** დედამიწის აჩქარება — m/s² → G. */
const G = 9.81;

/**
 * შუბლზე დაჭერილი ტელეფონის დახრის მკითხველი — შარადებისა და „ვინ ვარ მე?“-ს საერთო.
 *
 * პორტი: `Splash/Core/TiltSensor.swift`. კლასი მხოლოდ სენსორის მილია;
 * მთელი გადაწყვეტილება `TiltGate`-შია, რომ ტელეფონის გარეშეც შემოწმდეს.
 *
 * **ერთი განსხვავება iOS-თან.** `CoreMotion` გრავიტაციას ცალკე გამოყოფილს
 * აძლევდა (`data.gravity.z`, უკვე G-ებში). `expo-sensors` მას პირდაპირ არ
 * იძლევა, ამიტომ ვიანგარიშებთ:
 *
 *     gravity = (accelerationIncludingGravity − acceleration) / 9.81
 *
 * თუ `acceleration` მიუწვდომელია (ზოგი Android მოწყობილობა), დაბალსიხშირული
 * ფილტრით ვაცალკევებთ — ნელი ცვლილება გრავიტაციაა, სწრაფი კი ხელის მოძრაობა.
 */
export class TiltSensor {
  private gate = new TiltGate();
  private subscription: EventSubscription | null = null;
  private onTilt: ((direction: TiltDirection) => void) | null = null;
  /** დაბალსიხშირული ფილტრის მდგომარეობა — მხოლოდ სათადარიგო გზისთვის. */
  private lowPass: number | null = null;

  get isCalibrating(): boolean {
    return this.gate.isCalibrating;
  }

  static async isAvailable(): Promise<boolean> {
    try {
      return await DeviceMotion.isAvailableAsync();
    } catch {
      return false;
    }
  }

  /** დახრის კითხვის დაწყება. `onTilt` ყოველ ჩათვლილ დახრაზე ერთხელ იძახება. */
  start(onTilt: (direction: TiltDirection) => void): void {
    this.stop();
    this.onTilt = onTilt;
    this.gate.reset();
    this.lowPass = null;

    DeviceMotion.setUpdateInterval(1000 / 60);
    this.subscription = DeviceMotion.addListener((data) => {
      const withGravity = data.accelerationIncludingGravity;
      if (!withGravity) return;

      let z: number;
      if (data.acceleration) {
        z = (withGravity.z - data.acceleration.z) / G;
      } else {
        // სათადარიგო გზა: ნელი შემადგენელი გრავიტაციაა.
        const raw = withGravity.z / G;
        this.lowPass = this.lowPass === null ? raw : this.lowPass + 0.1 * (raw - this.lowPass);
        z = this.lowPass;
      }

      const now = Date.now() / 1000;
      const direction = this.gate.feed(z, now);
      if (direction) this.onTilt?.(direction);
    });
  }

  /** ხელით დაფიქსირების შემდეგ — რომ იმავე მოძრაობამ სენსორითაც არ ჩათვალოს. */
  lockAfterManualInput(): void {
    this.gate.lockAfterManualInput(Date.now() / 1000);
  }

  /** ფონიდან დაბრუნებისას — პირადი ნული თავიდან იზომება. */
  recalibrate(): void {
    this.gate.reset();
    this.lowPass = null;
  }

  stop(): void {
    this.subscription?.remove();
    this.subscription = null;
    this.onTilt = null;
  }

  /** აპი ფონში გავიდა — სენსორი ჩერდება, პასუხი კი შენარჩუნებულია. */
  pause(): void {
    this.subscription?.remove();
    this.subscription = null;
  }

  /** აპი დაბრუნდა — ნული თავიდან იზომება, რადგან ტელეფონი სხვა კუთხითაა. */
  resume(): void {
    const handler = this.onTilt;
    if (!handler || this.subscription) return;
    this.start(handler);
  }
}
