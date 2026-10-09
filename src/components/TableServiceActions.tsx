"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Check, CircleDollarSign, GlassWater, Loader2, UtensilsCrossed } from "lucide-react";
import { createTableServiceRequest, getTableServiceRequests, TableServiceRequest } from "@/services/api";

const actions = [
  { type: "call_waiter", label: "Call Waiter", icon: BellRing },
  { type: "request_bill", label: "Request Bill", icon: CircleDollarSign },
  { type: "water", label: "Water", icon: GlassWater },
  { type: "cutlery", label: "Cutlery", icon: UtensilsCrossed },
];
const REQUEST_COOLDOWN_MS = 5 * 60 * 1000;

export default function TableServiceActions({ restaurantId }: { restaurantId?: number }) {
  const [token, setToken] = useState<string | null>(null);
  const [requests, setRequests] = useState<TableServiceRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [lastSentAt, setLastSentAt] = useState<Record<string, number>>({});
  const requestInFlight = useRef(false);
  const pollInFlight = useRef(false);

  useEffect(() => {
    const load = () => {
      const raw = localStorage.getItem("yummy_qr_session");
      try {
        const session = raw ? JSON.parse(raw) : null;
        const nextToken = session && (!restaurantId || session.restaurantId === restaurantId) ? session.qrToken : null;
        setToken(nextToken || null);
        setRequests([]); setLastSentAt({});
      } catch { setToken(null); }
    };
    load();
    window.addEventListener("yummy_qr_session_updated", load);
    return () => window.removeEventListener("yummy_qr_session_updated", load);
  }, [restaurantId]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const refresh = async () => {
      if (pollInFlight.current || document.visibilityState !== "visible") return;
      pollInFlight.current = true;
      try {
        const nextRequests = await getTableServiceRequests(token);
        if (!cancelled) setRequests(nextRequests);
      } catch {
        // Keep the last successful state while polling.
      } finally {
        pollInFlight.current = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [token]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!token) return null;

  const request = async (type: string) => {
    const activeRequest = requests.find((item) => item.request_type === type && item.status !== "completed");
    const sentAt = lastSentAt[type] ?? (activeRequest ? new Date(activeRequest.created_at).getTime() : 0);
    if (requestInFlight.current || now - sentAt < REQUEST_COOLDOWN_MS) return;
    requestInFlight.current = true;
    setBusy(type); setError("");
    try {
      const item = await createTableServiceRequest(token, type);
      setLastSentAt((current) => ({ ...current, [type]: Date.now() }));
      setRequests((current) => [item, ...current.filter((entry) => entry.id !== item.id)]);
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || "Could not notify the restaurant.");
    } finally { requestInFlight.current = false; setBusy(null); }
  };

  return (
    <section id="table-service" className="mb-5 scroll-mt-24 overflow-hidden rounded-2xl bg-white border border-stone-200 text-stone-950" aria-labelledby="table-help-title">
      <div className="flex flex-col gap-2 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-500/15 text-orange-600"><BellRing className="h-4 w-4" aria-hidden="true" /></span><div><h2 id="table-help-title" className="font-display text-sm font-semibold">Need something?</h2><p className="mt-0.5 text-xs text-stone-500">Send a request directly to the floor team.</p></div></div>
        {requests[0] && <span aria-live="polite" className="text-xs font-medium text-stone-500">{requests[0].status === 'acknowledged' ? 'The team has seen your request.' : requests[0].status === 'completed' ? 'Your latest request is complete.' : 'Request sent. Waiting for the team.'}</span>}
      </div>
      <div className="grid grid-cols-2 border-t border-stone-100 sm:grid-cols-4">
        {actions.map(({ type, label, icon: Icon }) => {
          const activeRequest = requests.find((item) => item.request_type === type && item.status !== "completed");
          const sentAt = lastSentAt[type] ?? (activeRequest ? new Date(activeRequest.created_at).getTime() : 0);
          const remainingSeconds = Math.max(0, Math.ceil((REQUEST_COOLDOWN_MS - (now - sentAt)) / 1000));
          const coolingDown = remainingSeconds > 0;
          const countdown = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`;
          return <button key={type} type="button" disabled={busy !== null || coolingDown} onClick={() => request(type)} className={`flex min-h-14 items-center justify-center gap-2 border-r border-stone-100 px-2 text-xs font-semibold tabular-nums transition-colors last:border-r-0 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm ${activeRequest ? "text-orange-700" : "text-stone-700"}`}>
            {busy === type ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : coolingDown ? <Check aria-hidden="true" className="h-4 w-4" /> : <Icon aria-hidden="true" className="h-4 w-4 text-orange-600" />}{coolingDown ? `${label} · ${countdown}` : activeRequest ? `Remind: ${label}` : label}
          </button>;
        })}
      </div>
      {error && <p role="alert" className="border-t border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
