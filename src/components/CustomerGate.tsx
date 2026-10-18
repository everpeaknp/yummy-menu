"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import CustomerProfile from './CustomerProfile';
import { CustomerAccount, getCustomerAccount, getStoredCustomerToken, refreshCustomerSession } from '@/services/api';

export default function CustomerGate({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const invalidate = useCallback(() => { ++requestVersion.current; }, []);
  const restore = useCallback(async () => {
    const version = ++requestVersion.current;
    setError('');
    try {
      if (!getStoredCustomerToken()) await refreshCustomerSession();
      const current = await getCustomerAccount();
      if (version === requestVersion.current) setAccount(current);
    } catch (requestError: any) {
      if (version !== requestVersion.current) return;
      if (requestError.response?.status === 401) setAccount(null);
      else setError('We could not connect to Yummy. Try again to continue.');
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, []);
  useEffect(() => {
    void restore();
    const sync = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== 'yummy_customer_token') return;
      if (!getStoredCustomerToken()) { invalidate(); setAccount(null); setError(''); setLoading(false); return; }
      void restore();
    };
    window.addEventListener('storage', sync);
    window.addEventListener('yummy_customer_session_updated', sync);
    return () => {
      invalidate();
      window.removeEventListener('storage', sync);
      window.removeEventListener('yummy_customer_session_updated', sync);
    };
  }, [restore, invalidate]);
  if (loading) return <div className="grid min-h-[60dvh] place-items-center"><div role="status" className="flex items-center gap-3 text-sm text-stone-500"><Loader2 className="h-5 w-5 animate-spin" />Opening Yummy…</div></div>;
  if (error) return <div className="mx-auto max-w-sm px-5 py-16 text-center"><p role="alert" className="text-sm text-stone-600">{error}</p><button onClick={() => void restore()} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-600 px-5 font-semibold text-white"><RefreshCw size={18} />Try again</button></div>;
  if (!account) return <CustomerProfile authenticationOnly onAuthenticated={setAccount} />;
  return <>{children}</>;
}
