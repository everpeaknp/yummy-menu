"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronRight, Clock3, Gift, Loader2, LogOut, Mail, MailCheck, MessageSquareText, ReceiptText, Sparkles, Tag, X } from "lucide-react";
import {
  CustomerAccount,
  CustomerEmailPreference,
  CustomerMarketingPreferences,
  CustomerOffer,
  CustomerOrder,
  applyCustomerOffer,
  getCustomerAccount,
  getCustomerEmailPreference,
  getCustomerMarketingPreferences,
  getCustomerOffers,
  getCustomerOrders,
  joinCustomerRestaurant,
  loginCustomerWithPassword,
  logoutCustomer,
  refreshCustomerSession,
  requestCustomerCode,
  setCustomerEmailPreference,
  setCustomerMarketingPreferences,
  verifyCustomerCode,
} from "@/services/api";

const currency = new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat("en-NP", { dateStyle: "medium" });

type AccountView = "orders" | "rewards";
type Step = "identifier" | "code" | "preferences" | "account";

export default function CustomerAccountPanel({ restaurantId, view }: { restaurantId: string; view: AccountView }) {
  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [preference, setPreference] = useState<CustomerEmailPreference | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const [preferenceNotice, setPreferenceNotice] = useState("");
  const [preferenceError, setPreferenceError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [marketingPreferences, setMarketingPreferences] = useState<CustomerMarketingPreferences | null>(null);
  const [emailChoice, setEmailChoice] = useState<boolean | null>(null);
  const [smsChoice, setSmsChoice] = useState<boolean | null>(null);
  const [mobileNumber, setMobileNumber] = useState("");

  useEffect(() => {
    if (!selectedOrder) return;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setSelectedOrder(null);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedOrder]);

  const membership = account?.restaurants.find((item) => item.restaurant_id === Number(restaurantId));

  const loadAccount = async () => {
    const current = await getCustomerAccount();
    if (!current.restaurants.some((item) => item.restaurant_id === Number(restaurantId))) {
      current.restaurants = [...current.restaurants, await joinCustomerRestaurant(Number(restaurantId), current.name)];
    }
    setAccount(current);
    const [nextOrders, nextOffers, nextPreference, nextMarketingPreferences] = await Promise.all([
      getCustomerOrders(Number(restaurantId)),
      getCustomerOffers(Number(restaurantId)),
      getCustomerEmailPreference(Number(restaurantId)),
      getCustomerMarketingPreferences(Number(restaurantId)),
    ]);
    setOrders(nextOrders);
    setOffers(nextOffers);
    setPreference(nextPreference);
    setMarketingPreferences(nextMarketingPreferences);
    setMobileNumber(nextMarketingPreferences.phone || "");
    setEmailChoice(nextMarketingPreferences.email_decision_required ? null : nextMarketingPreferences.email_opted_in);
    setSmsChoice(nextMarketingPreferences.sms_decision_required ? null : nextMarketingPreferences.sms_opted_in);
    setStep(nextMarketingPreferences.decision_required ? "preferences" : "account");
  };

  useEffect(() => {
    const restore = async () => {
      if (!sessionStorage.getItem("yummy_customer_token")) await refreshCustomerSession();
      await loadAccount();
    };
    restore().catch(() => sessionStorage.removeItem("yummy_customer_token"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const sendCode = async () => {
    setBusy(true); setError("");
    try { await requestCustomerCode(identifier); setStep("code"); }
    catch (requestError: any) { setError(requestError.response?.data?.detail || "We couldn't send the code. Check your email or phone number and try again."); }
    finally { setBusy(false); }
  };

  const signIn = async () => {
    setBusy(true); setError("");
    try {
      sessionStorage.setItem("yummy_customer_token", await verifyCustomerCode(identifier, code, password, name));
      await loadAccount();
    } catch (requestError: any) { setError(requestError.response?.data?.detail || "That code is invalid or expired."); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    await logoutCustomer();
    setAccount(null); setOrders([]); setOffers([]); setPreference(null); setMarketingPreferences(null); setCode(""); setPassword(""); setStep("identifier");
  };

  const passwordSignIn = async () => {
    setBusy(true); setError("");
    try {
      sessionStorage.setItem("yummy_customer_token", await loginCustomerWithPassword(identifier, password));
      await loadAccount();
    } catch (requestError: any) { setError(requestError.response?.data?.detail || "Your sign-in details are incorrect."); }
    finally { setBusy(false); }
  };

  const saveMarketingChoices = async () => {
    if (!marketingPreferences) return;
    if (marketingPreferences.email_decision_required && emailChoice === null) return;
    if (marketingPreferences.sms_decision_required && smsChoice === null) return;
    setBusy(true); setError("");
    try {
      const updated = await setCustomerMarketingPreferences(Number(restaurantId), {
        email_opted_in: emailChoice ?? marketingPreferences.email_opted_in,
        sms_opted_in: smsChoice ?? marketingPreferences.sms_opted_in,
        phone: smsChoice ? mobileNumber : undefined,
      });
      setMarketingPreferences(updated);
      setPreference(await getCustomerEmailPreference(Number(restaurantId)));
      setStep("account");
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || "We couldn't save your choices. Check your mobile number and try again.");
    } finally { setBusy(false); }
  };

  const toggleOffers = async () => {
    if (!preference || preferenceBusy) return;
    const previous = preference;
    const nextValue = !preference.opted_in;
    setPreferenceBusy(true); setPreferenceError(""); setPreferenceNotice("");
    setPreference({ ...preference, opted_in: nextValue });
    try {
      setPreference(await setCustomerEmailPreference(Number(restaurantId), nextValue));
      setPreferenceNotice(nextValue ? "Restaurant offers are now on." : "Restaurant offers are now off.");
    } catch (requestError: any) {
      setPreference(previous);
      setPreferenceError(requestError.response?.data?.detail || "We couldn't update restaurant offers. Try again.");
    } finally { setPreferenceBusy(false); }
  };

  const applyOffer = async (offer: CustomerOffer) => {
    const raw = localStorage.getItem("yummy_qr_session");
    const session = raw ? JSON.parse(raw) : null;
    if (!session?.qrToken || Number(session?.restaurantId) !== Number(restaurantId)) { setError("Scan your table QR and start an order before using this offer."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await applyCustomerOffer(Number(restaurantId), offer.recipient_id, session.qrToken);
      setMessage(`${offer.name} applied. Your new total is ${currency.format(result.projected_grand_total)}.`);
      setOffers((current) => current.filter((item) => item.recipient_id !== offer.recipient_id));
    } catch (requestError: any) { setError(requestError.response?.data?.detail || "This offer could not be applied."); }
    finally { setBusy(false); }
  };

  if (step === "preferences" && marketingPreferences) {
    const emailComplete = !marketingPreferences.email_decision_required || emailChoice !== null;
    const smsComplete = !marketingPreferences.sms_decision_required || smsChoice !== null;
    return (
      <section className="mx-auto grid min-h-[65vh] max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-[minmax(0,1fr)_28rem] md:px-8">
        <div className="max-w-xl">
          <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-orange-600 text-white"><Sparkles aria-hidden="true" /></span>
          <h1 className="text-balance font-display text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Choose what you hear from us.</h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-stone-600">Your account is ready for {membership?.restaurant_name || "this restaurant"}. Choose Yes or No for each available marketing channel before continuing.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void saveMarketingChoices(); }} className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_18px_60px_rgba(28,25,23,0.08)] sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-stone-950">Marketing preferences</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">Your choices apply only to this restaurant and can be changed later.</p>
          <div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
            {marketingPreferences.email_decision_required && <ChannelChoice icon={<Mail className="h-5 w-5" aria-hidden="true" />} legend="Email offers" name="email-marketing" value={emailChoice} onChange={setEmailChoice} />}
            {marketingPreferences.sms_decision_required && <div className="py-5"><ChannelChoice icon={<MessageSquareText className="h-5 w-5" aria-hidden="true" />} legend="SMS offers" name="sms-marketing" value={smsChoice} onChange={setSmsChoice} compact />{smsChoice && <label className="mt-4 block text-sm font-medium text-stone-800" htmlFor="customer-mobile">Mobile number<input id="customer-mobile" name="mobile" type="tel" inputMode="tel" autoComplete="tel" required value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} placeholder="+977 98XXXXXXXX" className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 text-stone-950 outline-none placeholder:text-stone-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100" /></label>}</div>}
          </div>
          {marketingPreferences.consent_text && <p className="mt-5 text-xs leading-5 text-stone-500">{marketingPreferences.consent_text}</p>}
          {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
          <button type="submit" disabled={busy || !emailComplete || !smsComplete || (smsChoice === true && !mobileNumber.trim())} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <>Save choices & continue<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}</button>
        </form>
      </section>
    );
  }

  if (step !== "account") {
    return (
      <section className="mx-auto grid min-h-[60vh] max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-[1fr_26rem] md:px-8">
        <div className="max-w-xl">
          <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-orange-600 text-white">{view === "orders" ? <ReceiptText /> : <Gift />}</span>
          <h1 className="text-balance font-display text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">{view === "orders" ? "Your orders, all together." : "Good meals should give something back."}</h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-stone-600">Sign in with your email or phone number to {view === "orders" ? "see past orders and follow your dining history" : "see your points, restaurant offers and rewards"}.</p>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); step === "identifier" ? (usePassword ? passwordSignIn() : sendCode()) : signIn(); }} className="rounded-[1.75rem] border border-stone-200 bg-white p-6 shadow-[0_18px_60px_rgba(28,25,23,0.08)] sm:p-8">
          <h2 className="font-display text-2xl font-semibold text-stone-950">{step === "identifier" ? "Sign in to Yummy" : "Enter your code"}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">{step === "identifier" ? "Use a verified email address or mobile number." : <>Enter the code sent to <strong>{identifier}</strong>.</>}</p>
          {step === "identifier" ? <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-stone-800" htmlFor="customer-identifier">Email or mobile number</label>
            <div className="relative"><Mail className="absolute left-4 top-3.5 h-5 w-5 text-stone-400" aria-hidden="true" /><input id="customer-identifier" name="identifier" type="text" autoComplete="username" spellCheck={false} required value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="min-h-12 w-full rounded-xl border border-stone-300 bg-white pl-12 pr-4 text-stone-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" placeholder="you@example.com or +977 98…" /></div>
            {usePassword && <><label className="block text-sm font-medium text-stone-800" htmlFor="customer-password">Password</label><input id="customer-password" name="password" type="password" autoComplete="current-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-stone-300 px-4 text-stone-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" /></>}
            <label className="block text-sm font-medium text-stone-800" htmlFor="customer-name">Name <span className="font-normal text-stone-500">(first visit only)</span></label>
            <input id="customer-name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="min-h-12 w-full rounded-xl border border-stone-300 px-4 text-stone-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" placeholder="Your name" />
          </div> : <div className="mt-6 space-y-4"><div><label className="block text-sm font-medium text-stone-800" htmlFor="customer-code">Six-digit code</label><input id="customer-code" name="code" inputMode="numeric" autoComplete="one-time-code" spellCheck={false} pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="mt-2 min-h-14 w-full rounded-xl border border-stone-300 px-4 text-center font-display text-2xl tracking-[0.35em] text-stone-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" /></div><div><label className="block text-sm font-medium text-stone-800" htmlFor="new-customer-password">Create a password <span className="font-normal text-stone-500">(optional)</span></label><input id="new-customer-password" name="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-stone-300 px-4 text-stone-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" placeholder="At least 8 characters" /></div></div>}
          {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
          <button disabled={busy || (step === "code" && code.length !== 6)} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-label="Loading" /> : <>{step === "identifier" ? (usePassword ? "Sign in" : "Send verification code") : "Verify & continue"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}</button>
          {step === "identifier" && <button type="button" onClick={() => { setUsePassword((value) => !value); setError(""); }} className="mt-3 min-h-11 w-full text-sm font-semibold text-orange-700 hover:text-orange-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">{usePassword ? "Use a verification code" : "Use my password"}</button>}
          {step === "code" && <button type="button" disabled={busy} onClick={() => { setCode(""); void sendCode(); }} className="mt-3 min-h-11 w-full text-sm font-semibold text-orange-700 hover:text-orange-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">Send a new code</button>}
          {step === "code" && <button type="button" onClick={() => { setStep("identifier"); setError(""); }} className="mt-3 min-h-11 w-full text-sm font-medium text-stone-600 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Use a different email or phone</button>}
        </form>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 flex flex-col gap-6 border-b border-stone-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="font-display text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">{view === "orders" ? "Past orders" : "Rewards"}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">{view === "orders" ? `Your receipts from ${orders[0]?.restaurant_name || "this restaurant"}.` : "Your points and restaurant offers, together."}</p></div>
        <div className="flex min-w-0 items-center gap-3 sm:justify-end"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-stone-950 font-display text-sm font-semibold text-white">{account?.name?.trim().charAt(0).toUpperCase() || "Y"}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-stone-950">{account?.name}</p><p className="truncate text-xs text-stone-500">{account?.email}</p></div><button type="button" onClick={signOut} aria-label="Sign out" className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-full border border-stone-200 bg-white text-stone-500 hover:border-stone-300 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:ml-3"><LogOut className="h-4 w-4" aria-hidden="true" /></button></div>
      </header>

      {view === "orders" ? (
        <div className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-[0_18px_55px_rgba(28,25,23,0.07)] lg:grid lg:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="min-w-0">{orders.length === 0 ? <Empty icon={<ReceiptText aria-hidden="true" />} title="No orders yet" text="Your completed visits will appear here." /> : <div>{orders.map((order, orderIndex) => <button type="button" key={order.id} onClick={() => setSelectedOrder(order)} className="group block w-full border-b border-stone-200 p-5 text-left last:border-0 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 sm:p-7"><div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4"><span className="pt-0.5 font-display text-sm font-semibold tabular-nums text-orange-600">{String(orderIndex + 1).padStart(2, "0")}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-display text-lg font-semibold text-stone-950">Order #{order.id}</span><span className="text-xs font-medium capitalize text-stone-500">{order.status}</span></div><p className="mt-1 text-sm text-stone-500">{shortDate.format(new Date(order.created_at))}</p><p className="mt-4 truncate text-sm text-stone-600">{order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}</p></div><div className="flex items-center gap-3"><p className="font-display text-lg font-semibold tabular-nums text-stone-950">{currency.format(order.grand_total)}</p><ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-orange-600" aria-hidden="true" /></div></div></button>)}</div>}</div>
          <aside className="relative flex flex-col justify-between border-t border-stone-200 bg-stone-950 p-7 text-white lg:border-l lg:border-t-0"><Clock3 className="h-5 w-5 text-orange-400" aria-hidden="true" /><div className="mt-16 lg:mt-0"><p className="text-sm text-white/50">Visits recorded</p><p className="mt-1 font-display text-5xl font-semibold tabular-nums">{membership?.total_orders ?? 0}</p><p className="mt-5 border-t border-white/15 pt-5 text-sm leading-6 text-white/55">Every completed visit stays linked to your account.</p></div></aside>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-[0_18px_55px_rgba(28,25,23,0.07)] lg:grid lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="relative flex min-h-72 flex-col justify-between overflow-hidden bg-stone-950 p-7 text-white sm:p-8 lg:min-h-[31rem]"><div className="absolute -right-16 -top-16 h-52 w-52 rounded-full border-[38px] border-orange-500/15" /><div className="relative"><Gift className="h-6 w-6 text-orange-400" aria-hidden="true" /><p className="mt-14 text-sm text-white/55">Available balance</p><p className="mt-1 font-display text-6xl font-semibold tracking-tight tabular-nums">{membership?.loyalty_points ?? 0}</p><p className="mt-1 text-sm text-orange-300">Yummy points</p></div><div className="relative flex items-end justify-between border-t border-white/15 pt-5"><div><p className="font-display text-2xl font-semibold tabular-nums">{membership?.total_orders ?? 0}</p><p className="text-xs text-white/50">Completed visits</p></div><p className="max-w-28 text-right text-xs leading-5 text-white/40">Earn points every time you return.</p></div></aside>
          <div className="divide-y divide-stone-200">
            {preference?.available && <section className="p-6 sm:p-8" aria-labelledby="insider-offers-title"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 gap-4"><span className="mt-0.5 text-orange-600">{preference.opted_in ? <MailCheck className="h-6 w-6" aria-hidden="true" /> : <Sparkles className="h-6 w-6" aria-hidden="true" />}</span><div><h2 id="insider-offers-title" className="font-display text-xl font-semibold text-stone-950">Restaurant updates</h2><p className="mt-1 max-w-lg text-sm leading-6 text-stone-600">{preference.opted_in ? "You're subscribed to new offers from this restaurant." : "Get occasional emails when this restaurant creates a new offer."}</p></div></div><button type="button" aria-pressed={preference.opted_in} disabled={preferenceBusy} onClick={toggleOffers} className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${preference.opted_in ? "border border-stone-300 bg-white text-stone-800 hover:border-orange-400" : "bg-stone-950 text-white hover:bg-orange-700"}`}>{preferenceBusy ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Saving…</> : preference.opted_in ? <><Check className="h-4 w-4" aria-hidden="true" />Offers on</> : <>Turn on offers<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}</button></div>{preferenceNotice && <p className="mt-4 text-sm font-medium text-green-800" aria-live="polite">{preferenceNotice}</p>}{preferenceError && <p className="mt-4 text-sm font-medium text-red-700" role="alert">{preferenceError}</p>}</section>}
            <section className="p-6 sm:p-8"><div className="mb-6 flex items-end justify-between gap-4"><div><h2 className="font-display text-xl font-semibold text-stone-950">Your offers</h2><p className="mt-1 text-sm text-stone-500">Ready to use on an active table order.</p></div><span className="text-sm tabular-nums text-stone-400">{offers.length}</span></div>{offers.length === 0 ? <div className="flex min-h-40 items-center gap-5 bg-stone-50 px-5 py-7"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-stone-400 shadow-sm"><Tag className="h-5 w-5" aria-hidden="true" /></span><div><h3 className="font-display text-lg font-semibold text-stone-950">Nothing waiting right now</h3><p className="mt-1 text-sm leading-6 text-stone-600">Your next restaurant reward will appear here.</p></div></div> : <div className="grid gap-px overflow-hidden rounded-xl bg-stone-200 sm:grid-cols-2">{offers.map((offer) => <article key={offer.recipient_id} className="bg-white p-5"><Tag className="h-5 w-5 text-orange-600" aria-hidden="true" /><h3 className="mt-5 font-display text-lg font-semibold text-stone-950">{offer.name}</h3><p className="mt-1 text-sm text-stone-600">{offer.discount_type === "percentage" ? `${offer.value}% off` : currency.format(offer.value)} · Expires {shortDate.format(new Date(offer.valid_until))}</p><button type="button" disabled={busy} onClick={() => applyOffer(offer)} className="mt-5 min-h-11 rounded-full bg-orange-600 px-5 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50">Use on current order</button></article>)}</div>}</section>
            {(message || error) && <div className="p-6 sm:p-8">{message && <p className="flex items-center gap-2 text-sm text-green-800" aria-live="polite"><Check className="h-4 w-4" aria-hidden="true" />{message}</p>}{error && <p className="text-sm text-red-700" role="alert">{error}</p>}</div>}
          </div>
        </div>
      )}
      {selectedOrder && <OrderEstimate order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </section>
  );
}

function OrderEstimate({ order, onClose }: { order: CustomerOrder; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const subtotal = order.items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  const adjustment = Math.max(0, subtotal - Number(order.grand_total));

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const closeButton = dialogRef.current?.querySelector<HTMLButtonElement>("button");
    closeButton?.focus();
    return () => previousFocus?.focus();
  }, []);

  const keepFocusInside = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-950/75 backdrop-blur-md sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} onKeyDown={keepFocusInside} role="dialog" aria-modal="true" aria-labelledby="order-estimate-title" className="relative grid h-[100dvh] w-full max-w-5xl overflow-y-auto overscroll-contain bg-white shadow-[0_30px_100px_rgba(0,0,0,0.45)] sm:max-h-[90dvh] sm:h-auto sm:overflow-hidden sm:rounded-[2rem] md:grid-cols-[0.82fr_1.18fr]">
      <button type="button" onClick={onClose} aria-label="Close estimated bill" className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/20 text-white backdrop-blur hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 md:text-stone-500 md:border-stone-200 md:bg-white/90 md:hover:bg-stone-100"><X className="h-5 w-5" aria-hidden="true" /></button>

      <aside className="relative flex min-h-[18rem] flex-col justify-between overflow-hidden bg-[#10131a] p-7 text-white sm:p-9 md:min-h-[42rem] md:p-11">
        <div className="absolute -left-24 top-1/3 h-64 w-64 rounded-full border-[42px] border-orange-500/10" />
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/5 text-orange-400"><ReceiptText className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-xs text-white/45">Dining folio</p><p className="font-display font-semibold">{order.restaurant_name}</p></div></div>
          <div className="mt-10 flex flex-wrap items-center gap-3"><span className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold capitalize text-white">{order.status}</span><span className="text-sm text-white/45">{shortDate.format(new Date(order.created_at))}</span></div>
          <h2 id="order-estimate-title" className="mt-5 text-balance font-display text-5xl font-semibold leading-none tracking-[-0.05em] sm:text-6xl">Order<br />#{order.id}</h2>
        </div>
        <div className="relative mt-12 border-t border-white/15 pt-6"><p className="text-sm text-white/45">Estimated total</p><p className="mt-2 font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">{currency.format(order.grand_total)}</p><p className="mt-4 max-w-xs text-xs leading-5 text-white/35">A dining estimate for reference. Your restaurant-issued fiscal receipt remains the final record.</p></div>
      </aside>

      <div className="relative flex min-h-full flex-col bg-[#fffdf9] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 text-stone-950 sm:px-9 sm:py-10 md:px-12 md:py-11">
        <span className="absolute -left-3 top-16 hidden h-6 w-6 rounded-full bg-stone-950/75 md:block" />
        <span className="absolute -left-3 bottom-16 hidden h-6 w-6 rounded-full bg-stone-950/75 md:block" />
        <div className="absolute inset-y-16 left-0 hidden border-l border-dashed border-stone-300 md:block" />

        <header className="flex items-end justify-between gap-5 border-b border-stone-950 pb-5 pr-12"><div><p className="text-sm font-medium text-orange-700">Your table estimate</p><h3 className="mt-1 font-display text-3xl font-semibold tracking-tight">The order, itemized.</h3></div><p className="hidden text-right text-xs leading-5 text-stone-400 sm:block">{order.items.length} {order.items.length === 1 ? "item" : "items"}<br />NPR</p></header>

        <div className="flex-1 py-2">{order.items.map((item, index) => <div key={`${order.id}-bill-${index}`} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-4 border-b border-stone-200 py-5"><span className="font-display text-2xl font-semibold text-orange-600">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><p className="break-words font-display text-lg font-semibold">{item.name}</p><p className="mt-1 text-sm text-stone-500">Quantity {item.quantity}{item.quantity > 1 ? ` · ${currency.format(Number(item.line_total) / item.quantity)} each` : ""}</p></div><p className="font-display text-lg font-semibold tabular-nums">{currency.format(item.line_total)}</p></div>)}</div>

        <dl className="space-y-3 border-b border-stone-950 py-6 text-sm"><div className="flex justify-between gap-4 text-stone-600"><dt>Items subtotal</dt><dd className="font-medium tabular-nums text-stone-950">{currency.format(subtotal)}</dd></div>{adjustment > 0 && <div className="flex justify-between gap-4 text-green-700"><dt>Discounts & adjustments</dt><dd className="font-medium tabular-nums">−{currency.format(adjustment)}</dd></div>}{order.loyalty_points_redeemed > 0 && <div className="flex justify-between gap-4 text-stone-600"><dt>Loyalty points used</dt><dd className="font-medium tabular-nums text-stone-950">{order.loyalty_points_redeemed}</dd></div>}</dl>

        <div className="flex items-end justify-between gap-5 py-6"><div><p className="font-display text-xl font-semibold">Estimated total</p><p className="mt-1 text-xs text-stone-500">Based on the saved order details.</p></div><p className="shrink-0 font-display text-3xl font-semibold tracking-tight tabular-nums">{currency.format(order.grand_total)}</p></div>
        <button type="button" onClick={onClose} className="min-h-12 w-full rounded-xl bg-orange-600 px-5 font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">Return to order history</button>
      </div>
    </section>
  </div>;
}

function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-stone-100 text-stone-500">{icon}</span><h3 className="mt-4 font-display text-lg font-semibold text-stone-950">{title}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-600">{text}</p></div>;
}

function ChannelChoice({ icon, legend, name, value, onChange, compact = false }: { icon: React.ReactNode; legend: string; name: string; value: boolean | null; onChange: (value: boolean) => void; compact?: boolean }) {
  return <fieldset className={compact ? "" : "py-5"}><legend className="flex items-center gap-2 font-display text-base font-semibold text-stone-950">{icon}{legend}</legend><div className="mt-3 grid grid-cols-2 gap-2">{[{ label: "Yes", value: true }, { label: "No", value: false }].map((option) => <label key={option.label} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-4 text-sm font-semibold focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 ${value === option.value ? "border-stone-950 bg-stone-950 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-500"}`}><input type="radio" name={name} value={String(option.value)} checked={value === option.value} onChange={() => onChange(option.value)} className="sr-only" />{option.label}</label>)}</div></fieldset>;
}
