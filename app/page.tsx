import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth/options';
import LandingClient from '@/components/landing/LandingClient';

export const metadata = {
  title: 'ArduinoSim — In-browser Arduino IDE & Simulator',
  description:
    'Write, simulate and test Arduino code in your browser. No install, no signup needed to try.',
};

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect('/dashboard');
  return <LandingClient />;
}
