/**
 * დახრის გადაწყვეტილების წმინდა ლოგიკა — სენსორის გარეშე.
 *
 * პორტი: `Splash/Core/TiltGate.swift`, ერთი-ერთზე. `TiltSensor` მხოლოდ
 * სენსორის მილია; მთელი „ითვლება თუ არა ეს დახრა“ აქ წყდება, რომ ტესტირებადი
 * იყოს ტელეფონის გარეშე.
 *
 * **რას ასწორებს გულუბრყვილო ლოგიკასთან შედარებით:**
 * 1. **დაბრუნება ითვლებოდა მეორე პასუხად** → ნეიტრალში *დაყოვნება* სჭირდება.
 * 2. **პაუზა არ არსებობდა** → ყოველ ჩათვლას მოსდევს მოკლე ბლოკი.
 * 3. **ნული ყველასთვის ერთი იყო** → დაწყებისას იზომება *პირადი ნული*.
 * 4. **რხევა ერეოდა** → დახრა *მდგრადი* უნდა იყოს და სიგნალი გლუვდება.
 */

export type TiltDirection = 'forward' | 'back';
export type TiltState = 'calibrating' | 'ready' | 'held';

export class TiltGate {
  // MARK: - ზღვრები

  /** რამდენად უნდა გადაიხაროს ტელეფონი პირადი ნულიდან (≈35°). */
  triggerLevel = 0.58;
  /** რომელ დერეფანს ვთვლით „ისევ შუბლზეა“-დ (≈14°). */
  neutralLevel = 0.25;
  /** რამდენ ზედიზედ კადრს უნდა გაუძლოს დახრამ (60 Hz-ზე ≈ 80 მწმ). */
  triggerHold = 5;
  /** რამდენ ზედიზედ კადრს უნდა დარჩეს ნეიტრალში, სანამ ისევ ჩაითვლება (≈ 200 მწმ). */
  neutralHold = 12;
  /** ჩათვლის შემდეგ სენსორი ამდენ ხანს ყრუა (წამი). */
  cooldown = 0.45;
  /** რამდენ კადრს ვზომავთ პირად ნულს დაწყებისას (≈ 330 მწმ). */
  calibrationSamples = 20;
  /** გლუვება — მაღალი მნიშვნელობა უფრო სწრაფია, დაბალი უფრო მშვიდი. */
  smoothing = 0.28;

  // MARK: - მდგომარეობა

  private _state: TiltState = 'calibrating';
  private _baseline = 0;

  private calibrationSum = 0;
  private calibrationCount = 0;
  private smoothed = 0;
  private hasSignal = false;
  private triggerFrames = 0;
  private neutralFrames = 0;
  private blockedUntil = -Number.MAX_VALUE;

  get state(): TiltState {
    return this._state;
  }
  get baseline(): number {
    return this._baseline;
  }
  get isCalibrating(): boolean {
    return this._state === 'calibrating';
  }

  /** ყველაფრის განულება — ჯერის დაწყებისას და ფონიდან დაბრუნებისას. */
  reset(): void {
    this._state = 'calibrating';
    this._baseline = 0;
    this.calibrationSum = 0;
    this.calibrationCount = 0;
    this.smoothed = 0;
    this.hasSignal = false;
    this.triggerFrames = 0;
    this.neutralFrames = 0;
    this.blockedUntil = -Number.MAX_VALUE;
  }

  /**
   * ხელით დაფიქსირების შემდეგ — რომ იმავე მოძრაობამ სენსორითაც არ ჩათვალოს.
   * ღილაკზე დაჭერისას ტელეფონი ხშირად უკვე დახრილია; ამის გარეშე იმავე წამში
   * მეორე სიტყვაც იწვება.
   */
  lockAfterManualInput(now: number): void {
    if (this._state === 'calibrating') return;
    this.triggerFrames = 0;
    this.neutralFrames = 0;
    this.blockedUntil = now + this.cooldown;
    this._state = 'held';
  }

  /**
   * ერთი კადრი სენსორიდან.
   *
   * @param z გრავიტაციის z — ეკრანი მიწისკენ → +1, ცისკენ → −1, ვერტიკალურად → 0.
   * @param now მიმდინარე დრო წამებში.
   * @returns მიმართულება, თუ ეს კადრი პასუხად ჩაითვალა.
   */
  feed(z: number, now: number): TiltDirection | null {
    // გლუვება — ერთი ხტუნვა პასუხად აღარ ითვლება.
    if (this.hasSignal) {
      this.smoothed += this.smoothing * (z - this.smoothed);
    } else {
      this.smoothed = z;
      this.hasSignal = true;
    }

    if (this._state === 'calibrating') {
      this.calibrate();
      return null;
    }

    const delta = this.smoothed - this._baseline;

    // ჩათვლის შემდგომი პაუზა — ამ დროს არაფერი ითვლება, მაგრამ ნეიტრალში
    // დაბრუნებას უკვე ვაკვირდებით.
    if (now < this.blockedUntil) {
      this.triggerFrames = 0;
      this.neutralFrames = Math.abs(delta) < this.neutralLevel ? this.neutralFrames + 1 : 0;
      return null;
    }

    if (this._state === 'ready') {
      if (Math.abs(delta) <= this.triggerLevel) {
        this.triggerFrames = 0;
        return null;
      }
      this.triggerFrames += 1;
      if (this.triggerFrames < this.triggerHold) return null;
      this.triggerFrames = 0;
      this.neutralFrames = 0;
      this.blockedUntil = now + this.cooldown;
      this._state = 'held';
      return delta > 0 ? 'forward' : 'back';
    }

    // 'held' — მთავარი შესწორება: ვერტიკალის ჩაქროლება არ კმარა, უნდა დაყოვნდეს.
    if (Math.abs(delta) < this.neutralLevel) {
      this.neutralFrames += 1;
      if (this.neutralFrames >= this.neutralHold) {
        this.neutralFrames = 0;
        this.triggerFrames = 0;
        this._state = 'ready';
      }
    } else {
      this.neutralFrames = 0;
    }
    return null;
  }

  // MARK: - შიდა

  private calibrate(): void {
    this.calibrationSum += this.smoothed;
    this.calibrationCount += 1;
    if (this.calibrationCount < this.calibrationSamples) return;

    const measured = this.calibrationSum / this.calibrationCount;
    // ტელეფონი უკვე ძლიერ დახრილი იყო გაზომვისას? მაშინ პირად ნულს არ ვენდობით,
    // თორემ თამაშის მთელი დერეფანი გვერდზე გადაიწევს.
    this._baseline = Math.min(Math.max(measured, -0.35), 0.35);
    this.calibrationSum = 0;
    this.calibrationCount = 0;
    this.triggerFrames = 0;
    this.neutralFrames = 0;
    this._state = 'ready';
  }
}
