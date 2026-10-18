import CustomerHome from '@/components/CustomerHome';

export const dynamic = 'force-dynamic';
export default function ProfilePage() {
  return <CustomerHome initialView="profile" />;
}
