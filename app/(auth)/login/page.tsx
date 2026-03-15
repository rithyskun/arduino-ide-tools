import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export const metadata = { title: 'Sign In · ArduinoSim' };

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-40 flex items-center justify-center font-mono text-xs text-fg-subtle">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
