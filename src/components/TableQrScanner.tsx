"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { slugify } from "@/config/restaurants";
import { verifyQRToken } from "@/services/api";

function tokenFromScan(value: string) {
  const raw = value.trim();
  try {
    const match = new URL(raw).pathname.match(/^\/(?:qr|v)\/([^/]+)\/?$/i);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return /^[A-Za-z0-9_-]{8,}$/.test(raw) ? raw : null;
  }
}

export default function TableQrScanner({ open, onClose }: { open: boolean; onClose: () => void }) {
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const handlingRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "scanning" | "verifying">("starting");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      setStatus("starting"); setError(""); handlingRef.current = false;
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode("table-qr-reader");
        scannerRef.current = scanner;
        await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 }, async (decodedText) => {
          if (handlingRef.current) return;
          const token = tokenFromScan(decodedText);
          if (!token) { setError("This is not a Yummy table QR code."); return; }
          handlingRef.current = true; setStatus("verifying"); setError("");
          try {
            const context = await verifyQRToken(token);
            if (!context) throw new Error("This table QR is invalid or has expired.");
            const activeOrderTotal = (context.active_orders || []).reduce((sum, order) => sum + Number(order.grand_total ?? order.total ?? 0), 0);
            localStorage.setItem("yummy_qr_session", JSON.stringify({ restaurantId: context.restaurant_id, restaurantName: context.restaurant_name, tableId: context.table_id, tableName: context.table_name, qrToken: context.token, orderedItems: context.ordered_items, activeOrderTotal, activeOrderIds: (context.active_orders || []).map((order) => order.id), startTime: Date.now() }));
            window.dispatchEvent(new Event("yummy_qr_session_updated"));
            await scanner.stop(); scanner.clear(); scannerRef.current = null;
            window.location.assign(`/${context.restaurant_id}/${slugify(context.restaurant_name || "restaurant")}?view=menu`);
          } catch (scanError) {
            handlingRef.current = false; setStatus("scanning"); setError(scanError instanceof Error ? scanError.message : "Could not connect to this table.");
          }
        }, () => undefined);
        if (!cancelled) setStatus("scanning");
      } catch {
        if (!cancelled) setError("Camera access is unavailable. Allow camera permission and try again.");
      }
    };

    void start();
    return () => { cancelled = true; const scanner = scannerRef.current; scannerRef.current = null; if (scanner) void scanner.stop().catch(() => undefined).finally(() => scanner.clear()); };
  }, [open]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[80] grid place-items-end bg-black/70 p-0 sm:place-items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="table-scanner-title"><section className="w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl"><div className="flex items-start justify-between gap-4"><div><h2 id="table-scanner-title" className="font-display text-xl font-semibold text-stone-950">Scan Table QR</h2><p className="mt-1 text-sm text-stone-600">Point the camera at the QR code on your table.</p></div><button type="button" onClick={onClose} aria-label="Close scanner" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><X className="h-5 w-5" aria-hidden="true" /></button></div><div className="relative mt-5 aspect-square overflow-hidden rounded-2xl bg-stone-950"><div id="table-qr-reader" className="h-full w-full" />{status !== "scanning" && <div className="absolute inset-0 grid place-items-center bg-stone-950/80 text-white"><div className="text-center">{status === "verifying" ? <Loader2 className="mx-auto h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Camera className="mx-auto h-8 w-8" aria-hidden="true" />}<p className="mt-3 text-sm">{status === "verifying" ? "Connecting to table…" : "Starting camera…"}</p></div></div>}</div>{error && <p className="mt-4 text-sm font-medium text-red-700" role="alert">{error}</p>}</section></div>;
}
