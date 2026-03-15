import DemoIDE from '@/components/landing/DemoIDE';

export const metadata = {
  title: 'Demo — ArduinoSim',
  description:
    'Try the Arduino simulator without creating an account. Write code, simulate hardware, send serial commands — all in your browser.',
};

export default function DemoPage() {
  return <DemoIDE />;
}
