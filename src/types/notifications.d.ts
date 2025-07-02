declare global {
  interface NotificationOptions {
    vibrate?: number[] | number;
    badge?: string;
    data?: any;
    actions?: NotificationAction[];
    silent?: boolean;
    requireInteraction?: boolean;
    renotify?: boolean;
    timestamp?: number;
  }

  interface NotificationAction {
    action: string;
    title: string;
    icon?: string;
  }
}

export {};
