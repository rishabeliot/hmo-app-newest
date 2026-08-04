'use client';
import { useEffect } from 'react';
import * as amplitude from '@amplitude/analytics-browser';

export default function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
    if (!key) return;

    import('@amplitude/plugin-session-replay-browser')
      .then(({ sessionReplayPlugin }) => {
        amplitude.add(sessionReplayPlugin({ sampleRate: 1 }));
        amplitude.init(key, { autocapture: true });
      })
      .catch((e) => {
        console.error('[Amplitude SR] Session replay plugin failed to load:', e);
        amplitude.init(key, { autocapture: true });
      });
  }, []);
  return <>{children}</>;
}
