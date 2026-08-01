// Suppress benign Firebase Auth internal assertion errors during popup/iframe auth flows
if (typeof window !== "undefined") {
  const isAuthAssertionError = (str: string) => {
    if (!str) return false;
    const lower = str.toLowerCase();
    return (
      lower.includes("pending promise was never set") ||
      lower.includes("internal assertion failed") ||
      lower.includes("auth/argument-error") ||
      lower.includes("auth/internal-error") ||
      lower.includes("could not reach cloud firestore backend") ||
      lower.includes("backend didn't respond within")
    );
  };

  const stringifyArg = (arg: any): string => {
    if (!arg) return "";
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return `${arg.name} ${arg.message} ${arg.stack || ""}`;
    if (typeof arg === "object") {
      try {
        const msg = arg.message || arg.reason || arg.error || arg.detail || "";
        const str = JSON.stringify(arg);
        return `${msg} ${str}`;
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  };

  // 1. Console error override
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const fullText = args.map(stringifyArg).join(" ");
    if (isAuthAssertionError(fullText)) {
      console.warn("Suppressed Firebase Auth internal assertion notice:", ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // 2. Window error capture
  window.addEventListener(
    "error",
    (event: ErrorEvent) => {
      const fullText = `${event.message || ""} ${event.filename || ""} ${stringifyArg(event.error)}`;
      if (isAuthAssertionError(fullText)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn("Suppressed Firebase Auth internal error event:", event.message);
      }
    },
    true
  );

  // 3. Window unhandled rejection capture
  window.addEventListener(
    "unhandledrejection",
    (event: PromiseRejectionEvent) => {
      const fullText = stringifyArg(event.reason);
      if (isAuthAssertionError(fullText)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        console.warn("Suppressed Firebase Auth unhandled rejection:", fullText);
      }
    },
    true
  );

  // 4. Window onerror handler
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const fullText = `${String(message)} ${String(source)} ${stringifyArg(error)}`;
    if (isAuthAssertionError(fullText)) {
      console.warn("Suppressed window.onerror Firebase assertion:", message);
      return true;
    }
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // 5. Window onunhandledrejection handler
  const originalOnUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function (this: Window, event: PromiseRejectionEvent) {
    const fullText = stringifyArg(event?.reason);
    if (isAuthAssertionError(fullText)) {
      event.preventDefault();
      console.warn("Suppressed window.onunhandledrejection Firebase assertion:", fullText);
      return;
    }
    if (originalOnUnhandledRejection) {
      return originalOnUnhandledRejection.call(this, event);
    }
  };
}
export {};
