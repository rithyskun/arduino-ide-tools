import { Suspense } from 'react';
import RegisterForm from '@/components/auth/RegisterForm';

export const metadata = { title: 'Create Account · ArduinoSim' };

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div
          className="h-40 flex items-center justify-center font-mono text-xs"
          style={{ color: 'var(--fg-subtle)' }}
        >
          Loading…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
