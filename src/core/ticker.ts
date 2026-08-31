/**
 * გამეორებადი ტაიმერი.
 *
 * Swift-ში `Timer.scheduledTimer(withTimeInterval:repeats:)` იყო და
 * `deinit`-ში `invalidate()`. RN-ში `setInterval`-ია, გაჩერება კი ცხადი უნდა
 * იყოს — ძრავი ეკრანზე აღარაა, ტაიმერი კი კიდევ ტკაცუნებს, თუ არ გავაჩერეთ.
 */
export class Ticker {
  private handle: ReturnType<typeof setInterval> | null = null;

  get isRunning(): boolean {
    return this.handle !== null;
  }

  /** გაშვება. თუ უკვე მუშაობს — ჯერ ჩერდება. */
  start(intervalSeconds: number, onTick: () => void): void {
    this.stop();
    this.handle = setInterval(onTick, Math.max(1, intervalSeconds * 1000));
  }

  stop(): void {
    if (this.handle !== null) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }
}
