import { redirect } from "next/navigation";

interface PageProps {
  params: {
    token: string;
  };
}

export const dynamic = "force-dynamic";

export default async function LegacyQrTokenRedirectPage({ params }: PageProps) {
  redirect(`/v/${params.token}`);
}
