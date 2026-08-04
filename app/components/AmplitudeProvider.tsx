'use client';
import { useEffect } from 'react';
import * as amplitude from '@amplitude/analytics-browser';
import { sessionReplayPlugin } from '@amplitude/plugin-session-replay-browser';

export default function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
    if (key) {
      amplitude.init(key, { autocapture: true });
      amplitude.add(sessionReplayPlugin({ sampleRate: 1 }));
    }
  }, []);
  return <>{children}</>;
}
