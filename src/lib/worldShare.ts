import { MiniKit } from '@worldcoin/minikit-js';
import { isInWorldApp } from './minikit';
import { APP_ID, encodeWorldAppPath } from './constants';

// World Chat app ID
const WORLD_CHAT_APP_ID = 'app_e293fcd0565f45ca296aa317212d8741';

export interface ShareResult {
  success: boolean;
  error?: string;
}

/**
 * Generate a World App deeplink URL for the game
 * Format: https://world.org/mini-app?app_id={APP_ID}&path={encodedPath}
 */
export function getGameDeeplink(path: string = '/'): string {
  return `https://world.org/mini-app?app_id=${APP_ID}&path=${encodeWorldAppPath(path)}`;
}

/**
 * Generate a referral deeplink for inviting friends
 */
export function getReferralDeeplink(referralCode: string): string {
  return getGameDeeplink(`/?ref=${referralCode}`);
}

/**
 * Generate a World Chat deeplink with a pre-filled message
 * Note: World Chat quick actions use the World Chat app id.
 */
export function getWorldChatDeeplinkUrl({
  username,
  message,
}: {
  username: string;
  message?: string;
}): string {
  let path = `/${username}/draft`;

  if (message) {
    path += `?message=${message}`;
  }

  return `https://world.org/mini-app?app_id=${WORLD_CHAT_APP_ID}&path=${encodeWorldAppPath(path)}`;
}

/**
 * Share the game via World App's native share functionality
 */
export async function shareViaWorldApp(options: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<ShareResult> {
  if (!isInWorldApp()) {
    return { success: false, error: 'Not in World App' };
  }

  try {
    const { finalPayload } = await MiniKit.commandsAsync.share({
      title: options.title,
      text: options.text,
      url: options.url,
    });

    if (finalPayload.status === 'success') {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: (finalPayload as any).error_code || 'Share failed' 
      };
    }
  } catch (error) {
    console.error('Share error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Share failed' 
    };
  }
}

/**
 * Send a message to World Chat contacts
 */
export async function sendToWorldChat(options: {
  message: string;
  to?: string[]; // Optional: specific usernames to send to
}): Promise<ShareResult> {
  if (!isInWorldApp()) {
    return { success: false, error: 'Not in World App' };
  }

  try {
    const { finalPayload } = await MiniKit.commandsAsync.chat({
      message: options.message,
      to: options.to,
    });

    if (finalPayload.status === 'success') {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: (finalPayload as any).error_code || 'Chat failed' 
      };
    }
  } catch (error) {
    console.error('Chat error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Chat failed' 
    };
  }
}

/**
 * Share game result with friends
 */
export async function shareGameResult(options: {
  earnedAmount: number;
  reachedQuestion: number;
  isWinner: boolean;
}): Promise<ShareResult> {
  const { earnedAmount, reachedQuestion, isWinner } = options;

  const emoji = isWinner ? '🏆' : earnedAmount > 0 ? '💰' : '🎮';
  const resultText = isWinner
    ? `I just won the JACKPOT in Jackie Chain: Millionaire! 🎉`
    : earnedAmount > 0
      ? `I earned ${earnedAmount.toLocaleString()} $JC tokens!`
      : `I reached question ${reachedQuestion}!`;

  const gameUrl = getGameDeeplink();
  const shareText = `${emoji} ${resultText}\n\nThink you can beat my score? Play now! 👇`;

  // Prefer Share command with url field so World Chat renders a Mini App card
  if (isInWorldApp()) {
    const shareResult = await shareViaWorldApp({
      title: 'Jackie Chain: Millionaire',
      text: shareText,
      url: gameUrl,
    });
    if (shareResult.success) return shareResult;
  }

  // Fallback to Web Share API
  return shareViaNative({
    title: 'Jackie Chain: Millionaire',
    text: shareText,
    url: gameUrl,
  });
}

/**
 * Invite friends to play the game
 */
export async function inviteFriends(referralCode?: string): Promise<ShareResult> {
  const gameUrl = referralCode ? getReferralDeeplink(referralCode) : getGameDeeplink();

  const shareText = `🎮 Join me on Jackie Chain: Millionaire!\n\nAnswer trivia questions and earn $JC tokens.`;

  // Prefer Share command with url field so World Chat renders a Mini App card
  if (isInWorldApp()) {
    const shareResult = await shareViaWorldApp({
      title: 'Jackie Chain: Millionaire',
      text: shareText,
      url: gameUrl,
    });
    if (shareResult.success) return shareResult;
  }

  // Fallback to Web Share API
  return shareViaNative({
    title: 'Jackie Chain: Millionaire',
    text: shareText,
    url: gameUrl,
  });
}

/**
 * Native Web Share API fallback
 */
export async function shareViaNative(options: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<ShareResult> {
  if (!navigator.share) {
    // Copy to clipboard as final fallback
    try {
      await navigator.clipboard.writeText(options.url || options.text || '');
      return { success: true };
    } catch {
      return { success: false, error: 'Sharing not supported' };
    }
  }

  try {
    await navigator.share(options);
    return { success: true };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return { success: false, error: 'Share cancelled' };
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Share failed' 
    };
  }
}
