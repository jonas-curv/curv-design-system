"use client";
import * as React from "react";

/** Hide the dock only while the software keyboard consumes the visual viewport. */
export function useSoftwareKeyboard() {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const input = document.activeElement;
      const editing = input instanceof HTMLElement && (input.matches("input,textarea") || input.isContentEditable);
      setVisible(Boolean(editing && viewport && window.innerHeight - viewport.height > 140));
    };
    viewport?.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => { viewport?.removeEventListener("resize", update); document.removeEventListener("focusin", update); document.removeEventListener("focusout", update); };
  }, []);
  return visible;
}

/** How far the software keyboard covers the layout viewport, in px. 0 when it is closed. */
const readKeyboardInset = () => {
  const viewport = window.visualViewport;
  const input = document.activeElement;
  const editing = input instanceof HTMLElement && (input.matches("input,textarea") || input.isContentEditable);
  if (!editing || !viewport || window.innerHeight - viewport.height <= 140) return 0;
  return Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
};
const subscribeKeyboardInset = (notify: () => void) => {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", notify);
  viewport?.addEventListener("scroll", notify);
  document.addEventListener("focusin", notify);
  document.addEventListener("focusout", notify);
  return () => { viewport?.removeEventListener("resize", notify); viewport?.removeEventListener("scroll", notify); document.removeEventListener("focusin", notify); document.removeEventListener("focusout", notify); };
};
/** For bars that hold their own text field: they ride above the keyboard instead of hiding behind it. */
export function useKeyboardInset() {
  return React.useSyncExternalStore(subscribeKeyboardInset, readKeyboardInset, () => 0);
}

export type MobileConnection = "online" | "offline" | "restored";
/** Offline and restored notices. A restored connection is not proof of a refresh. */
export function useConnectionStatus() {
  const [connection, setConnection] = React.useState<MobileConnection>("online");
  React.useEffect(() => {
    const offline = () => setConnection("offline");
    const online = () => setConnection(current => current === "offline" ? "restored" : current);
    if (!navigator.onLine) offline();
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => { window.removeEventListener("offline", offline); window.removeEventListener("online", online); };
  }, []);
  return [connection, React.useCallback(() => setConnection("online"), [])] as const;
}
export function MobileConnectionNotice({ connection, onRefresh, onDismiss }: { connection: MobileConnection; onRefresh?: () => void; onDismiss: () => void }) {
  if (connection === "online") return null;
  return <div className="curv-mobile-connection" role="status">
    <span>{connection === "offline" ? "Offline. Loaded information may be out of date." : "Connection restored. Refresh for current information."}</span>
    {connection === "restored" && <span className="curv-mobile-connection-actions">{onRefresh && <button type="button" onClick={onRefresh}>Refresh view</button>}<button type="button" aria-label="Dismiss connection notice" onClick={onDismiss}>Dismiss</button></span>}
  </div>;
}

/**
 * True while the person is reading down the page. One passive window listener, read
 * once per frame, and state only changes when the answer does, so scrolling never
 * re-renders. Back at the top (24px) and any upward movement restore it.
 */
export function useScrollCollapse(enabled: boolean) {
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    if (!enabled) return;
    let last = Math.max(0, window.scrollY);
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      if (y <= 24) { last = y; setCollapsed(false); return; }
      const delta = y - last;
      if (Math.abs(delta) < 4) return;
      last = y;
      setCollapsed(delta > 0);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(read); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, [enabled]);
  const expand = React.useCallback(() => setCollapsed(false), []);
  return [enabled && collapsed, expand] as const;
}
