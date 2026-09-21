/**
 * გამეორებადი ტაიმერი.
 *
 * Swift-ში `Timer.scheduledTimer(withTimeInterval:repeats:)` იყო და
 * `deinit`-ში `invalidate()`. RN-ში `setInterval`-ია, გაჩერება კი ცხადი უნდა
 * იყოს — ძრავი ეკრანზე აღარაა, ტაიმერი კი კიდევ ტკაცუნებს, თუ არ გავაჩერეთ.
 */
/**
 * თამაშის საერთო პაუზა — ყველა `Ticker` ერთად ჩერდება.
 *
 * გასვლის დიალოგის გახსნისას და აპის ფონზე გადასვლისას ტაიმერი აქამდე
 * მიდიოდა: ბომბი დიალოგის უკან ფეთქდებოდა, ალიასის ჯერი ფონზე იწურებოდა.
 * რამდენიმე მიზეზი ერთდროულად შეიძლება იყოს, ამიტომ ნაკრებია და არა ალამი.
 */
const holds = new Set<string>();

export const GamePause = {
  get isPaused(): boolean {
    return holds.size > 0;
  },
  hold(reason: string): void {
    holds.add(reason);
  },
  release(reason: string): void {
    holds.delete(reason);
  },
};

export class Ticker {
  private handle: ReturnType<typeof setInterval> | null = null;

  get isRunning(): boolean {
    return this.handle !== null;
  }

  /** გაშვება. თუ უკვე მუშაობს — ჯერ ჩერდება. */
  start(intervalSeconds: number, onTick: () => void): void {
    this.stop();
    // პაუზისას ტიკი უბრალოდ გამოტოვდება — ათვლა იქვე ჩერდება, საიდანაც გაჩერდა.
    this.handle = setInterval(() => {
      if (!GamePause.isPaused) onTick();
    }, Math.max(1, intervalSeconds * 1000));
  }

  stop(): void {
    if (this.handle !== null) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }
}
