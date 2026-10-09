"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Banknote, Check, ChevronRight, Gift, History, Loader2, LockKeyhole, LogOut, Mail,
  MessageSquareText, Pencil, Phone, ReceiptText, ScanLine, Sparkles, Store, Tag, UserRound, X,
} from "lucide-react";
import {
  CustomerAccount, CustomerReceivableSummary, CustomerEmailPreference, CustomerMarketingPreferences, CustomerRestaurantInvitation,
  CustomerOffer, CustomerOrder, CustomerRestaurantMembership, applyCustomerOffer,
  clearStoredCustomerToken, getCustomerAccount, getCustomerEmailPreference, getCustomerMarketingPreferences,
  acceptCustomerRestaurantInvitation, getCustomerReceivables, getCustomerOffers, getCustomerOrders, getCustomerRestaurantInvitation, joinCustomerRestaurant, loginCustomerWithPassword, logoutCustomer,
  getStoredCustomerToken, refreshCustomerSession, requestCustomerCode,
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

export default function CustomerProfile({ restaurantId, restaurantName, initialSection = "overview", authenticationOnly = false, onAuthenticated, embedded = false }: { restaurantId?: string; restaurantName?: string; initialSection?: Section; authenticationOnly?: boolean; embedded?: boolean; onAuthenticated?: (account: CustomerAccount) => void }) {
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
    if (next === 'overview' || next === 'account') url.searchParams.delete('restaurant');
    if (scopedRestaurantId) window.history.replaceState({}, "", url);
    else window.history.pushState({}, "", url);
    setError(''); setNotice('');
    window.scrollTo({ top: 0 });
  };

  const loadRestaurant = useCallback(async (id: number, requireDecision: boolean) => {
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
  }, []);

  const loadAccount = async (requestedRestaurantId: number | null = scopedRestaurantId, confirmInvitation = false) => {
    const current = await getCustomerAccount();
    setAccount(current);
    if (authenticationOnly) { onAuthenticated?.(current); setStep('account'); return; }
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
    const restoredRestaurantId = Number(new URLSearchParams(window.location.search).get('restaurant'));
    const nextId = requestedRestaurantId ?? (current.restaurants.some(item => item.restaurant_id === restoredRestaurantId) ? restoredRestaurantId : activeRestaurantId ?? current.restaurants[0]?.restaurant_id ?? null);
    setActiveRestaurantId(nextId);
    const requestedSection = new URLSearchParams(window.location.search).get('section') || section;
    if (!scopedRestaurantId && (requestedSection === 'overview' || requestedSection === 'account')) { setStep('account'); return; }
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

  const selectRestaurant = async (id: number, nextSection: Section = section) => {
    if (busy) return;
    openSection(nextSection);
    const url = new URL(window.location.href); url.searchParams.set('restaurant', String(id));
    window.history.replaceState({}, '', url);
    setBusy(true); setActiveRestaurantId(id); setOrders([]); setOffers([]); setPreference(null); setMarketing(null);
    try { await loadRestaurant(id, false); }
    catch (requestError: any) { setError(requestError.response?.data?.detail || "We could not load this restaurant."); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (scopedRestaurantId || !account) return;
    const sync = () => {
      const query = new URLSearchParams(window.location.search);
      const next = query.get('section') || 'overview';
      if (!['overview', 'account', 'orders', 'rewards', 'credit', 'communication'].includes(next)) return;
      setSection(next as Section); setError(''); setNotice('');
      if (next === 'overview' || next === 'account') return;
      const id = Number(query.get('restaurant')) || account.restaurants[0]?.restaurant_id;
      if (!id || !account.restaurants.some(item => item.restaurant_id === id)) return;
      setActiveRestaurantId(id); setBusy(true);
      void loadRestaurant(id, false).catch(() => setError('Could not load this restaurant. Please try again.')).finally(() => setBusy(false));
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [account, scopedRestaurantId, loadRestaurant]);

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

  const applyOffer = async (offer: CustomerOffer) => {
    if (!activeRestaurantId) return;
    const raw = localStorage.getItem("yummy_qr_session");
    const session = raw ? JSON.parse(raw) : null;
    if (!session?.qrToken || Number(session?.restaurantId) !== activeRestaurantId) { setError("Scan this restaurant's table QR and start an order before using the offer."); return; }
    setBusy(true); setError("");
    try {
      const result = await applyCustomerOffer(activeRestaurantId, offer.recipient_id, session.qrToken);
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

  if (!scopedRestaurantId && account) return <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
    {section === 'overview' ? <>
      <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-stone-500">Your account and restaurants.</p>
      <div className="mt-5 rounded-2xl border border-stone-200 bg-white px-5 py-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <div className="relative shrink-0">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-orange-50 text-3xl font-semibold text-orange-700 ring-4 ring-white sm:h-24 sm:w-24">{account.name?.trim().charAt(0).toUpperCase() || 'Y'}</span>
            <button type="button" onClick={() => openSection('account')} aria-label="Edit profile" className="absolute -bottom-1 -right-2 grid h-11 w-11 place-items-center rounded-full border-4 border-white bg-stone-100 text-stone-700 hover:bg-orange-100 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><Pencil size={17} aria-hidden="true" /></button>
          </div>
          <div className="min-w-0 flex-1"><h2 className="break-words text-xl font-bold tracking-tight sm:text-2xl">{account.name || 'Your account'}</h2><p className="mt-1 break-all text-sm text-stone-500">{account.email || account.phone}</p><p className="mt-2 text-xs text-stone-400">Yummy member</p></div>
        </div>
      </div>
      <div className="mt-6 grid min-w-0 gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="min-w-0"><h2 className="mb-3 text-sm font-semibold">Account</h2><div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <button type="button" onClick={() => openSection('account')} className="flex min-h-16 w-full items-center gap-3 p-4 text-left text-sm font-medium hover:bg-stone-50"><UserRound size={19} className="text-stone-500" /><span className="flex-1">Account details</span><ChevronRight size={17} className="text-stone-400" /></button>
          <button type="button" disabled={busy} onClick={() => void signOut()} className="flex min-h-16 w-full items-center gap-3 p-4 text-left text-sm font-medium text-stone-600 hover:bg-stone-50"><LogOut size={19} /><span className="flex-1">Sign out</span></button>
        </div></section>
        <section className="min-w-0"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Your restaurants</h2>{account.restaurants.length > 0 && <span className="text-xs text-stone-400">{account.restaurants.length}</span>}</div>
          {account.restaurants.length ? <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">{account.restaurants.map(item => <button key={item.restaurant_id} type="button" disabled={busy} onClick={() => void selectRestaurant(item.restaurant_id, 'orders')} className="flex min-h-20 w-full items-center gap-3 p-4 text-left hover:bg-stone-50 disabled:opacity-60"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100"><Store size={19} className="text-orange-600" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.restaurant_name}</span><span className="mt-1 block text-xs text-stone-500">Orders, rewards and preferences</span></span><ChevronRight size={18} className="shrink-0 text-stone-400" /></button>)}</div> : <div className="rounded-2xl border border-stone-200 bg-white p-5"><p className="text-sm font-medium">No restaurants yet</p><p className="mt-2 text-sm leading-6 text-stone-500">Follow a restaurant or scan a table to start your dining history.</p><Link href="/?view=discover" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-orange-700">Find restaurants <ArrowRight size={16} /></Link></div>}
        </section>
      </div>
    </> : <>
      <button type="button" onClick={() => openSection('overview')} className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-stone-600 hover:text-stone-950"><ArrowLeft size={18} />Back to profile</button>
      {section === 'account' ? <AccountDetails account={account} busy={busy} onBusy={setBusy} onSaved={setAccount} onNotice={setNotice} onError={setError} /> : <>
        <div className="mb-3 flex min-h-11 items-center gap-2"><Store size={18} className="shrink-0 text-stone-500" aria-hidden="true" />{account.restaurants.length > 1 ? <><label className="sr-only" htmlFor="profile-restaurant">Restaurant</label><select id="profile-restaurant" value={activeRestaurantId || ''} disabled={busy} onChange={event => void selectRestaurant(Number(event.target.value), section)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 text-base font-semibold">{account.restaurants.map(item => <option key={item.restaurant_id} value={item.restaurant_id}>{item.restaurant_name}</option>)}</select></> : <p className="truncate text-base font-semibold">{membership?.restaurant_name}</p>}</div>
        <div className="mb-5"><ProfileSections section={section} onSection={openSection} /></div>
        {busy ? <ProfileSkeleton compact /> : <>
          {section === 'orders' && <OrderHistory orders={orders} onOpen={setSelectedOrder} />}
          {section === 'rewards' && <Rewards membership={membership} offers={offers} busy={busy} onApply={applyOffer} />}
          {section === 'credit' && <Receivables summary={receivables} />}
          {section === 'communication' && <CommunicationPreferences restaurantName={membership?.restaurant_name || 'this restaurant'} marketing={marketing} emailChoice={emailChoice} smsChoice={smsChoice} phone={account.phone} busy={busy} onEmailChoice={setEmailChoice} onSmsChoice={setSmsChoice} onAccount={() => openSection('account')} onSave={saveMarketingChoices} />}
        </>}
      </>}
    </>}
    {(notice || error) && <p role={error ? 'alert' : 'status'} className={`mt-4 rounded-xl p-4 text-sm ${error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>{error || notice}</p>}
    {selectedOrder && <OrderReceipt order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
  </main>;

  return <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
    <header className="flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-orange-50 text-lg font-semibold text-orange-700">{account?.name?.trim().charAt(0).toUpperCase() || "Y"}</span>
      <div className="min-w-0 flex-1"><h1 className="truncate text-lg font-semibold text-stone-950">{account?.name || "Your profile"}</h1><p className="truncate text-xs text-stone-500">Your account at {membership?.restaurant_name || restaurantName || "this restaurant"}</p></div>
      {!embedded && <button type="button" onClick={() => setScannerOpen(true)} aria-label="Scan table QR" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-stone-200 bg-white text-stone-600"><ScanLine size={18} aria-hidden="true" /></button>}
      <button type="button" onClick={() => openSection("account")} aria-label="Edit profile" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-orange-500"><Pencil size={17} aria-hidden="true" /></button>
      <button type="button" disabled={busy} onClick={signOut} aria-label="Sign out" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100 focus-visible:ring-2 focus-visible:ring-orange-500"><LogOut size={18} aria-hidden="true" /></button>
    </header>

    {(notice || error) && <div role={error ? "alert" : "status"} aria-live="polite" className={`mt-6 rounded-xl border px-4 py-3 text-sm font-medium ${error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>{error || notice}</div>}

    {account?.restaurants.length ? <div className="mt-5">
      <div className="min-w-0">
        <ProfileSections section={section} onSection={openSection} includeAccount />
        {busy && !preference ? <ProfileSkeleton compact /> : <div className="pt-5">
          {section === "overview" && <div className="space-y-4">{membership && <MembershipLedger membership={membership} compact />}<Overview membership={membership} orders={orders} offers={offers} onSection={openSection} /></div>}
          {section === "orders" && <OrderHistory orders={orders} onOpen={setSelectedOrder} />}
          {section === "credit" && <Receivables summary={receivables} />}
          {section === "rewards" && <Rewards membership={membership} offers={offers} busy={busy} onApply={applyOffer} />}
          {section === "communication" && <CommunicationPreferences restaurantName={membership?.restaurant_name || "this restaurant"} marketing={marketing} emailChoice={emailChoice} smsChoice={smsChoice} phone={account?.phone} busy={busy} onEmailChoice={setEmailChoice} onSmsChoice={setSmsChoice} onAccount={() => openSection("account")} onSave={saveMarketingChoices} />}
          {section === "account" && account && <AccountDetails account={account} busy={busy} onBusy={setBusy} onSaved={setAccount} onNotice={setNotice} onError={setError} />}
        </div>}
      </div>
    </div> : account ? <div className="customer-account-workspace mx-auto mt-5 grid grid-cols-[minmax(0,1fr)] max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,.55fr)] lg:items-start"><AccountDetails account={account} busy={busy} onBusy={setBusy} onSaved={setAccount} onNotice={setNotice} onError={setError} /><EmptyProfile /></div> : <EmptyProfile />}
    {selectedOrder && <OrderReceipt order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    <TableQrScanner open={scannerOpen} onClose={() => setScannerOpen(false)} />
  </main>;
}

function ExpiredInvitation({ invitation, onContinue }: { invitation: CustomerRestaurantInvitation; onContinue: () => void }) {
  return <main className="mx-auto grid max-w-3xl gap-5 px-4 py-6 md:grid-cols-2"><div className="max-w-xl"><Store className="h-10 w-10 text-orange-600" aria-hidden="true" /><p className="mt-7 text-sm font-semibold text-orange-700">Invitation expired</p><h1 className="mt-2 text-balance font-display text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">You can still follow {invitation.restaurant_name}.</h1><p className="mt-4 max-w-lg leading-7 text-stone-600">Only the secure invitation link expired. Your restaurant customer record, points and visit history are still available.</p></div><section className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-[0_20px_70px_rgba(28,25,23,0.08)] sm:p-8"><h2 className="font-display text-2xl font-semibold text-stone-950">Choose what to do</h2><p className="mt-2 text-sm leading-6 text-stone-600">Sign in or create an account with the saved email address or mobile number. Yummy will then match you through the normal secure follow flow.</p><button type="button" onClick={onContinue} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">Sign In to Find Restaurant <ArrowRight className="h-4 w-4" aria-hidden="true" /></button>{invitation.restaurant_phone && <a href={`tel:${invitation.restaurant_phone}`} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-stone-300 px-4 font-semibold text-stone-800 hover:border-stone-500 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><Phone className="h-4 w-4" aria-hidden="true" />Ask Restaurant to Resend</a>}<p className="mt-5 text-xs leading-5 text-stone-500">An expired invitation cannot be reopened or automatically renewed.</p></section></main>;
}

function EnrollmentPrompt({ restaurantName, invited, busy, error, onEnroll, onSignOut }: { restaurantName: string; invited: boolean; busy: boolean; error: string; onEnroll: () => void; onSignOut: () => void }) {
  return <main className="mx-auto grid max-w-3xl gap-5 px-4 py-6 md:grid-cols-2"><div className="max-w-xl"><Store className="h-10 w-10 text-orange-600" aria-hidden="true" /><p className="mt-7 text-sm font-semibold text-orange-700">{invited ? "Restaurant invitation" : "Discover a restaurant"}</p><h1 className="mt-2 text-balance font-display text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">Follow {restaurantName}?</h1><p className="mt-4 max-w-lg leading-7 text-stone-600">{invited ? "Confirm this restaurant relationship to bring your saved visits, points and offers into your Yummy profile." : "Following saves this restaurant to your Yummy profile and lets you choose email and SMS offers."}</p></div><section className="rounded-[1.5rem] border border-stone-200 bg-white p-6 shadow-[0_20px_70px_rgba(28,25,23,0.08)] sm:p-8"><h2 className="font-display text-2xl font-semibold text-stone-950">{invited ? "Confirm your connection" : "Stay connected"}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{invited ? "Yummy will verify that this account owns the email address or mobile number saved by the restaurant. Marketing messages remain off until you choose them." : "Your communication choices remain under your control."}</p>{error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}<button type="button" disabled={busy} onClick={onEnroll} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-label="Following restaurant" /> : <>Follow restaurant <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}</button><button type="button" onClick={onSignOut} className="mt-3 min-h-11 w-full text-sm font-medium text-stone-600 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Use another account</button></section></main>;
}

function ProfileSections({ section, onSection, includeAccount = false }: { section: Section; onSection: (section: Section) => void; includeAccount?: boolean }) {
  const items = [
    ...(includeAccount ? [{ id: "overview" as Section, label: "Overview", icon: Store }] : []),
    { id: "orders" as Section, label: "Orders", icon: History },
    { id: "rewards" as Section, label: "Rewards", icon: Gift },
    { id: "credit" as Section, label: "Payments", icon: Banknote },
    { id: "communication" as Section, label: "Preferences", icon: MessageSquareText },
    ...(includeAccount ? [{ id: "account" as Section, label: "Account", icon: UserRound }] : []),
  ];
  return <nav aria-label="Restaurant profile sections" className={`grid gap-1 rounded-xl bg-stone-100 p-1 ${includeAccount ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-4"}`}>{items.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => onSection(id)} aria-label={id === "credit" ? "Payments due" : label} aria-current={section === id ? "page" : undefined} className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg px-1 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:text-xs ${includeAccount ? "flex-row" : "flex-col sm:flex-row"} ${section === id ? "bg-white text-orange-700 shadow-sm" : "text-stone-500 hover:text-stone-950"}`}><Icon size={15} className="shrink-0" aria-hidden="true" /><span>{label}</span></button>)}</nav>;
}

function MembershipLedger({ membership, compact }: { membership: CustomerRestaurantMembership; compact: boolean }) {
  const following = membership.relationship_status === "subscriber";
  return <section className="rounded-2xl border border-stone-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-stone-500">{following ? "Restaurant status" : "Available points"}</span><Gift size={18} className="text-orange-600" aria-hidden="true" /></div><p className="mt-2 text-xl font-bold tabular-nums">{following ? "Following" : membership.loyalty_points}</p><dl className="mt-3 grid grid-cols-2 gap-3 border-t border-stone-100 pt-3 text-xs"><div><dt className="text-stone-500">Visits</dt><dd className="mt-1 font-semibold">{membership.total_orders}</dd></div><div><dt className="text-stone-500">Lifetime spend</dt><dd className="mt-1 font-semibold break-words">{currency.format(membership.total_spent)}</dd></div></dl></section>;
}

function Overview({ membership, orders, offers, onSection }: { membership: CustomerRestaurantMembership | null; orders: CustomerOrder[]; offers: CustomerOffer[]; onSection: (section: Section) => void }) {
  return <section><h2 className="mb-3 text-sm font-semibold text-stone-950">At a glance</h2><div className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">{[
    { id: "orders" as Section, label: "Order history", detail: `${orders.length} saved orders`, icon: History },
    { id: "rewards" as Section, label: "Rewards & offers", detail: `${offers.length} available offers`, icon: Gift },
    { id: "credit" as Section, label: "Payments due", detail: "View your restaurant balance", icon: Banknote },
    { id: "communication" as Section, label: "Communication preferences", detail: "Manage email and SMS offers", icon: MessageSquareText },
  ].map(({ id, label, detail, icon: Icon }) => <button key={id} type="button" onClick={() => onSection(id)} className="flex min-h-16 w-full items-center gap-3 p-4 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"><Icon size={18} className="shrink-0 text-orange-600" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="mt-0.5 block text-xs text-stone-500">{detail}</span></span><ChevronRight size={17} className="shrink-0 text-stone-400" aria-hidden="true" /></button>)}</div></section>;
}

function OrderHistory({ orders, onOpen }: { orders: CustomerOrder[]; onOpen: (order: CustomerOrder) => void }) {
  return <section><h2 className="text-lg font-semibold text-stone-950">Order history</h2><p className="mt-1 text-sm text-stone-600">Your past visits and itemized estimates.</p>{orders.length ? <div className="mt-3 overflow-hidden rounded-2xl border border-stone-200 bg-white">{orders.map((order) => <button type="button" key={order.id} onClick={() => onOpen(order)} className="group grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-stone-200 p-4 text-left last:border-0 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-stone-950">Order #{order.id}</span><span className="text-xs font-medium capitalize text-stone-500">{order.status}</span></div><p className="mt-1 text-sm text-stone-500">{shortDate.format(new Date(order.created_at))}</p><p className="mt-2 truncate text-xs text-stone-600">{order.items.map((item) => `${item.quantity} x ${item.name}`).join(", ")}</p></div><div className="flex items-center gap-3"><span className="font-display font-semibold tabular-nums text-stone-950">{currency.format(order.grand_total)}</span><ChevronRight className="h-5 w-5 text-stone-300 group-hover:text-orange-600" aria-hidden="true" /></div></button>)}</div> : <Empty icon={<ReceiptText size={20} />} title="No orders yet" text="Your completed visits will appear here." />}</section>;
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
    <h2 className="text-lg font-semibold text-stone-950">Payments due</h2>
    <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between gap-3 p-4"><div><p className="text-xs text-stone-500">Amount to pay</p><p className="mt-1 text-2xl font-semibold tabular-nums">{currency.format(summary.amount_due)}</p></div>{summary.amount_due === 0 && <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"><Check size={14} aria-hidden="true" />All settled</span>}</div>
      {summary.restaurant_credit > 0 && <div className="border-t border-stone-100 bg-emerald-50 p-4 text-xs leading-5 text-emerald-900"><span className="font-semibold">Restaurant credit: </span>{currency.format(summary.restaurant_credit)}. Contact the restaurant to use it or arrange a refund.</div>}
      <p className="border-t border-stone-100 px-4 py-3 text-xs leading-5 text-stone-500">Payments are handled directly by the restaurant.</p>
    </div>
    {entries.length > 0 && <div className="mt-4"><h3 className="mb-2 text-sm font-semibold">Transactions</h3><div className="divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">{entries.map(entry => <div key={entry.key} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="break-words text-sm font-medium">{entry.title}</p><p className="mt-1 text-xs leading-5 text-stone-500">{shortDate.format(new Date(entry.date))}{entry.openAmount > 0 ? ` · ${currency.format(entry.openAmount)} remaining` : " · Settled"}</p></div><p className={`shrink-0 text-sm font-semibold tabular-nums ${entry.kind === "credit" ? "text-green-700" : "text-stone-950"}`}>{entry.kind === "credit" ? "−" : "+"}{currency.format(entry.amount)}</p></div>)}</div></div>}
  </section>;
}

function CommunicationPreferences({ restaurantName, marketing, emailChoice, smsChoice, phone, busy, onEmailChoice, onSmsChoice, onAccount, onSave }: { restaurantName: string; marketing: CustomerMarketingPreferences | null; emailChoice: boolean | null; smsChoice: boolean | null; phone?: string; busy: boolean; onEmailChoice: (value: boolean) => void; onSmsChoice: (value: boolean) => void; onAccount: () => void; onSave: () => void }) {
  if (!marketing) return <Empty icon={<MessageSquareText />} title="Preferences unavailable" text="Campaign preferences could not be loaded. Refresh and try again." />;
  const smsEnabled = smsChoice ?? marketing.sms_opted_in;
  const emailEnabled = emailChoice ?? marketing.email_opted_in;
  const changed = emailEnabled !== marketing.email_opted_in || smsEnabled !== marketing.sms_opted_in;
  return <section><h2 className="text-lg font-semibold">Preferences</h2><p className="mt-1 text-sm leading-5 text-stone-500">Offers from {restaurantName}. Change these anytime.</p><form onSubmit={event => { event.preventDefault(); void onSave(); }} className="mt-3 max-w-2xl overflow-hidden rounded-xl border border-stone-200 bg-white"><div className="divide-y divide-stone-100">
    <PreferenceSwitch label="Email offers" icon={<Mail size={18} />} enabled={emailEnabled} available={marketing.email_available} busy={busy} onChange={onEmailChoice} />
    <PreferenceSwitch label="SMS offers" icon={<MessageSquareText size={18} />} enabled={smsEnabled} available={marketing.sms_available} busy={busy} onChange={onSmsChoice} />
    {smsEnabled && !phone && <p className="px-4 py-3 text-xs leading-5 text-amber-800">Add a mobile number in <button type="button" onClick={onAccount} className="min-h-11 font-semibold underline">Account details</button> to enable SMS.</p>}
  </div><div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-4 py-3"><button type="button" onClick={onAccount} className="min-h-11 text-xs font-medium text-stone-500 hover:text-orange-700">Edit contact details</button><button type="submit" disabled={busy || !changed || (smsEnabled && !phone)} className="customer-primary-button">{busy ? <Loader2 size={16} className="animate-spin" aria-label="Saving" /> : "Save changes"}</button></div></form></section>;
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
  return <section className="min-w-0"><h2 className="text-lg font-semibold text-stone-950">Edit profile</h2><p className="mt-1 text-sm leading-5 text-stone-500">Your name and contact details.</p><div className="mt-3 max-w-2xl overflow-hidden customer-card"><form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-4 p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-50 text-lg font-semibold text-orange-700" aria-hidden="true">{profileName.trim().charAt(0).toUpperCase() || "Y"}</span><div><h3 className="text-sm font-semibold">Profile details</h3></div></div><Field label="Name"><input name="name" autoComplete="name" required value={profileName} onChange={(event) => setProfileName(event.target.value)} className="profile-input" /></Field><button type="submit" disabled={busy || !profileName.trim() || profileName.trim() === account.name.trim()} className="customer-primary-button"><Check className="h-4 w-4" aria-hidden="true" />Save changes</button></form><div className="border-t border-stone-100 p-4"><h3 className="text-sm font-semibold text-stone-950">Contact details</h3><p className="mt-1 text-xs leading-5 text-stone-500">Verify each contact before using it to sign in.</p><div className="mt-3 divide-y divide-stone-100">{(["email", "phone"] as const).map((type) => { const value = type === "email" ? account.email : account.phone; const verified = type === "email" ? account.email_verified : account.phone_verified; const active = contactType === type; return <div key={type} className="py-3"><div className="flex min-h-11 items-center justify-between gap-2"><div className="min-w-0 flex-1"><p className="text-xs text-stone-500">{type === "email" ? "Email address" : "Mobile number"}</p><p className="mt-1 break-all text-sm font-medium text-stone-950">{value || `No ${type === "email" ? "email address" : "mobile number"} added`}</p></div>{verified ? <span className="shrink-0 rounded-full bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700">Verified</span> : !active && <button type="button" onClick={() => beginContact(type, value || "")} className="min-h-11 shrink-0 rounded-full border border-stone-300 px-4 text-sm font-semibold hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">{value ? `Verify ${type === "email" ? "email" : "phone"}` : `Add ${type === "email" ? "email" : "phone"}`}</button>}</div>{active && <form onSubmit={(event) => { event.preventDefault(); void verifyContact(); }} className="mt-4 space-y-4 border-t border-stone-200 pt-4"><Field label={type === "email" ? "Email address" : "Mobile number"}><input name={`${type}-contact`} type={type === "email" ? "email" : "tel"} inputMode={type === "email" ? "email" : "tel"} autoComplete={type === "email" ? "email" : "tel"} required value={contact} onChange={(event) => { setContact(event.target.value); setContactStep("idle"); setContactCode(""); }} className="profile-input" placeholder={type === "email" ? "you@example.com" : "+977 98…"} /></Field>{contactStep === "code" && <Field label="Six-digit verification code"><input name="contact-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={contactCode} onChange={(event) => setContactCode(event.target.value.replace(/\D/g, ""))} className="profile-input text-center font-display text-xl tracking-[0.25em]" /></Field>}<div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || !contact.trim() || (contactStep === "code" && contactCode.length !== 6)} className="customer-primary-button">{contactStep === "idle" ? "Send code" : `Verify ${type === "email" ? "email" : "phone"}`}</button><button type="button" onClick={cancelContact} className="min-h-11 rounded-full px-4 text-sm font-semibold text-stone-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Cancel</button></div></form>}</div>; })}</div></div><details className="group border-t border-stone-100"><summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 [&::-webkit-details-marker]:hidden"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-500"><LockKeyhole size={18} aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Password &amp; security</span><span className="mt-1 block text-xs text-stone-500">{account.has_password ? "Update your sign-in password" : "Set up a sign-in password"}</span></span><ChevronRight size={18} aria-hidden="true" className="shrink-0 text-stone-400 transition-transform group-open:rotate-90 motion-reduce:transition-none" /></summary><form onSubmit={(event) => { event.preventDefault(); void savePassword(); }} className="space-y-4 px-4 pb-4 "><div><h3 className="sr-only">Password</h3><p className="mt-1 text-xs leading-5 text-stone-500">{account.has_password ? "Replace your current password." : "Set a password for email or phone sign-in."}</p></div>{account.has_password && <Field label="Current password"><input name="current-password" type="password" autoComplete="current-password" minLength={8} required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="profile-input" /></Field>}<Field label="New password"><input name="new-password" type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="profile-input" placeholder="At least 8 characters" /></Field><button type="submit" disabled={busy || newPassword.length < 8 || (account.has_password && currentPassword.length < 8)} className="customer-primary-button">Save password</button></form></details></div></section>;
}

function PreferenceSwitch({ label, icon, enabled, available, busy, onChange }: { label: string; icon: React.ReactNode; enabled: boolean; available: boolean; busy: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center gap-3 px-4 py-3"><span className="shrink-0 text-stone-500" aria-hidden="true">{icon}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs text-stone-500">{!available ? enabled ? "You can turn off existing consent" : "Not offered by this restaurant" : enabled ? "On" : "Off"}</p></div><button type="button" role="switch" aria-label={label} aria-checked={enabled} disabled={busy || (!available && !enabled)} onClick={() => onChange(!enabled)} className="grid h-11 w-12 shrink-0 place-items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-40"><span className={`flex h-6 w-10 items-center rounded-full p-0.5 ${enabled ? "bg-orange-600" : "bg-stone-300"}`}><span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none ${enabled ? "translate-x-4" : ""}`} /></span></button></div>;
}

function Rewards({ membership, offers, busy, onApply }: { membership: CustomerRestaurantMembership | null; offers: CustomerOffer[]; busy: boolean; onApply: (offer: CustomerOffer) => void }) {
  const spendRemaining = membership?.next_level_spend_remaining ?? 0;
  const visitsRemaining = membership?.next_level_visits_remaining ?? 0;
  const nextLevelRequirements = [
    spendRemaining > 0 ? `${currency.format(spendRemaining)} more spend` : null,
    visitsRemaining > 0 ? `${visitsRemaining} more ${visitsRemaining === 1 ? "visit" : "visits"}` : null,
  ].filter(Boolean).join(" and ");
  return <section><h2 className="text-lg font-semibold text-stone-950">Rewards</h2><div className="mt-3 rounded-2xl bg-stone-950 p-5 text-white"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">{membership?.level_name || "Member"}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{membership?.loyalty_points ?? 0} <span className="text-sm font-medium text-white/60">points</span></p></div><Gift size={22} className="text-orange-400" aria-hidden="true" /></div>{membership?.level_benefit ? <p className="mt-4 break-words text-sm leading-6 text-white/70">{membership.level_benefit}</p> : null}{membership?.level_points_multiplier && membership.level_points_multiplier > 1 ? <p className="mt-2 text-xs font-medium text-orange-300">Earn {membership.level_points_multiplier}× points on new orders</p> : null}{membership?.next_level_name ? <div className="mt-5 border-t border-white/15 pt-4"><p className="text-xs text-white/55">Next level: <span className="font-semibold text-white">{membership.next_level_name}</span></p><p className="mt-2 text-xs leading-5 text-white/70">{nextLevelRequirements || "Requirements reached. Your level updates after the next completed order."}</p></div> : membership?.level_name ? <p className="mt-5 border-t border-white/15 pt-4 text-xs text-orange-300">You reached the highest level.</p> : null}</div>{offers.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{offers.map(offer => <article key={offer.recipient_id} className="rounded-xl border border-stone-200 bg-white p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Tag size={16} className="shrink-0 text-orange-600" aria-hidden="true" />{offer.name}</h3><p className="mt-2 text-xs leading-5 text-stone-500">{offer.discount_type === "percentage" ? `${offer.value}% off` : currency.format(offer.value)} · Expires {shortDate.format(new Date(offer.valid_until))}</p><div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-stone-50 px-3 py-2"><span className="text-xs text-stone-500">Offer code</span><code className="select-all text-sm font-bold tracking-[0.14em] text-stone-950">{offer.offer_code}</code></div><button type="button" disabled={busy} onClick={() => onApply(offer)} className="mt-3 min-h-11 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700 focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">Use on current order</button></article>)}</div> : <Empty icon={<Tag size={20} />} title="No offers right now" text="New restaurant offers will appear here." />}</section>;
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
  return <main className="mx-auto w-full max-w-md px-4 py-6 sm:py-10"><div className="mb-5"><h1 className="font-display text-2xl font-semibold text-stone-950">Welcome to Yummy</h1><p className="mt-2 text-sm leading-6 text-stone-600">Sign in to browse and order. A scanned table stays connected.</p></div><form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6"><h2 className="font-display text-2xl font-semibold text-stone-950">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{!enteringIdentifier ? <>Enter the code sent to <strong>{identifier}</strong>.</> : mode === "signup" ? "Verify your email or mobile number to create an account." : mode === "recovery" ? "We’ll verify your identity before setting a new password." : "Enter your password to continue."}</p>{enteringIdentifier ? <><div className="mt-6 grid grid-cols-2 rounded-xl bg-stone-100 p-1" role="group" aria-label="Sign-in method"><button type="button" aria-pressed={method === "email"} onClick={() => chooseMethod("email")} className={`min-h-11 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${method === "email" ? "bg-white text-stone-950 shadow-sm" : "text-stone-600"}`}>Email</button><button type="button" aria-pressed={method === "phone"} onClick={() => chooseMethod("phone")} className={`min-h-11 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${method === "phone" ? "bg-white text-stone-950 shadow-sm" : "text-stone-600"}`}>Mobile</button></div>{mode === "signup" && <Field label="Your name" className="mt-4"><input name="name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} className="profile-input" /></Field>}<Field label={method === "email" ? "Email address" : "Mobile number"} className="mt-4"><input name="identifier" type={method === "email" ? "email" : "tel"} inputMode={method === "email" ? "email" : "tel"} autoComplete={method === "email" ? "email" : "tel"} spellCheck={false} required value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="profile-input" placeholder={method === "email" ? "you@example.com" : "98XXXXXXXX"} /></Field>{mode === "signin" && <Field label="Password" className="mt-4"><input name="password" type="password" autoComplete="current-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="profile-input" /></Field>}{mode === "signup" && <Field label="Create password" className="mt-4"><input name="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="profile-input" placeholder="At least 8 characters" /></Field>}{mode === "recovery" && <Field label="New password" className="mt-4"><input name="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="profile-input" placeholder="At least 8 characters" /></Field>}</> : <Field label="Six-digit verification code" className="mt-6"><input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="profile-input text-center font-display text-2xl tracking-[0.3em]" /></Field>}{error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}<button disabled={busy || (!enteringIdentifier && code.length !== 6) || (enteringIdentifier && password.length < 8)} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 font-semibold text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-label="Working" /> : <>{enteringIdentifier ? mode === "signin" ? "Sign in" : "Send verification code" : mode === "signup" ? "Create account" : "Reset password"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}</button>{enteringIdentifier && mode === "signin" && <div className="mt-3 flex flex-col items-center gap-1"><button type="button" onClick={() => chooseMode("recovery")} className="min-h-10 px-3 text-sm font-semibold text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Forgot password?</button>{error && <button type="button" onClick={() => chooseMode("recovery")} className="min-h-10 px-3 text-sm font-semibold text-stone-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Sign in with a verification code</button>}</div>}{enteringIdentifier && <p className="mt-4 text-center text-sm text-stone-600">{mode === "signup" ? "Already have an account?" : "New to Yummy?"} <button type="button" onClick={() => chooseMode(mode === "signup" ? "signin" : "signup")} className="min-h-11 px-1 font-semibold text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">{mode === "signup" ? "Sign in" : "Create account"}</button></p>}{!enteringIdentifier && <button type="button" disabled={busy} onClick={() => { setCode(""); void sendCode(); }} className="mt-3 min-h-11 w-full text-sm font-semibold text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">Send a new code</button>}{enteringIdentifier && mode === "signin" && <><div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-stone-400"><span className="h-px flex-1 bg-stone-200" />or<span className="h-px flex-1 bg-stone-200" /></div><button type="button" disabled={busy} onClick={() => void signInWithGoogle()} className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white font-semibold text-stone-950 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"><GoogleLogo />Continue with Google</button></>}</form></main>;
}

function GoogleLogo() { return <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.35l-3.24-2.55c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.63A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.08 12c0-.67.12-1.32.31-1.93V7.44H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.56l3.35-2.63Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.44l3.35 2.63C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>; }

function PreferenceGate({ membership, marketing, emailChoice, smsChoice, phone, busy, error, setEmailChoice, setSmsChoice, save }: any) {
  return <main className="mx-auto grid max-w-3xl gap-5 px-4 py-6 md:grid-cols-2"><div><Sparkles className="h-10 w-10 text-orange-600" /><h1 className="mt-6 text-balance font-display text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">Choose how this restaurant contacts you.</h1><p className="mt-4 max-w-lg leading-7 text-stone-600">These choices apply only to {membership?.restaurant_name || "this restaurant"}. Your personal details stay in Account.</p></div><form onSubmit={(event) => { event.preventDefault(); void save(); }} className="rounded-[1.5rem] border border-stone-200 bg-white p-6 sm:p-8"><h2 className="font-display text-2xl font-semibold">Marketing choices</h2><div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">{marketing.email_decision_required && <ChannelChoice icon={<Mail />} legend="Email offers" name="email" value={emailChoice} onChange={setEmailChoice} />}{marketing.sms_decision_required && <div className="py-5"><ChannelChoice icon={<MessageSquareText />} legend="SMS offers" name="sms" value={smsChoice} onChange={setSmsChoice} compact />{smsChoice && !phone && <p className="mt-3 text-sm text-amber-800">No mobile number is saved. Choose No for now, then add one in Account and enable SMS later.</p>}</div>}</div>{error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}<button disabled={busy || (marketing.email_decision_required && emailChoice === null) || (marketing.sms_decision_required && smsChoice === null) || (smsChoice && !phone)} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 font-semibold text-white hover:bg-orange-600 disabled:opacity-50">Save choices <ArrowRight className="h-4 w-4" /></button></form></main>;
}

function OrderReceipt({ order, onClose }: { order: CustomerOrder; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const subtotal = order.items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; ref.current?.querySelector<HTMLButtonElement>("button")?.focus(); return () => previous?.focus(); }, []);
  const keepFocusInside = (event: React.KeyboardEvent<HTMLElement>) => { if (event.key !== "Tab") return; const controls = ref.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"); if (!controls?.length) return; const first = controls[0]; const last = controls[controls.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } };
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-950/40 p-0 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={ref} onKeyDown={keepFocusInside} role="dialog" aria-modal="true" aria-labelledby="receipt-title" className="flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
      <header className="flex shrink-0 items-start gap-3 border-b border-stone-100 p-4 sm:px-5">
        <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600"><ReceiptText size={20} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1"><h2 id="receipt-title" className="text-lg font-semibold">Order #{order.id}</h2><p className="mt-1 break-words text-xs text-stone-500">{order.restaurant_name} · {shortDate.format(new Date(order.created_at))}</p><p className="mt-1 text-xs capitalize text-stone-500">{order.status}</p></div>
        <button type="button" onClick={onClose} aria-label="Close order details" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Itemized estimate</h3>
        <div className="mt-2">{order.items.map((item, index) => <div key={`${order.id}-${index}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 border-b border-stone-100 py-3 text-sm"><span className="font-medium text-orange-700">{item.quantity}×</span><span className="break-words font-medium">{item.name}</span><span className="font-semibold tabular-nums">{currency.format(item.line_total)}</span></div>)}</div>
        <div className="mt-4 flex justify-between gap-3 text-sm text-stone-500"><span>Items subtotal</span><span className="tabular-nums">{currency.format(subtotal)}</span></div>
        <div className="mt-3 flex justify-between gap-3 border-t border-stone-100 pt-3 text-base font-semibold"><span>Estimated total</span><span className="tabular-nums">{currency.format(order.grand_total)}</span></div>
        <p className="mt-4 text-xs leading-5 text-stone-500">For reference only. The restaurant-issued fiscal receipt is the final record.</p>
      </div>
    </section>
  </div>;
}

function EmptyProfile() { return <section className="rounded-2xl border border-stone-200 bg-white p-5"><Store className="h-5 w-5 text-orange-600" aria-hidden="true" /><h2 className="mt-3 text-lg font-semibold">Your restaurants</h2><p className="mt-2 text-sm leading-6 text-stone-500">Scan a table or follow a restaurant to keep your visits, rewards and offers here.</p><Link href="/?view=discover" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-orange-700">Find restaurants <ArrowRight size={16} aria-hidden="true" /></Link></section>; }

function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="mt-3 flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-500" aria-hidden="true">{icon}</span><div className="min-w-0"><h3 className="text-sm font-semibold text-stone-950">{title}</h3><p className="mt-1 text-xs leading-5 text-stone-500">{text}</p></div></div>; }
function ProfileSkeleton({ compact = false }: { compact?: boolean }) { return <div className={`mx-auto max-w-6xl animate-pulse px-4 ${compact ? "py-4" : "py-12"}`} aria-label="Loading profile"><div className="h-8 w-48 rounded bg-stone-200" /><div className="mt-5 h-40 rounded-2xl bg-stone-200" /></div>; }
function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) { return <label className={`block text-sm font-medium text-stone-800 ${className}`}>{label}<span className="mt-2 block">{children}</span></label>; }
function ChannelChoice({ icon, legend, name, value, onChange, compact = false, disableYes = false }: any) { return <fieldset className={compact ? "" : "py-5"}><legend className="flex items-center gap-2 font-semibold text-stone-950">{icon}{legend}</legend><div className="mt-3 grid grid-cols-2 gap-2">{[{ label: "Yes", value: true }, { label: "No", value: false }].map((option) => { const disabled = option.value && disableYes; return <label key={option.label} className={`flex min-h-12 items-center justify-center rounded-xl border text-sm font-semibold focus-within:ring-2 focus-within:ring-orange-500 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${value === option.value ? "border-stone-950 bg-stone-950 text-white" : "border-stone-300 bg-white text-stone-700"}`}><input type="radio" className="sr-only" name={name} checked={value === option.value} disabled={disabled} onChange={() => onChange(option.value)} />{option.label}</label>; })}</div>{disableYes && <p className="mt-2 text-xs text-stone-500">This restaurant has not completed marketing consent setup. You can still choose No to unsubscribe.</p>}</fieldset>; }
