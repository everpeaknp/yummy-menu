import { redirect } from "next/navigation";

interface PageProps {
  params: {
    token: string;
  };
}

export const dynamic = "force-dynamic";

export default async function QrTokenEntryPage({ params }: PageProps) {
  const { token } = params;
  // Route through the client verifier page so QR session is written to localStorage
  // before landing on the menu page.
  redirect(`/qr/${token}`);
}
