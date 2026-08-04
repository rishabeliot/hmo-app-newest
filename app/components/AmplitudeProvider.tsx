'use client';
import { useEffect } from 'react';
import * as amplitude from '@amplitude/analytics-browser';

export default function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
    if (!key) return;

    console.log('[Amplitude] init starting, key present:', !!key);
    import('@amplitude/plugin-session-replay-browser')
      .then(({ sessionReplayPlugin }) => {
        console.log('[Amplitude SR] plugin loaded, adding...');
        const plugin = sessionReplayPlugin({ sampleRate: 1 });
        const addResult = amplitude.add(plugin);
        console.log('[Amplitude SR] plugin added, result:', addResult);
        amplitude.init(key, { autocapture: true });
        console.log('[Amplitude SR] init complete');
      })
      .catch((e) => {
        console.error('[Amplitude SR] plugin failed to load:', e);
        amplitude.init(key, { autocapture: true });
      });
  }, []);
  return <>{children}</>;
}
