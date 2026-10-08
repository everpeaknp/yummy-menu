"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Banknote, Check, ChevronRight, Gift, History, Loader2, LogOut, Mail,
  MessageSquareText, Phone, ReceiptText, ScanLine, Sparkles, Store, Tag, UserRound, X,
} from "lucide-react";
import {
  CustomerAccount, CustomerReceivableSummary, CustomerEmailPreference, CustomerMarketingPreferences, CustomerRestaurantInvitation,
  CustomerOffer, CustomerOrder, CustomerRestaurantMembership, applyCustomerOffer,
  clearStoredCustomerToken, getCustomerAccount, getCustomerEmailPreference, getCustomerMarketingPreferences,
  acceptCustomerRestaurantInvitation, getCustomerReceivables, getCustomerOffers, getCustomerOrders, getCustomerRestaurantInvitation, joinCustomerRestaurant, loginCustomerWithPassword, logoutCustomer,
  getStoredCustomerToken, refreshCustomerSession, requestCustomerCode, setCustomerEmailPreference,
  requestCustomerContactCode, setCustomerMarketingPreferences, setCustomerPassword, updateCustomerAccount, verifyCustomerCode, verifyCustomerContactCode, verifyCustomerGoogleToken,
  storeCustomerToken,
} from "@/services/api";
import { getGoogleIdToken } from "@/lib/firebase";
import TableQrScanner from "@/components/TableQrScanner";
import ProfileLoadError from "@/components/ProfileLoadError";

const currency = new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat("en-NP", { dateStyle: "medium" });
const apiErrorMessage = (error: any, fallback: string) => {
  const payload = error?.response?.data;
  const message = (typeof payload?.message === "string" && payload.message)
    || (typeof payload?.detail === "string" && payload.detail)
    || (typeof payload?.detail?.message === "string" && payload.detail.message)
    || fallback;
  return message.trim().toLowerCase() === "not found" ? fallback : message;
};
type Section = "overview" | "orders" | "credit" | "rewards" | "communication" | "account";
type Step = "loading" | "expired" | "identifier" | "code" | "profile-error" | "enroll" | "preferences" | "account";

export default function CustomerProfile({ restaurantId, restaurantName, initialSection = "overview" }: { restaurantId?: string; restaurantName?: string; initialSection?: Section }) {
  const scopedRestaurantId = restaurantId ? Number(restaurantId) : null;
  const [step, setStep] = useState<Step>("loading");
  const [section, setSection] = useState<Section>(initialSection);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [code, setCode] = useState("");
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [activeRestaurantId, setActiveRestaurantId] = useState<number | null>(scopedRestaurantId);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [receivables, setReceivables] = useState<CustomerReceivableSummary | null>(null);
  const [offers, setOffers] = useState<CustomerOffer[]>([]);
  const [preference, setPreference] = useState<CustomerEmailPreference | null>(null);
  const [marketing, setMarketing] = useState<CustomerMarketingPreferences | null>(null);
  const [emailChoice, setEmailChoice] = useState<boolean | null>(null);
  const [smsChoice, setSmsChoice] = useState<boolean | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invitation, setInvitation] = useState<CustomerRestaurantInvitation | null>(null);
  const [invitationToken, setInvitationToken] = useState("");

  const membership = useMemo(
    () => account?.restaurants.find((item) => item.restaurant_id === activeRestaurantId) ?? null,
    [account, activeRestaurantId],
  );

  const openSection = (next: Section) => {
    setSection(next);
    const url = new URL(window.location.href);
    url.searchParams.set("section", next);
    window.history.replaceState({}, "", url);
  };

  const loadRestaurant = async (id: number, requireDecision: boolean) => {
    setError("");
    const [nextOrders, nextCredit, nextOffers, nextPreference, nextMarketing] = await Promise.all([
      getCustomerOrders(id), getCustomerReceivables(id).catch(() => null), getCustomerOffers(id), getCustomerEmailPreference(id), getCustomerMarketingPreferences(id),
    ]);
    setOrders(nextOrders);
    setReceivables(nextCredit);
    setOffers(nextOffers);
    setPreference(nextPreference);
    setMarketing(nextMarketing);
    setEmailChoice(nextMarketing.email_decision_required ? null : nextMarketing.email_opted_in);
    setSmsChoice(nextMarketing.sms_decision_required ? null : nextMarketing.sms_opted_in);
    setStep(requireDecision && nextMarketing.decision_required ? "preferences" : "account");
  };

  const loadAccount = async (requestedRestaurantId: number | null = scopedRestaurantId, confirmInvitation = false) => {
    const current = await getCustomerAccount();
    setAccount(current);
    if (requestedRestaurantId && confirmInvitation) {
      setActiveRestaurantId(requestedRestaurantId);
      setStep("enroll");
      return;
    }
    if (requestedRestaurantId && !current.restaurants.some((item) => item.restaurant_id === requestedRestaurantId)) {
      setActiveRestaurantId(requestedRestaurantId);
      setStep("enroll");
      return;
    }
    const nextId = requestedRestaurantId ?? activeRestaurantId ?? current.restaurants[0]?.restaurant_id ?? null;
    setActiveRestaurantId(nextId);
    if (nextId) await loadRestaurant(nextId, Boolean(scopedRestaurantId));
    else setStep("account");
  };

  useEffect(() => {
    const requestedSection = new URLSearchParams(window.location.search).get("section");
    if (requestedSection === "overview" || requestedSection === "orders" || requestedSection === "credit" || requestedSection === "rewards" || requestedSection === "communication" || requestedSection === "account") setSection(requestedSection);
    const restore = async () => {
      let requestedRestaurantId = scopedRestaurantId;
      const token = new URLSearchParams(window.location.search).get("invite") || "";
      if (token) {
        try {
          const resolved = await getCustomerRestaurantInvitation(token);
          setInvitation(resolved);
          requestedRestaurantId = resolved.restaurant_id;
          setActiveRestaurantId(resolved.restaurant_id);
          if (resolved.expired) {
            setInvitationToken("");
            setStep("expired");
            return;
          }
          setInvitationToken(token);
        } catch (requestError: any) {
          setError(apiErrorMessage(requestError, "This invitation is invalid or expired."));
          setStep("identifier");
          return;
        }
      }
      if (!getStoredCustomerToken()) {
        try { await refreshCustomerSession(); }
        catch {
          clearStoredCustomerToken();
          setStep("identifier");
          return;
        }
      }
      try { await loadAccount(requestedRestaurantId, Boolean(token)); }
      catch (requestError: any) {
        if (requestError.response?.status === 401) {
          clearStoredCustomerToken();
          setStep("identifier");
        } else {
          setError(requestError.response?.data?.detail || "We could not load your profile. Refresh and try again.");
          setStep("account");
        }
      }
    };
    void restore();
    const syncSession = (event: StorageEvent) => {
      if (event.key !== "yummy_customer_token") return;
      if (!event.newValue) {
        setAccount(null); setOrders([]); setOffers([]); setPreference(null); setMarketing(null); setStep("identifier");
      } else {
        setStep("loading");
        void loadAccount().catch(() => { setError("We could not load your profile. Refresh and try again."); setStep("identifier"); });
      }
    };
    window.addEventListener("storage", syncSession);
    return () => window.removeEventListener("storage", syncSession);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    if (!selectedOrder) return;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelectedOrder(null);
    document.addEventListener("keydown", close);
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", close); };
  }, [selectedOrder]);

  const sendCode = async () => {
    setBusy(true); setError("");
    try { await requestCustomerCode(identifier); setStep("code"); }
    catch (requestError: any) { setError(apiErrorMessage(requestError, "We could not send the code. Try again.")); }
    finally { setBusy(false); }
  };

  const openSignedInAccount = async () => {
    try {
      await loadAccount(invitation?.restaurant_id ?? scopedRestaurantId, Boolean(invitationToken));
      openSection("account");
      return true;
    } catch (requestError: any) {
      if (requestError.response?.status === 401) {
        clearStoredCustomerToken();
        setError("Your session expired. Please sign in again.");
        setStep("identifier");
      } else {
        setError(requestError.response?.data?.detail || "We signed you in, but could not open your profile. Try again.");
        setStep("profile-error");
      }
      return false;
    }
  };

  const retrySignedInAccount = async () => {
    setBusy(true); setError("");
    try { await openSignedInAccount(); }
    finally { setBusy(false); }
  };

  const signIn = async (name?: string) => {
    setBusy(true); setError("");
    try {
      const token = await verifyCustomerCode(identifier, code, password, name);
      storeCustomerToken(token);
    } catch (requestError: any) {
      setError(apiErrorMessage(requestError, "That code is invalid or expired."));
      setBusy(false);
      return;
    }
    await openSignedInAccount();
    setBusy(false);
  };

  const signInWithPassword = async () => {
    setBusy(true); setError("");
    try {
      storeCustomerToken(await loginCustomerWithPassword(identifier, password));
      await openSignedInAccount();
    } catch (requestError: any) {
      if (requestError?.response?.status === 401) {
        setError(identifier.includes("@") ? "Email address or password is incorrect." : "Mobile number or password is incorrect.");
      } else {
        setError(apiErrorMessage(requestError, "We could not sign you in. Try again."));
      }
    }
    finally { setBusy(false); }
  };

  const signInWithGoogle = async () => {
    setBusy(true); setError("");
    try {
      const idToken = await getGoogleIdToken();
      storeCustomerToken(await verifyCustomerGoogleToken(idToken));
      await openSignedInAccount();
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || requestError.message || "Google sign-in could not be completed.");
    } finally { setBusy(false); }
  };

  const signOut = async () => {
    await logoutCustomer();
    setAccount(null); setOrders([]); setOffers([]); setPreference(null); setMarketing(null); setCode(""); setPassword(""); setStep("identifier");
  };

  const enroll = async () => {
    const restaurantToJoin = invitation?.restaurant_id ?? scopedRestaurantId;
    if (!restaurantToJoin || !account || busy) return;
    setBusy(true); setError("");
    try {
      const joined = invitationToken
        ? await acceptCustomerRestaurantInvitation(invitationToken)
        : await joinCustomerRestaurant(restaurantToJoin, account.name);
      setAccount({ ...account, restaurants: [...account.restaurants, joined] });
      setActiveRestaurantId(restaurantToJoin);
      await loadRestaurant(restaurantToJoin, true);
    } catch (requestError: any) {
      if (requestError.response?.status === 401) {
        clearStoredCustomerToken();
        setStep("identifier");
      } else setError(requestError.response?.data?.detail || "We could not follow this restaurant. Try again.");
    } finally { setBusy(false); }
  };

  const selectRestaurant = async (id: number) => {
    if (id === activeRestaurantId || busy) return;
    setBusy(true); setActiveRestaurantId(id); setOrders([]); setOffers([]); setPreference(null); setMarketing(null);
    try { await loadRestaurant(id, false); }
    catch (requestError: any) { setError(requestError.response?.data?.detail || "We could not load this restaurant."); }
    finally { setBusy(false); }
  };

  const saveMarketingChoices = async () => {
    if (!marketing || !activeRestaurantId) return;
    if ((marketing.email_decision_required && emailChoice === null) || (marketing.sms_decision_required && smsChoice === null)) return;
    setBusy(true); setError("");
    try {
      const updated = await setCustomerMarketingPreferences(activeRestaurantId, {
        email_opted_in: emailChoice ?? marketing.email_opted_in,
        sms_opted_in: smsChoice ?? marketing.sms_opted_in,
        phone: smsChoice ? account?.phone : undefined,
      });
      setMarketing(updated);
      setPreference(await getCustomerEmailPreference(activeRestaurantId));
      setNotice("Communication preferences saved.");
      setStep("account");
    } catch (requestError: any) { setError(requestError.response?.data?.detail || "We could not save your communication choices. Try again."); }
    finally { setBusy(false); }
  };

  const toggleOffers = async () => {
    if (!preference || !activeRestaurantId || busy) return;
    const previous = preference;
    setBusy(true); setError(""); setNotice(""); setPreference({ ...preference, opted_in: !preference.opted_in });
    try {
      const next = await setCustomerEmailPreference(activeRestaurantId, !previous.opted_in);
      setPreference(next); setNotice(next.opted_in ? "Email offers are on." : "Email offers are off.");
    } catch (requestError: any) { setPreference(previous); setError(requestError.response?.data?.detail || "We could not update email offers."); }
    finally { setBusy(false); }
  };

  const applyOffer = async (offer: CustomerOffer) => {
    if (!activeRestaurantId) return;
    const raw = localStorage.getItem("yummy_qr_session");
    const session = raw ? JSON.parse(raw) : null;
    const orderId = Array.isArray(session?.activeOrderIds) ? session.activeOrderIds[0] : null;
    if (!orderId || session?.restaurantId !== activeRestaurantId) { setError("Scan this restaurant's table QR and start an order before using the offer."); return; }
    setBusy(true); setError("");
    try {
      const result = await applyCustomerOffer(activeRestaurantId, offer.recipient_id, orderId);
      setNotice(`${offer.name} applied. New total: ${currency.format(result.projected_grand_total)}.`);
      setOffers((current) => current.filter((item) => item.recipient_id !== offer.recipient_id));
    } catch (requestError: any) { setError(requestError.response?.data?.detail || "This offer could not be applied."); }
    finally { setBusy(false); }
  };

  if (step === "loading") return <ProfileSkeleton />;
  if (step === "expired" && invitation) return <ExpiredInvitation invitation={invitation} onContinue={() => setStep("identifier")} />;
  if (step === "profile-error") return <ProfileLoadError error={error} busy={busy} onRetry={retrySignedInAccount} onSignOut={signOut} />;
  if (step === "identifier" || step === "code") return <SignIn invitation={invitation} step={step} identifier={identifier} password={password} usePassword={usePassword} code={code} busy={busy} error={error} setIdentifier={setIdentifier} setPassword={setPassword} setUsePassword={setUsePassword} setCode={setCode} sendCode={sendCode} signIn={signIn} signInWithPassword={signInWithPassword} signInWithGoogle={signInWithGoogle} />;
  if (step === "enroll") return <EnrollmentPrompt restaurantName={invitation?.restaurant_name || restaurantName || "this restaurant"} invited={Boolean(invitation)} busy={busy} error={error} onEnroll={enroll} onSignOut={signOut} />;
  if (step === "preferences" && marketing) return <PreferenceGate membership={membership} marketing={marketing} emailChoice={emailChoice} smsChoice={smsChoice} phone={account?.phone} busy={busy} error={error} setEmailChoice={setEmailChoice} setSmsChoice={setSmsChoice} save={saveMarketingChoices} />;

  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
    <header className="flex flex-col gap-6 border-b border-stone-300 pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold text-orange-700">{scopedRestaurantId ? membership?.restaurant_name || "Restaurant account" : "Your Yummy"}</p><h1 className="mt-1 text-balance font-display text-4xl font-semibold tracking-[-0.04em] text-stone-950 sm:text-5xl">{scopedRestaurantId ? "Your profile" : `Good to see you, ${account?.name?.trim().split(" ")[0] || "there"}.`}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Orders, rewards and your restaurant relationships—ready when you are.</p></div>
      <div className="flex min-w-0 flex-wrap items-center gap-3"><button type="button" onClick={() => setScannerOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"><ScanLine className="h-4 w-4" aria-hidden="true" /> Scan table QR</button><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-stone-950 font-display font-semibold text-white">{account?.name?.trim().charAt(0).toUpperCase() || "Y"}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-stone-950">{account?.name}</p><p className="truncate text-xs text-stone-500">{account?.email}</p></div><button type="button" onClick={signOut} aria-label="Sign out" className="ml-auto grid h-11 w-11 place-items-center rounded-full border border-stone-300 bg-white text-stone-600 hover:border-stone-500 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><LogOut className="h-4 w-4" aria-hidden="true" /></button></div>
    </header>

    {(notice || error) && <div role={error ? "alert" : "status"} aria-live="polite" className={`mt-6 rounded-xl border px-4 py-3 text-sm font-medium ${error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>{error || notice}</div>}

    {account?.restaurants.length ? <div className="mt-8 grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside>
        {!scopedRestaurantId && <RestaurantRail memberships={account.restaurants} activeId={activeRestaurantId} onSelect={selectRestaurant} />}
        {membership && <MembershipLedger membership={membership} compact={!scopedRestaurantId} />}
      </aside>
      <div className="min-w-0">
        <nav className="flex gap-1 overflow-x-auto border-b border-stone-300" aria-label="Profile sections">{(["overview", "orders", "credit", "rewards", "communication", "account"] as Section[]).map((item) => <button key={item} type="button" aria-current={section === item ? "page" : undefined} onClick={() => openSection(item)} className={`min-h-12 shrink-0 border-b-2 px-4 text-sm font-semibold capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 ${section === item ? "border-orange-600 text-stone-950" : "border-transparent text-stone-500 hover:text-stone-950"}`}>{item === "credit" ? "Payments due" : item}</button>)}</nav>
        {busy && !preference ? <ProfileSkeleton compact /> : <div className="pt-7">
          {section === "overview" && <Overview membership={membership} orders={orders} offers={offers} onSection={openSection} />}
          {section === "orders" && <OrderHistory orders={orders} onOpen={setSelectedOrder} />}
          {section === "credit" && <Receivables summary={receivables} />}
          {section === "rewards" && <Rewards membership={membership} offers={offers} preference={preference} busy={busy} onToggle={toggleOffers} onApply={applyOffer} />}
          {section === "communication" && <CommunicationPreferences restaurantName={membership?.restaurant_name || "this restaurant"} marketing={marketing} emailChoice={emailChoice} smsChoice={smsChoice} phone={account?.phone} busy={busy} onEmailChoice={setEmailChoice} onSmsChoice={setSmsChoice} onAccount={() => openSection("account")} onSave={saveMarketingChoices} />}
          {section === "account" && account && <AccountDetails account={account} busy={busy} onBusy={setBusy} onSaved={setAccount} onNotice={setNotice} onError={setError} />}
        </div>}
      </div>
    </div> : account ? <div className="customer-account-workspace mx-auto mt-10 grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)] lg:items-start"><AccountDetails account={account} busy={busy} onBusy={setBusy} onSaved={setAccount} onNotice={setNotice} onError={setError} /><EmptyProfile /></div> : <EmptyProfile />}
    {selectedOrder && <OrderReceipt order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    <TableQrScanner open={scannerOpen} onClose={() => setScannerOpen(false)} />
  </main>;
}

function ExpiredInvitation({ invitation, onContinue }: { invitation: CustomerRestaurantInvitation; onContinue: () => void }) {
  return <main className="mx-auto grid min-h-[68dvh] max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-[1fr_27rem] md:px-8"><div className="max-w-xl"><Store className="h-10 w-10 text-orange-600" aria-hidden="true" /><p className="mt-7 text-sm font-semibold text-orange-700">Invitation expired</p><h1 className="mt-2 text-balance font-display text-4xl font-semibold tracking-[-0.04em] text-stone-950 sm:text-5xl">You can still follow {invitation.restaurant_name}.</h1><p className="mt-4 max-w-lg leading-7 text-stone-600">Only the secure invitation link expired. Your restaurant customer record, points and visit history are still available.</p></div><section className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-[0_20px_70px_rgba(28,25,23,0.08)] sm:p-8"><h2 className="font-display text-2xl font-semibold text-stone-950">Choose what to do</h2><p className="mt-2 text-sm leading-6 text-stone-600">Sign in or create an account with the saved email address or mobile number. Yummy will then match you through the normal secure follow flow.</p><button type="button" onClick={onContinue} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">Sign In to Find Restaurant <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>{invitation.restaurant_phone && <a href={`tel:${invitation.restaurant_phone}`} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 font-semibold text-stone-800 hover:border-stone-500 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><Phone className="h-4 w-4" aria-hidden="true" />Ask Restaurant to Resend</a>}<p className="mt-5 text-xs leading-5 text-stone-500">An expired invitation cannot be reopened or automatically renewed.</p></section></main>;
}

function EnrollmentPrompt({ restaurantName, invited, busy, error, onEnroll, onSignOut }: { restaurantName: string; invited: boolean; busy: boolean; error: string; onEnroll: () => void; onSignOut: () => void }) {
  return <main className="mx-auto grid min-h-[68dvh] max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-[1fr_26rem] md:px-8"><div className="max-w-xl"><Store className="h-10 w-10 text-orange-600" aria-hidden="true" /><p className="mt-7 text-sm font-semibold text-orange-700">{invited ? "Restaurant invitation" : "Discover a restaurant"}</p><h1 className="mt-2 text-balance font-display text-4xl font-semibold tracking-[-0.04em] text-stone-950 sm:text-5xl">Follow {restaurantName}?</h1><p className="mt-4 max-w-lg leading-7 text-stone-600">{invited ? "Confirm this restaurant relationship to bring your saved visits, points and offers into your Yummy profile." : "Following saves this restaurant to your Yummy profile and lets you choose email and SMS offers."}</p></div><section className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-[0_20px_70px_rgba(28,25,23,0.08)] sm:p-8"><h2 className="font-display text-2xl font-semibold text-stone-950">{invited ? "Confirm your connection" : "Stay connected"}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{invited ? "Yummy will verify that this account owns the email address or mobile number saved by the restaurant. Marketing messages remain off until you choose them." : "Your communication choices remain under your control."}</p>{error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}<button type="button" disabled={busy} onClick={onEnroll} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-label="Following restaurant" /> : <>Follow restaurant <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}</button><button type="button" onClick={onSignOut} className="mt-3 min-h-11 w-full text-sm font-medium text-stone-600 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Use another account</button></section></main>;
}

function RestaurantRail({ memberships, activeId, onSelect }: { memberships: CustomerRestaurantMembership[]; activeId: number | null; onSelect: (id: number) => void }) {
  return <section className="mb-6"><h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Your restaurants</h2><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{memberships.map((item) => <button type="button" key={item.restaurant_id} onClick={() => onSelect(item.restaurant_id)} className={`group flex min-h-14 items-center gap-3 rounded-xl border px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${activeId === item.restaurant_id ? "border-stone-950 bg-stone-950 text-white" : "border-stone-200 bg-white text-stone-950 hover:border-stone-400"}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${activeId === item.restaurant_id ? "bg-white/10 text-orange-400" : "bg-stone-100 text-orange-700"}`}><Store className="h-4 w-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.restaurant_name}</span><span className={`block text-xs ${activeId === item.restaurant_id ? "text-white/55" : "text-stone-500"}`}>{item.loyalty_points} points</span></span><ChevronRight className="h-4 w-4 opacity-45" aria-hidden="true" /></button>)}</div></section>;
}

function MembershipLedger({ membership, compact }: { membership: CustomerRestaurantMembership; compact: boolean }) {
  const isSubscriber = membership.relationship_status === "subscriber";
  return <section className={`overflow-hidden bg-[#10131a] p-6 text-white ${compact ? "rounded-2xl" : "rounded-[1.5rem]"}`}><Gift className="h-5 w-5 text-orange-400" aria-hidden="true" /><p className="mt-8 text-sm text-white/55">{isSubscriber ? "Restaurant status" : "Available points"}</p>{isSubscriber ? <p className="mt-2 font-display text-2xl font-semibold">Following</p> : <p className="mt-1 font-display text-5xl font-semibold tabular-nums">{membership.loyalty_points}</p>}<dl className="mt-7 grid grid-cols-2 gap-4 border-t border-white/15 pt-5"><div><dt className="text-xs text-white/45">Visits</dt><dd className="mt-1 font-display text-xl font-semibold tabular-nums">{membership.total_orders}</dd></div><div><dt className="text-xs text-white/45">Lifetime spend</dt><dd className="mt-1 font-display text-base font-semibold tabular-nums">{currency.format(membership.total_spent)}</dd></div></dl>{isSubscriber && <p className="mt-5 text-xs leading-5 text-white/55">Place an order from a signed table QR to become a verified customer.</p>}</section>;
}

function Overview({ membership, orders, offers, onSection }: { membership: CustomerRestaurantMembership | null; orders: CustomerOrder[]; offers: CustomerOffer[]; onSection: (section: Section) => void }) {
  return <div><h2 className="font-display text-2xl font-semibold text-stone-950">{membership?.restaurant_name}</h2><p className="mt-1 text-sm text-stone-600">Your relationship with this restaurant at a glance.</p><div className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-stone-200 bg-stone-200 sm:grid-cols-2"><button type="button" onClick={() => onSection("orders")} className="group bg-white p-6 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"><History className="h-5 w-5 text-orange-600" aria-hidden="true" /><p className="mt-8 font-display text-3xl font-semibold tabular-nums">{orders.length}</p><p className="mt-1 text-sm text-stone-600">Saved orders</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-stone-950">View history <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5" aria-hidden="true" /></span></button><button type="button" onClick={() => onSection("rewards")} className="group bg-white p-6 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"><Tag className="h-5 w-5 text-orange-600" aria-hidden="true" /><p className="mt-8 font-display text-3xl font-semibold tabular-nums">{offers.length}</p><p className="mt-1 text-sm text-stone-600">Available offers</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-stone-950">View rewards <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5" aria-hidden="true" /></span></button></div></div>;
}

function OrderHistory({ orders, onOpen }: { orders: CustomerOrder[]; onOpen: (order: CustomerOrder) => void }) {
  return <section><h2 className="font-display text-2xl font-semibold text-stone-950">Order history</h2><p className="mt-1 text-sm text-stone-600">Open any visit for its itemized estimate.</p>{orders.length ? <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">{orders.map((order) => <button type="button" key={order.id} onClick={() => onOpen(order)} className="group grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-stone-200 p-5 text-left last:border-0 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-display text-lg font-semibold text-stone-950">Order #{order.id}</span><span className="text-xs font-medium capitalize text-stone-500">{order.status}</span></div><p className="mt-1 text-sm text-stone-500">{shortDate.format(new Date(order.created_at))}</p><p className="mt-3 truncate text-sm text-stone-600">{order.items.map((item) => `${item.quantity} x ${item.name}`).join(", ")}</p></div><div className="flex items-center gap-3"><span className="font-display font-semibold tabular-nums text-stone-950">{currency.format(order.grand_total)}</span><ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-orange-600" aria-hidden="true" /></div></button>)}</div> : <Empty icon={<ReceiptText />} title="No orders yet" text="Completed visits at this restaurant will appear here." />}</section>;
}

function Receivables({ summary }: { summary: CustomerReceivableSummary | null }) {
  if (!summary) return <Empty icon={<Banknote />} title="Balance details unavailable" text="Refresh the page to try again." />;
  const entries = [
    ...summary.charges.map((item) => ({
      key: `charge-${item.id}`,
      date: item.occurred_at,
      title: item.label,
      amount: item.amount,
      openAmount: item.open_amount,
      kind: "charge" as const,
    })),
    ...summary.credits.map((item) => ({
      key: `credit-${item.id}`,
      date: item.occurred_at,
      title: item.label,
      amount: item.amount,
      openAmount: item.open_amount,
      kind: "credit" as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return <section>
    <h2 className="font-display text-2xl font-semibold text-stone-950">Payments due</h2>
    <p className="mt-1 text-sm leading-6 text-stone-600">Your unpaid purchases and recorded payments at {summary.restaurant_name}.</p>
    <div className="mt-7 overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="bg-stone-950 px-6 py-7 text-white sm:flex sm:items-end sm:justify-between sm:px-8">
        <div><p className="text-sm text-white/60">Amount to pay</p><p className="mt-2 font-display text-4xl font-semibold tabular-nums">{currency.format(summary.amount_due)}</p></div>
        <p className="mt-4 max-w-xs text-sm leading-6 text-white/60 sm:mt-0 sm:text-right">Payments are managed directly by the restaurant.</p>
      </div>
      {summary.restaurant_credit > 0 && <div className="border-b border-stone-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-900 sm:px-8"><span className="font-semibold">Restaurant credit available: </span>{currency.format(summary.restaurant_credit)}. Contact the restaurant to use it or arrange a refund.</div>}
      {entries.length ? <div className="divide-y divide-stone-200">{entries.map((entry) => <div key={entry.key} className="flex items-center justify-between gap-5 px-6 py-5 sm:px-8"><div className="min-w-0"><p className="break-words font-semibold text-stone-950">{entry.title}</p><p className="mt-1 text-sm text-stone-500">{shortDate.format(new Date(entry.date))}{entry.openAmount > 0 ? ` · ${currency.format(entry.openAmount)} remaining` : " · Settled"}</p></div><p className={`shrink-0 font-display font-semibold tabular-nums ${entry.kind === "credit" ? "text-green-700" : "text-stone-950"}`}>{entry.kind === "credit" ? "−" : "+"}{currency.format(entry.amount)}</p></div>)}</div> : <div className="px-6 py-10 text-center sm:px-8"><p className="font-semibold text-stone-950">No payments due</p><p className="mt-1 text-sm text-stone-500">Unpaid purchases and recorded payments will appear here.</p></div>}
    </div>
  </section>;
}

function CommunicationPreferences({ restaurantName, marketing, emailChoice, smsChoice, phone, busy, onEmailChoice, onSmsChoice, onAccount, onSave }: { restaurantName: string; marketing: CustomerMarketingPreferences | null; emailChoice: boolean | null; smsChoice: boolean | null; phone?: string; busy: boolean; onEmailChoice: (value: boolean) => void; onSmsChoice: (value: boolean) => void; onAccount: () => void; onSave: () => void }) {
  if (!marketing) return <Empty icon={<MessageSquareText />} title="Preferences unavailable" text="Campaign preferences could not be loaded. Refresh and try again." />;
  const smsEnabled = smsChoice ?? marketing.sms_opted_in;
  return <section><h2 className="font-display text-2xl font-semibold text-stone-950">Communication</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">Choose whether {restaurantName} can send campaign offers to your saved contact details.</p><form onSubmit={(event) => { event.preventDefault(); void onSave(); }} className="mt-7 max-w-2xl overflow-hidden rounded-2xl border border-stone-200 bg-white"><div className="divide-y divide-stone-200 px-6 sm:px-8">{marketing.email_available || marketing.email_opted_in ? <ChannelChoice icon={<Mail className="h-5 w-5" aria-hidden="true" />} legend="Email campaigns" name="profile-email-marketing" value={emailChoice ?? marketing.email_opted_in} onChange={onEmailChoice} disableYes={!marketing.email_available} /> : <UnavailableChannel label="Email campaigns" />}{marketing.sms_available || marketing.sms_opted_in ? <div className="py-5"><ChannelChoice icon={<MessageSquareText className="h-5 w-5" aria-hidden="true" />} legend="SMS campaigns" name="profile-sms-marketing" value={smsEnabled} onChange={onSmsChoice} compact disableYes={!marketing.sms_available} />{smsEnabled && !phone && <p className="mt-3 text-sm text-amber-800">Add a mobile number in <button type="button" onClick={onAccount} className="font-semibold underline underline-offset-2">Account details</button> before enabling SMS.</p>}</div> : <UnavailableChannel label="SMS campaigns" />}</div><div className="flex flex-col gap-3 border-t border-stone-200 bg-stone-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8"><p className="text-xs leading-5 text-stone-500">Contact details are managed separately in Account.</p><button type="submit" disabled={busy || (smsEnabled && !phone)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-label="Saving" /> : <><Check className="h-4 w-4" aria-hidden="true" />Save preferences</>}</button></div></form></section>;
}

function AccountDetails({ account, busy, onBusy, onSaved, onNotice, onError }: { account: CustomerAccount; busy: boolean; onBusy: (value: boolean) => void; onSaved: (account: CustomerAccount) => void; onNotice: (message: string) => void; onError: (message: string) => void }) {
  const [profileName, setProfileName] = useState(account.name);
  const [contactType, setContactType] = useState<"email" | "phone" | null>(null);
  const [contact, setContact] = useState("");
  const [contactCode, setContactCode] = useState("");
  const [contactStep, setContactStep] = useState<"idle" | "code">("idle");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  useEffect(() => { setProfileName(account.name); setContactType(null); setContact(""); setContactCode(""); setContactStep("idle"); }, [account]);
  const save = async () => {
    onBusy(true); onError(""); onNotice("");
    try { onSaved(await updateCustomerAccount({ name: profileName, phone: account.phone })); onNotice("Account details saved."); }
    catch (requestError: any) { onError(requestError.response?.data?.detail || "We could not save your account details."); }
    finally { onBusy(false); }
  };
  const verifyContact = async () => {
    onBusy(true); onError(""); onNotice("");
    try {
      if (contactStep === "idle") { await requestCustomerContactCode(contact); setContactStep("code"); onNotice(`Verification code sent to ${contact}.`); }
      else { onSaved(await verifyCustomerContactCode(contact, contactCode)); setContactType(null); setContact(""); setContactCode(""); setContactStep("idle"); onNotice("Contact verified successfully."); }
    } catch (requestError: any) {
      if (requestError?.response?.status === 409) { setContactStep("idle"); setContactCode(""); }
      onError(apiErrorMessage(requestError, "We could not verify that contact."));
    }
    finally { onBusy(false); }
  };
  const savePassword = async () => {
    onBusy(true); onError(""); onNotice("");
    try { await setCustomerPassword(newPassword, currentPassword); setCurrentPassword(""); setNewPassword(""); onNotice("Password saved."); }
    catch (requestError: any) { onError(requestError.response?.data?.detail || "We could not save your password."); }
    finally { onBusy(false); }
  };
  const beginContact = (type: "email" | "phone", value: string) => { setContactType(type); setContact(value); setContactCode(""); setContactStep("idle"); };
  const cancelContact = () => { setContactType(null); setContact(""); setContactCode(""); setContactStep("idle"); };
  return <section><h2 className="font-display text-2xl font-semibold text-stone-950">Account details</h2><p className="mt-1 text-sm leading-6 text-stone-600">Manage your profile, sign-in details and password.</p><div className="mt-7 max-w-2xl overflow-hidden rounded-2xl border border-stone-200 bg-white"><form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-5 p-6 sm:p-8"><Field label="Name"><input name="name" autoComplete="name" required value={profileName} onChange={(event) => setProfileName(event.target.value)} className="profile-input" /></Field><button type="submit" disabled={busy || !profileName.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"><Check className="h-4 w-4" aria-hidden="true" />Save name</button></form><div className="border-t border-stone-200 p-6 sm:p-8"><h3 className="font-display text-lg font-semibold text-stone-950">Sign-in details</h3><p className="mt-1 text-xs leading-5 text-stone-500">Verify each contact before using it to sign in.</p><div className="mt-5 divide-y divide-stone-200 rounded-xl border border-stone-200">{(["email", "phone"] as const).map((type) => { const value = type === "email" ? account.email : account.phone; const verified = type === "email" ? account.email_verified : account.phone_verified; const active = contactType === type; return <div key={type} className="p-4"><div className="flex min-h-11 items-center justify-between gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-stone-500">{type === "email" ? "Email address" : "Mobile number"}</p><p className="mt-1 truncate font-medium text-stone-950">{value || `No ${type === "email" ? "email address" : "mobile number"} added`}</p></div>{verified ? <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Verified</span> : !active && <button type="button" onClick={() => beginContact(type, value || "")} className="min-h-11 shrink-0 rounded-full border border-stone-300 px-4 text-sm font-semibold hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">{value ? `Verify ${type === "email" ? "email" : "phone"}` : `Add ${type === "email" ? "email" : "phone"}`}</button>}</div>{active && <form onSubmit={(event) => { event.preventDefault(); void verifyContact(); }} className="mt-4 space-y-4 border-t border-stone-200 pt-4"><Field label={type === "email" ? "Email address" : "Mobile number"}><input name={`${type}-contact`} type={type === "email" ? "email" : "tel"} inputMode={type === "email" ? "email" : "tel"} autoComplete={type === "email" ? "email" : "tel"} required value={contact} onChange={(event) => { setContact(event.target.value); setContactStep("idle"); setContactCode(""); }} className="profile-input" placeholder={type === "email" ? "you@example.com" : "+977 98…"} /></Field>{contactStep === "code" && <Field label="Six-digit verification code"><input name="contact-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={contactCode} onChange={(event) => setContactCode(event.target.value.replace(/\D/g, ""))} className="profile-input text-center font-display text-xl tracking-[0.25em]" /></Field>}<div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !contact.trim() || (contactStep === "code" && contactCode.length !== 6)} className="min-h-11 rounded-full bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">{contactStep === "idle" ? "Send code" : `Verify ${type === "email" ? "email" : "phone"}`}</button><button type="button" onClick={cancelContact} className="min-h-11 rounded-full px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Cancel</button></div></form>}</div>; })}</div></div><form onSubmit={(event) => { event.preventDefault(); void savePassword(); }} className="space-y-4 border-t border-stone-200 p-6 sm:p-8"><div><h3 className="font-display text-lg font-semibold text-stone-950">Password</h3><p className="mt-1 text-xs leading-5 text-stone-500">{account.has_password ? "Replace your current password." : "Set a password for email or phone sign-in."}</p></div>{account.has_password && <Field label="Current password"><input name="current-password" type="password" autoComplete="current-password" minLength={8} required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="profile-input" /></Field>}<Field label="New password"><input name="new-password" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="profile-input" placeholder="At least 8 characters" /></Field><button type="submit" disabled={busy || newPassword.length < 8 || (account.has_password && currentPassword.length < 8)} className="inline-flex min-h-11 items-center justify-center rounded-full bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">Save password</button></form></div></section>;
}

function UnavailableChannel({ label }: { label: string }) { return <div className="py-5"><p className="font-semibold text-stone-950">{label}</p><p className="mt-1 text-sm text-stone-500">This restaurant has not enabled this channel.</p></div>; }

function Rewards({ membership, offers, preference, busy, onToggle, onApply }: { membership: CustomerRestaurantMembership | null; offers: CustomerOffer[]; preference: CustomerEmailPreference | null; busy: boolean; onToggle: () => void; onApply: (offer: CustomerOffer) => void }) {
  return <section><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-2xl font-semibold text-stone-950">Rewards</h2><p className="mt-1 text-sm text-stone-600">{membership?.loyalty_points ?? 0} points available at {membership?.restaurant_name}.</p></div>{preference?.available && <button type="button" aria-pressed={preference.opted_in} disabled={busy} onClick={onToggle} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-60 ${preference.opted_in ? "border border-stone-300 bg-white text-stone-800" : "bg-stone-950 text-white hover:bg-orange-700"}`}>{busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : preference.opted_in ? <><Check className="h-4 w-4" /> Email offers on</> : <><Mail className="h-4 w-4" /> Turn on email offers</>}</button>}</div>{offers.length ? <div className="mt-7 grid gap-3 sm:grid-cols-2">{offers.map((offer) => <article key={offer.recipient_id} className="rounded-2xl border border-stone-200 bg-white p-5"><Tag className="h-5 w-5 text-orange-600" aria-hidden="true" /><h3 className="mt-6 font-display text-xl font-semibold text-stone-950">{offer.name}</h3><p className="mt-1 text-sm text-stone-600">{offer.discount_type === "percentage" ? `${offer.value}% off` : currency.format(offer.value)}. Expires {shortDate.format(new Date(offer.valid_until))}.</p><button type="button" disabled={busy} onClick={() => onApply(offer)} className="mt-6 min-h-11 rounded-full bg-orange-600 px-5 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50">Use on current order</button></article>)}</div> : <Empty icon={<Tag />} title="No offers right now" text="New rewards from this restaurant will appear here." />}</section>;
}

function SignIn({ invitation, step, identifier, password, usePassword, code, busy, error, setIdentifier, setPassword, setUsePassword, setCode, sendCode, signIn, signInWithPassword, signInWithGoogle }: any) {
  const enteringIdentifier = step === "identifier";
  const [method, setMethod] = useState<"email" | "phone">("phone");
  const [mode, setMode] = useState<"signin" | "signup" | "recovery">("signin");
  const [name, setName] = useState("");
  const chooseMethod = (next: "email" | "phone") => { setMethod(next); setIdentifier(""); setPassword(""); };
  const chooseMode = (next: "signin" | "signup" | "recovery") => { setMode(next); setPassword(""); setCode(""); setUsePassword(next === "signin"); };
  const title = !enteringIdentifier ? (mode === "signup" ? "Verify your account" : "Reset your password") : mode === "signup" ? "Create your Yummy account" : mode === "recovery" ? "Reset your password" : "Sign in to Yummy";
  const submit = () => enteringIdentifier ? (mode === "signin" ? signInWithPassword() : sendCode()) : signIn(mode === "signup" ? name : undefined);
  return <main className="mx-auto grid min-h-[72dvh] max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-[1fr_27rem] md:px-8"><div className="max-w-xl"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-600 text-white"><UserRound aria-hidden="true" /></span><h1 className="mt-7 text-balance font-display text-4xl font-semibold tracking-[-0.04em] text-stone-950 sm:text-6xl">One profile for every table.</h1><p className="mt-5 max-w-lg text-base leading-7 text-stone-600">Keep your restaurants, orders, points and offers together in one Yummy profile.</p></div><form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-[0_20px_70px_rgba(28,25,23,0.09)] sm:p-8"><h2 className="font-display text-2xl font-semibold text-stone-950">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{!enteringIdentifier ? <>Enter the code sent to <strong>{identifier}</strong>.</> : mode === "signup" ? "Verify your email or mobile number to create an account." : mode === "recovery" ? "We’ll verify your identity before setting a new password." : "Enter your password to continue."}</p>{enteringIdentifier ? <><div className="mt-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1" role="group" aria-label="Sign-in method"><button type="button" aria-pressed={method === "email"} onClick={() => chooseMethod("email")} className={`min-h-11 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${method === "email" ? "bg-white text-stone-950 shadow-sm" : "text-stone-600"}`}>Email</button><button type="button" aria-pressed={method === "phone"} onClick={() => chooseMethod("phone")} className={`min-h-11 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${method === "phone" ? "bg-white text-stone-950 shadow-sm" : "text-stone-600"}`}>Mobile</button></div>{mode === "signup" && <Field label="Your name" className="mt-4"><input name="name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} className="profile-input" /></Field>}<Field label={method === "email" ? "Email address" : "Mobile number"} className="mt-4"><input name="identifier" type={method === "email" ? "email" : "tel"} inputMode={method === "email" ? "email" : "tel"} autoComplete={method === "email" ? "email" : "tel"} spellCheck={false} required value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="profile-input" placeholder={method === "email" ? "you@example.com" : "98XXXXXXXX"} /></Field>{mode === "signin" && <Field label="Password" className="mt-4"><input name="password" type="password" autoComplete="current-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="profile-input" /></Field>}{mode === "signup" && <Field label="Create password" className="mt-4"><input name="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="profile-input" placeholder="At least 8 characters" /></Field>}{mode === "recovery" && <Field label="New password" className="mt-4"><input name="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="profile-input" placeholder="At least 8 characters" /></Field>}</> : <Field label="Six-digit verification code" className="mt-6"><input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="profile-input text-center font-display text-2xl tracking-[0.3em]" /></Field>}{error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}<button disabled={busy || (!enteringIdentifier && code.length !== 6) || (enteringIdentifier && password.length < 8)} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-label="Working" /> : <>{enteringIdentifier ? mode === "signin" ? "Sign in" : "Send verification code" : mode === "signup" ? "Create account" : "Reset password"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}</button>{enteringIdentifier && mode === "signin" && <div className="mt-3 flex flex-col items-center gap-1"><button type="button" onClick={() => chooseMode("recovery")} className="min-h-10 px-3 text-sm font-semibold text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Forgot password?</button>{error && <button type="button" onClick={() => chooseMode("recovery")} className="min-h-10 px-3 text-sm font-semibold text-stone-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Sign in with a verification code</button>}</div>}{enteringIdentifier && <p className="mt-4 text-center text-sm text-stone-600">{mode === "signup" ? "Already have an account?" : "New to Yummy?"} <button type="button" onClick={() => chooseMode(mode === "signup" ? "signin" : "signup")} className="min-h-11 px-1 font-semibold text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">{mode === "signup" ? "Sign in" : "Create account"}</button></p>}{!enteringIdentifier && <button type="button" disabled={busy} onClick={() => { setCode(""); void sendCode(); }} className="mt-3 min-h-11 w-full text-sm font-semibold text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Send a new code</button>}{enteringIdentifier && mode === "signin" && <><div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-stone-400"><span className="h-px flex-1 bg-stone-200" />or<span className="h-px flex-1 bg-stone-200" /></div><button type="button" disabled={busy} onClick={() => void signInWithGoogle()} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white font-semibold text-stone-950 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"><GoogleLogo />Continue with Google</button></>}</form></main>;
}

function GoogleLogo() { return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.35l-3.24-2.55c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.63A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.44H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.56l3.35-2.63Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.44l3.35 2.63C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>; }

function PreferenceGate({ membership, marketing, emailChoice, smsChoice, phone, busy, error, setEmailChoice, setSmsChoice, save }: any) {
  return <main className="mx-auto grid min-h-[70dvh] max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-[1fr_28rem] md:px-8"><div><Sparkles className="h-10 w-10 text-orange-600" /><h1 className="mt-6 text-balance font-display text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Choose how this restaurant contacts you.</h1><p className="mt-4 max-w-lg leading-7 text-stone-600">These choices apply only to {membership?.restaurant_name || "this restaurant"}. Your personal details stay in Account.</p></div><form onSubmit={(event) => { event.preventDefault(); void save(); }} className="rounded-[1.5rem] border border-stone-200 bg-white p-6 sm:p-8"><h2 className="font-display text-2xl font-semibold">Marketing choices</h2><div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">{marketing.email_decision_required && <ChannelChoice icon={<Mail />} legend="Email offers" name="email" value={emailChoice} onChange={setEmailChoice} />}{marketing.sms_decision_required && <div className="py-5"><ChannelChoice icon={<MessageSquareText />} legend="SMS offers" name="sms" value={smsChoice} onChange={setSmsChoice} compact />{smsChoice && !phone && <p className="mt-3 text-sm text-amber-800">No mobile number is saved. Choose No for now, then add one in Account and enable SMS later.</p>}</div>}</div>{error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}<button disabled={busy || (marketing.email_decision_required && emailChoice === null) || (marketing.sms_decision_required && smsChoice === null) || (smsChoice && !phone)} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 font-semibold text-white hover:bg-orange-600 disabled:opacity-50">Save choices <ArrowRight className="h-4 w-4" /></button></form></main>;
}

function OrderReceipt({ order, onClose }: { order: CustomerOrder; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const subtotal = order.items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; ref.current?.querySelector<HTMLButtonElement>("button")?.focus(); return () => previous?.focus(); }, []);
  const keepFocusInside = (event: React.KeyboardEvent<HTMLElement>) => { if (event.key !== "Tab") return; const controls = ref.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"); if (!controls?.length) return; const first = controls[0]; const last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } };
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section ref={ref} onKeyDown={keepFocusInside} role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="grid max-h-[100dvh] w-full max-w-4xl overflow-y-auto overscroll-contain bg-white sm:max-h-[90dvh] sm:rounded-[1.5rem] md:grid-cols-[16rem_1fr]"><aside className="bg-[#10131a] p-7 text-white"><ReceiptText className="h-5 w-5 text-orange-400" aria-hidden="true" /><p className="mt-10 text-sm text-white/50">{order.restaurant_name}</p><h2 id="receipt-title" className="mt-2 font-display text-4xl font-semibold">Order #{order.id}</h2><p className="mt-3 text-sm text-white/55">{shortDate.format(new Date(order.created_at))}</p><p className="mt-10 border-t border-white/15 pt-5 text-sm text-white/50">Estimated total</p><p className="mt-1 font-display text-3xl font-semibold tabular-nums">{currency.format(order.grand_total)}</p></aside><div className="relative p-6 sm:p-9"><button type="button" onClick={onClose} aria-label="Close order details" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><X className="h-5 w-5" aria-hidden="true" /></button><h3 className="pr-14 font-display text-2xl font-semibold">Itemized estimate</h3><div className="mt-6">{order.items.map((item, index) => <div key={`${order.id}-${index}`} className="grid grid-cols-[auto_1fr_auto] gap-4 border-b border-stone-200 py-4"><span className="text-sm font-semibold text-orange-700">{item.quantity}x</span><span className="break-words font-medium text-stone-950">{item.name}</span><span className="font-semibold tabular-nums text-stone-950">{currency.format(item.line_total)}</span></div>)}</div><div className="mt-6 flex justify-between font-semibold"><span>Items subtotal</span><span>{currency.format(subtotal)}</span></div><div className="mt-3 flex justify-between text-xl font-semibold"><span>Estimated total</span><span>{currency.format(order.grand_total)}</span></div><p className="mt-5 text-xs leading-5 text-stone-500">For reference only. The restaurant-issued fiscal receipt is the final record.</p></div></section></div>;
}

function EmptyProfile() { return <section className="relative overflow-hidden rounded-[1.5rem] bg-[#10131a] p-7 text-white shadow-[0_24px_70px_rgba(16,19,26,0.18)] sm:p-8"><div className="absolute -right-14 -top-14 h-36 w-36 rounded-full border-[28px] border-orange-500/15" aria-hidden="true" /><span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500 text-white"><Store className="h-5 w-5" aria-hidden="true" /></span><h2 className="mt-12 max-w-xs font-display text-3xl font-semibold tracking-[-0.03em]">Your next favourite place starts here.</h2><p className="mt-4 max-w-sm text-sm leading-6 text-white/60">Browse a restaurant or scan its table QR. Orders, rewards and offers will then appear in your Yummy account.</p><Link href="/#discover" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-stone-950 hover:bg-orange-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">Explore restaurants <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></section>; }
function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="mt-7 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-stone-100 text-stone-500">{icon}</span><h3 className="mt-4 font-display text-lg font-semibold text-stone-950">{title}</h3><p className="mt-2 text-sm text-stone-600">{text}</p></div>; }
function ProfileSkeleton({ compact = false }: { compact?: boolean }) { return <div className={`mx-auto max-w-6xl animate-pulse px-4 ${compact ? "py-4" : "py-12"}`} aria-label="Loading profile"><div className="h-8 w-48 rounded bg-stone-200" /><div className="mt-5 h-40 rounded-2xl bg-stone-200" /></div>; }
function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) { return <label className={`block text-sm font-medium text-stone-800 ${className}`}>{label}<span className="mt-2 block">{children}</span></label>; }
function ChannelChoice({ icon, legend, name, value, onChange, compact = false, disableYes = false }: any) { return <fieldset className={compact ? "" : "py-5"}><legend className="flex items-center gap-2 font-semibold text-stone-950">{icon}{legend}</legend><div className="mt-3 grid grid-cols-2 gap-2">{[{ label: "Yes", value: true }, { label: "No", value: false }].map((option) => { const disabled = option.value && disableYes; return <label key={option.label} className={`flex min-h-12 items-center justify-center rounded-xl border text-sm font-semibold focus-within:ring-2 focus-within:ring-orange-500 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${value === option.value ? "border-stone-950 bg-stone-950 text-white" : "border-stone-300 bg-white text-stone-700"}`}><input type="radio" className="sr-only" name={name} checked={value === option.value} disabled={disabled} onChange={() => onChange(option.value)} />{option.label}</label>; })}</div>{disableYes && <p className="mt-2 text-xs text-stone-500">This restaurant has not completed marketing consent setup. You can still choose No to unsubscribe.</p>}</fieldset>; }
