import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/options';
import DashboardClient from '@/components/auth/DashboardClient';

export const metadata = { title: 'Dashboard · ArduinoSim' };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');
  return <DashboardClient />;
}
