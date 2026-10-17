"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { CheckCircle2, Download, Loader2, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { startCustomerFonepayCheckout, verifyCustomerFonepayCheckout } from "@/services/api";
import type { CustomerFonepayCheckout as CustomerFonepayCheckoutData } from "@/services/api";
import { useDialog } from "@/lib/useDialog";

const money = (amount: number) => new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 2 }).format(amount);
const errorMessage = (error: any, fallback: string) => error?.response?.data?.detail || error?.response?.data?.message || error?.message || fallback;

function providerImage(value?: string) {
  const image = value?.trim();
  if (!image) return null;
  if (image.startsWith("data:") || image.startsWith("http")) return image;
  return `data:image/png;base64,${image}`;
}

export default function CustomerFonepayCheckout({ open, qrToken, onClose, onPaid }: { open: boolean; qrToken: string; onClose: () => void; onPaid: () => Promise<void> }) {
  const [checkout, setCheckout] = useState<CustomerFonepayCheckoutData | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkoutToken = useRef("");
  const createRequest = useRef<{ token: string; promise: Promise<CustomerFonepayCheckoutData> } | null>(null);
  const verifyInFlight = useRef(false);
  const dialogRef = useDialog(open, onClose);

  useEffect(() => {
    if (!open || !qrToken) return;
    let cancelled = false;
    checkoutToken.current = qrToken;
    setLoading(true); setError(""); setCheckout(null); setQrImage(null);
    const request = createRequest.current?.token === qrToken
      ? createRequest.current.promise
      : startCustomerFonepayCheckout(qrToken);
    createRequest.current = { token: qrToken, promise: request };
    void request
      .then(async (result) => {
        if (cancelled) return;
        setCheckout(result);
        const suppliedImage = providerImage(result.qr_payload.qrImage);
        const image = suppliedImage || (result.qr_payload.qrMessage ? await QRCode.toDataURL(result.qr_payload.qrMessage, { width: 360, margin: 2, errorCorrectionLevel: "M" }) : null);
        if (!cancelled) setQrImage(image);
      })
      .catch((requestError) => {
        if (createRequest.current?.promise === request) createRequest.current = null;
        if (!cancelled) setError(errorMessage(requestError, "Could not start Fonepay checkout."));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, qrToken]);

  useEffect(() => {
    if (open) return;
    createRequest.current = null;
    setCheckout(null); setQrImage(null); setError("");
  }, [open]);

  const verify = useCallback(async (silent = false) => {
    if (!checkout?.prn || !checkoutToken.current || verifyInFlight.current) return;
    verifyInFlight.current = true;
    if (!silent) { setChecking(true); setError(""); }
    try {
      const result = await verifyCustomerFonepayCheckout(checkout.prn, checkoutToken.current);
      setCheckout((current) => current ? { ...current, status: result.status, amount: result.amount } : current);
      if (result.is_success) await onPaid();
      else if (result.status === "review_required") setError("Payment was received but needs restaurant review before this bill can close.");
      else if (result.is_terminal) setError(result.message || "This Fonepay checkout is no longer active.");
    } catch (requestError) {
      if (!silent) setError(errorMessage(requestError, "Could not check the payment yet."));
    } finally {
      verifyInFlight.current = false;
      if (!silent) setChecking(false);
    }
  }, [checkout?.prn, onPaid]);

  useEffect(() => {
    if (!open || !checkout?.prn || checkout.status !== "pending") return;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void verify(true); }, 5000);
    return () => window.clearInterval(timer);
  }, [checkout?.prn, checkout?.status, open, verify]);

  const downloadQr = () => {
    if (!qrImage || !checkout) return;
    const link = document.createElement("a");
    link.href = qrImage; link.download = `fonepay-order-${checkout.order_id}.png`; link.click();
  };

  if (!open) return null;
  const paid = checkout?.status === "success";
  const pending = checkout?.status === "pending";

  return <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
    <button type="button" aria-label="Close Fonepay checkout" className="absolute inset-0 bg-stone-950/75 backdrop-blur-sm" onClick={onClose} />
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="fonepay-checkout-title" className="relative max-h-[94dvh] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-[1.75rem] bg-white shadow-2xl">
      <button type="button" onClick={onClose} aria-label="Close Fonepay checkout" className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><X className="h-5 w-5" aria-hidden="true" /></button>
      <header className="border-b border-stone-200 px-6 py-6 pr-20 sm:px-8"><p className="flex items-center gap-2 text-sm font-semibold text-orange-700"><ShieldCheck className="h-4 w-4" aria-hidden="true" />Secure Fonepay payment</p><h2 id="fonepay-checkout-title" className="mt-2 font-display text-2xl font-semibold text-stone-950">Pay your table bill</h2><p className="mt-1 text-sm leading-6 text-stone-600">Scan the QR in your banking or wallet app. This page checks the payment automatically.</p></header>
      {loading ? <div role="status" className="flex min-h-80 items-center justify-center gap-3 text-sm text-stone-600"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Preparing your secure QR...</div> : error && !checkout ? <div className="p-6 sm:p-8"><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p><button type="button" onClick={onClose} className="mt-4 min-h-12 w-full rounded-xl bg-stone-950 px-5 font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Return to your order</button></div> : checkout ? <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col items-center border-b border-stone-200 bg-stone-50 p-6 text-center sm:p-8 lg:border-b-0 lg:border-r"><p className="text-sm text-stone-500">Amount due</p><p className="mt-1 font-display text-3xl font-semibold tabular-nums text-stone-950">{money(checkout.amount)}</p>{qrImage && !paid ? <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-3"><Image src={qrImage} alt={`Fonepay QR for order ${checkout.order_id}`} width={320} height={320} unoptimized className="h-auto w-full max-w-72" /></div> : null}{paid ? <div role="status" className="mt-10 flex min-h-60 flex-col items-center justify-center text-green-700"><CheckCircle2 className="h-16 w-16" aria-hidden="true" /><p className="mt-5 font-display text-2xl font-semibold">Payment verified</p><p className="mt-2 text-sm">The restaurant has received your payment.</p></div> : pending ? <p role="status" aria-live="polite" className="mt-5 flex items-center gap-2 text-sm text-stone-600"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Waiting for payment confirmation...</p> : null}{error && <p role="alert" className="mt-4 w-full rounded-xl border border-red-200 bg-red-50 p-3 text-left text-sm text-red-800">{error}</p>}{!paid && <div className="mt-5 grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><button type="button" onClick={downloadQr} disabled={!qrImage} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 text-sm font-semibold text-stone-800 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"><Download className="h-4 w-4" aria-hidden="true" />Download QR</button><button type="button" onClick={() => void verify(false)} disabled={checking || !pending} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60">{checking ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}Check payment</button></div>}{paid && <button type="button" onClick={onClose} className="mt-6 min-h-12 w-full rounded-xl bg-orange-600 px-5 font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Done</button>}</div>
        <div className="p-6 sm:p-8"><h3 className="font-display text-xl font-semibold text-stone-950">Payment summary</h3><dl className="mt-5 divide-y divide-stone-200 border-y border-stone-200 text-sm"><div className="flex justify-between gap-4 py-4"><dt className="text-stone-500">Restaurant</dt><dd className="text-right font-semibold">{checkout.restaurant_name}</dd></div><div className="flex justify-between gap-4 py-4"><dt className="text-stone-500">Table</dt><dd className="text-right font-semibold">{checkout.table_name}</dd></div><div className="flex justify-between gap-4 py-4"><dt className="text-stone-500">Order</dt><dd className="text-right font-semibold">#{checkout.order_id}</dd></div><div className="flex justify-between gap-4 py-4"><dt className="text-stone-500">Total</dt><dd className="text-right font-semibold tabular-nums">{money(checkout.amount)}</dd></div></dl><h3 className="mt-8 font-display text-lg font-semibold text-stone-950">How to pay</h3><ol className="mt-4 space-y-4 text-sm leading-6 text-stone-600">{["Open a Fonepay-supported banking or wallet app.", "Choose Scan QR and scan the code shown here.", `Confirm the exact amount: ${money(checkout.amount)}.`, "Complete payment and keep this page open for automatic confirmation."].map((step, index) => <li key={step} className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-orange-50 text-xs font-bold text-orange-700">{index + 1}</span><span>{step}</span></li>)}</ol><p className="mt-8 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">Your bill is marked paid only after Fonepay confirms the exact amount. Yummy never sends the restaurant&apos;s Fonepay credentials to this browser.</p><p className="mt-4 break-all text-xs text-stone-400">Reference: {checkout.prn}</p></div>
      </div> : null}
    </section>
  </div>;
}
