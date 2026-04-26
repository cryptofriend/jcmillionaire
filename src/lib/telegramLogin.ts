import { supabase } from '@/integrations/supabase/client';
import { isInWorldApp } from '@/lib/minikit';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Open Telegram Login Widget in a popup
 */
export function openTelegramLogin(botName: string): Promise<TelegramUser | null> {
  return new Promise((resolve) => {
    if (isInWorldApp()) {
      resolve(null);
      return;
    }

    // Set up the global callback
    (window as any).onTelegramAuth = (user: TelegramUser) => {
      resolve(user);
    };

    const width = 550;
    const height = 470;
    const left = Math.floor(screen.width / 2 - width / 2);
    const top = Math.floor(screen.height / 2 - height / 2);

    const popup = window.open(
      `https://oauth.telegram.org/auth?bot_id=${botName}&origin=${encodeURIComponent(window.location.origin)}&embed=0&request_access=write&return_to=${encodeURIComponent(window.location.origin)}`,
      'telegram_login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Listen for message from redirect
    const handler = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data?.type === 'telegram_auth') {
        window.removeEventListener('message', handler);
        resolve(event.data.user as TelegramUser);
      }
    };
    window.addEventListener('message', handler);

    // Fallback: poll for popup close
    const timer = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', handler);
        resolve(null);
      }
    }, 500);
  });
}

/**
 * Authenticate with Telegram using the login widget callback data
 */
export async function authenticateWithTelegram(telegramUser: TelegramUser): Promise<{
  success: boolean;
  user?: {
    id: string;
    verification_level: string;
    wallet_address: string;
    created_at: string;
    username?: string;
    profile_picture_url?: string;
  };
  error?: string;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-telegram', {
      body: telegramUser,
    });

    if (error) {
      console.error('Telegram verification failed:', error);
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Verification failed' };
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Telegram authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Telegram authentication failed',
    };
  }
}

/**
 * Load Telegram Login Widget script and render inline button
 */
export function loadTelegramWidget(
  containerId: string,
  botName: string,
  onAuth: (user: TelegramUser) => void
): void {
  // Set global callback
  (window as any).onTelegramAuth = onAuth;

  const container = document.getElementById(containerId);
  if (!container) return;

  // Clear any existing widget
  container.innerHTML = '';

  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-widget.js?22';
  script.setAttribute('data-telegram-login', botName);
  script.setAttribute('data-size', 'large');
  script.setAttribute('data-onauth', 'onTelegramAuth(user)');
  script.setAttribute('data-request-access', 'write');
  script.async = true;

  container.appendChild(script);
}
