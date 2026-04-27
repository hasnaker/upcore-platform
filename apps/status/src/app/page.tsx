import { redirect } from 'next/navigation';

// Root → /status yönlendirmesi. Ana URL (status.upcore.io) doğrudan status'e düşsün.
export default function Home() {
  redirect('/status');
}
