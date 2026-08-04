import * as amplitude from '@amplitude/analytics-browser';

export function track(event: string, properties?: Record<string, unknown>) {
  amplitude.track(event, properties);
}

export function identify(userId: string) {
  amplitude.setUserId(userId);
}
