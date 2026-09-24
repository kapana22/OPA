import { describe, it, expect } from 'vitest';
import { TiltGate, type TiltDirection } from '../src/core/tiltGate';

/**
 * პორტი: `Tools/tests/tilt/main.swift` — იგივე რვა შემთხვევა, იგივე ზღვრები.
 * ესენი ცოცხალ თამაშში დაფიქსირებული ხარვეზებია, არა თეორიული სცენარები.
 */

const HZ = 60;

/** სტენდი — Swift-ის `Rig`-ის ზუსტი ანალოგი. */
class Rig {
  gate = new TiltGate();
  t = 1000;
  z = 0;
  fired: TiltDirection[] = [];

  private step(v: number) {
    this.z = v;
    const d = this.gate.feed(this.z, this.t);
    if (d) this.fired.push(d);
    this.t += 1 / HZ;
  }

  hold(v: number, seconds: number) {
    const frames = Math.floor(seconds * HZ);
    for (let i = 0; i < frames; i++) this.step(v);
  }

  sweep(target: number, seconds: number) {
    const f = Math.max(1, Math.floor(seconds * HZ));
    const from = this.z;
    for (let i = 1; i <= f; i++) this.step(from + ((target - from) * i) / f);
  }

  /** პირადი ნულის დაფიქსირება და მრიცხველის გასუფთავება. */
  settle(baseline = 0) {
    this.z = baseline;
    this.hold(baseline, 0.8);
    this.fired = [];
  }
}

describe('TiltGate', () => {
  it('1. წინ დახრა + მკვეთრი დაბრუნება = ერთი პასუხი', () => {
    const r = new Rig();
    r.settle();
    r.sweep(0.9, 0.2);
    r.hold(0.9, 0.2);
    r.sweep(-0.85, 0.3);
    r.sweep(0.0, 0.2);
    expect(r.fired).toEqual(['forward']);
  });

  it('2. სამი განზრახ დახრა = სამი პასუხი', () => {
    const r = new Rig();
    r.settle();
    for (let i = 0; i < 3; i++) {
      r.sweep(0.85, 0.2);
      r.hold(0.85, 0.15);
      r.sweep(0.0, 0.2);
      r.hold(0.0, 0.3);
    }
    expect(r.fired).toEqual(['forward', 'forward', 'forward']);
  });

  it('3. უკან დახრა + გადაჭარბებული დაბრუნება = ერთი პასუხი', () => {
    const r = new Rig();
    r.settle();
    r.sweep(-0.85, 0.2);
    r.hold(-0.85, 0.2);
    r.sweep(0.35, 0.25);
    r.sweep(0.0, 0.2);
    expect(r.fired).toEqual(['back']);
  });

  it('4. სიცილში რხევა პასუხს არ წერს', () => {
    const r = new Rig();
    r.settle();
    for (let i = 0; i < 180; i++) r.sweep(Math.sin(i * 0.8) * 0.8, 1 / HZ);
    expect(r.fired).toEqual([]);
  });

  it('5. პირადი ნული — გადახრილად დაჭერა თავისთავად პასუხს არ წერს', () => {
    const r = new Rig();
    r.settle(0.3);
    r.hold(0.3, 1.0);
    expect(r.fired).toEqual([]);

    r.sweep(0.95, 0.2);
    r.hold(0.95, 0.15);
    expect(r.fired).toEqual(['forward']);
  });

  it('6. ღილაკზე დაჭერის შემდეგ იგივე დახრა აღარ ითვლება', () => {
    const r = new Rig();
    r.settle();
    r.sweep(0.8, 0.15);
    r.gate.lockAfterManualInput(r.t);
    r.hold(0.8, 0.4);
    r.sweep(0.0, 0.2);
    expect(r.fired).toEqual([]);
  });

  it('7. ზღვარამდე მიუღწეველი ყოყმანი არ ითვლება', () => {
    const r = new Rig();
    r.settle();
    for (let i = 0; i < 4; i++) {
      r.sweep(0.45, 0.15);
      r.sweep(0.0, 0.15);
    }
    expect(r.fired).toEqual([]);
  });

  it('8. სწრაფ ტემპში 8 დახრა = 8 სწორი პასუხი', () => {
    const r = new Rig();
    r.settle();
    for (let i = 0; i < 8; i++) {
      const forward = i % 3 !== 2;
      const v = forward ? 0.9 : -0.9;
      r.sweep(v, 0.14);
      r.hold(v, 0.12);
      r.sweep(0.0, 0.14);
      r.hold(0.0, 0.26);
    }
    const want = Array.from({ length: 8 }, (_, i) => (i % 3 !== 2 ? 'forward' : 'back'));
    expect(r.fired).toEqual(want);
  });

  it('9. 1 წმ დახრილად დაყოვნება + ვერტიკალის გადაცდენა = ერთი პასუხი', () => {
    for (const holdFor of [0.3, 1, 2]) {
      const r = new Rig();
      r.settle();
      r.sweep(0.8, 0.2);
      r.hold(0.8, holdFor);
      r.sweep(-0.3, 0.25);
      r.hold(-0.3, 0.3);
      r.sweep(0.0, 0.3);
      r.hold(0.0, 1);
      expect(r.fired).toEqual(['forward']);
    }
  });
});
