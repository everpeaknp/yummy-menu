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

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6">
      <button type="button" aria-label="Close Fonepay checkout" className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={onClose} />
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="fonepay-checkout-title" aria-describedby="fonepay-checkout-description" className="relative max-h-[92dvh] w-full max-w-[760px] overflow-y-auto overscroll-contain rounded-2xl border border-stone-200 bg-white shadow-xl">
        <button type="button" onClick={onClose} aria-label="Close Fonepay checkout" className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <header className="border-b border-stone-200 px-5 pb-5 pt-6 pr-16 sm:px-7 sm:pr-16">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium text-stone-600">
            <ShieldCheck className="h-4 w-4 text-orange-700" aria-hidden="true" />Fonepay checkout
          </p>
          <h2 id="fonepay-checkout-title" className="font-display text-2xl font-semibold tracking-tight text-stone-950">{paid ? "Payment complete" : "Pay your bill"}</h2>
          <p id="fonepay-checkout-description" className="mt-1 text-sm leading-6 text-stone-600">{paid ? "Your bill is paid. You’re all set." : "Scan with your banking app. We’ll confirm your payment here."}</p>
        </header>

        {loading ? (
          <div role="status" className="flex min-h-72 items-center justify-center gap-3 px-5 text-sm text-stone-600">
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Preparing your secure QR…
          </div>
        ) : error && !checkout ? (
          <div className="p-5 sm:p-7">
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>
            <button type="button" onClick={onClose} className="customer-primary-button mt-4 w-full">Return to your order</button>
          </div>
        ) : checkout ? (
          <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] sm:gap-7 sm:p-7">
            <div className="flex min-w-0 flex-col items-center text-center">
              <p className="text-xs font-medium text-stone-600">{paid ? "Amount paid" : "Amount due"}</p>
              <p className="mt-1 max-w-full break-words font-display text-3xl font-semibold tracking-tight tabular-nums text-stone-950">{money(checkout.amount)}</p>

              {qrImage && !paid ? (
                <div className="mt-5 w-fit max-w-full rounded-xl border border-stone-200 bg-white p-3">
                  <Image src={qrImage} alt={`Fonepay payment QR for order ${checkout.order_id}`} width={240} height={240} unoptimized className="h-auto w-full max-w-60" />
                </div>
              ) : null}
              {!qrImage && !paid ? <p role="status" className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">The payment QR is unavailable. Please ask the restaurant for help.</p> : null}

              {paid ? (
                <div role="status" className="my-6 flex min-h-48 flex-col items-center justify-center">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-green-50 text-green-700"><CheckCircle2 className="h-8 w-8" aria-hidden="true" /></span>
                  <p className="mt-4 font-display text-xl font-semibold text-stone-950">Payment verified</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">The restaurant has received your payment.</p>
                </div>
              ) : pending ? (
                <p role="status" aria-live="polite" className="mt-4 flex items-center justify-center gap-2 text-xs leading-5 text-stone-600">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />Waiting for confirmation…
                </p>
              ) : null}
              {error ? <p role="alert" className="mt-4 w-full rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-800">{error}</p> : null}

              {!paid ? (
                <div className="mt-4 grid w-full grid-cols-2 gap-2">
                  <button type="button" onClick={downloadQr} disabled={!qrImage} className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 px-2 text-xs font-semibold text-stone-800 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50">
                    <Download className="h-4 w-4 shrink-0" aria-hidden="true" />Download QR
                  </button>
                  <button type="button" onClick={() => void verify(false)} disabled={checking || !pending} className="customer-primary-button px-2 text-xs">
                    {checking ? <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <RefreshCw className="h-4 w-4 shrink-0" aria-hidden="true" />}Check payment
                  </button>
                </div>
              ) : <button type="button" onClick={onClose} className="customer-primary-button w-full">Done</button>}
            </div>

            <aside aria-label="Bill details" className="min-w-0 border-t border-stone-200 pt-5 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0">
              <h3 className="font-display text-base font-semibold text-stone-950">Your bill</h3>
              <p className="mt-1 break-words text-sm text-stone-600">{checkout.restaurant_name}</p>
              {Boolean(checkout.items?.length) && <section className="mt-4" aria-label="Items on this bill">
                <h4 className="text-sm font-semibold text-stone-950">Items on this bill</h4>
                <ul className="mt-2 divide-y divide-stone-100">{checkout.items?.map(item => <li key={item.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0"><p className="break-words text-stone-950"><span className="tabular-nums">{item.quantity}×</span> {item.name}</p>{Boolean(item.modifiers?.length) && <p className="mt-1 break-words text-xs text-stone-600">{item.modifiers.join(', ')}</p>}</div>
                  <span className="shrink-0 font-medium tabular-nums text-stone-950">{money(item.line_total)}</span>
                </li>)}</ul>
                <p className="mt-1 text-xs leading-5 text-stone-600">Item amounts are before bill-level taxes, discounts and previous payments. The amount due below is the exact amount to pay.</p>
              </section>}
              <dl className="mt-4 space-y-3 border-y border-stone-200 py-4 text-sm">
                <div className="flex items-start justify-between gap-4"><dt className="text-stone-600">Table</dt><dd className="min-w-0 break-words text-right font-medium text-stone-950">{checkout.table_name}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="text-stone-600">Order</dt><dd className="min-w-0 break-words text-right font-medium text-stone-950">#{checkout.order_id}</dd></div>
                <div className="flex items-start justify-between gap-4 border-t border-dashed border-stone-200 pt-3"><dt className="font-medium text-stone-950">{paid ? 'Amount paid' : 'Amount due'}</dt><dd className="min-w-0 break-words text-right font-semibold tabular-nums text-stone-950">{money(checkout.amount)}</dd></div>
              </dl>

              {!paid ? (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-stone-950">Complete in your banking app</h3>
                  <ol className="mt-3 space-y-3 text-xs leading-5 text-stone-600">
                    {["Open a Fonepay-supported app and scan this QR.", `Confirm the exact amount: ${money(checkout.amount)}.`, "Pay and return here for confirmation."].map((step, index) => (
                      <li key={step} className="flex gap-2.5">
                        <span aria-hidden="true" className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-stone-100 text-[11px] font-semibold text-stone-700">{index + 1}</span><span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              <p className="mt-5 flex items-start gap-2 border-t border-stone-200 pt-4 text-xs leading-5 text-stone-600"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-orange-700" aria-hidden="true" />Your bill is marked paid only after Fonepay verifies the exact amount.</p>
              <p className="mt-3 break-all text-[11px] leading-5 text-stone-500">Reference: {checkout.prn}</p>
            </aside>
          </div>
        ) : null}
      </section>
    </div>
  );
}
