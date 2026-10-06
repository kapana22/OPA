/** Development-only startup measurements; no storage or network writes. */
interface NativeStartupTiming {
  startTime?: number | null;
  initializeRuntimeStart?: number | null;
  executeJavaScriptBundleEntryPointStart?: number | null;
  endTime?: number | null;
}
interface StartupReport {
  recordedAt: string;
  marks: Record<string, number>;
  native?: NativeStartupTiming;
}
const report: StartupReport = { recordedAt: new Date().toISOString(), marks: {} };
const started = performance.now();

export function recordStartupTiming(stage: string): void {
  if (!__DEV__) return;
  report.marks[stage] = Math.round(performance.now() - started);
  const native = (performance as typeof performance & { rnStartupTiming?: NativeStartupTiming }).rnStartupTiming;
  if (native) {
    report.native = {
      startTime: native.startTime,
      initializeRuntimeStart: native.initializeRuntimeStart,
      executeJavaScriptBundleEntryPointStart: native.executeJavaScriptBundleEntryPointStart,
      endTime: native.endTime,
    };
  }
  (globalThis as typeof globalThis & { __OPA_STARTUP__?: StartupReport }).__OPA_STARTUP__ = report;
  if (stage === 'homeVisible') console.info('[OPA startup]', JSON.stringify(report));
}
