import { Platform, Linking, Alert } from 'react-native';

/**
 * Replace with your actual WhatsApp Business number.
 * Format: country code + number, no +, no spaces, no dashes.
 * Example: India +91 98765 43210 → '919876543210'
 */
export const BUSINESS_WHATSAPP = '919876543210';

export const BUSINESS_EMAIL = 'enquiries@trulots.com';

export const BUSINESS_NAME = 'Trulots / HKS Enterprises';

/**
 * Opens a WhatsApp chat with the business number.
 *
 * Web: Opens wa.me in a new browser tab — this works even if the user doesn't
 *      have WhatsApp installed (it prompts them or opens WhatsApp Web).
 *
 * Mobile: Uses the universal https://wa.me/ link via Linking, which the OS
 *         hands off to whichever WhatsApp app is installed as the default
 *         handler — works for both regular WhatsApp and WhatsApp Business.
 */
export const openWhatsApp = async (message: string): Promise<void> => {
  const url = `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`;

  if (Platform.OS === 'web') {
    try {
      (window as any).open(url, '_blank', 'noopener,noreferrer');
    } catch {
      (window as any).location.href = url;
    }
    return;
  }

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(
      'Cannot Open WhatsApp',
      `Please message us on WhatsApp at +${BUSINESS_WHATSAPP} or send an email to ${BUSINESS_EMAIL}.`,
      [{ text: 'OK' }],
    );
  }
};

/**
 * Opens the default email client with a pre-filled subject and body.
 *
 * Web: Sets window.location.href to the mailto: URI, which most browsers
 *      hand off to the default mail client.
 * Mobile: Uses Linking.openURL with mailto:.
 */
export const openEmail = (subject: string, body: string): void => {
  const url = `mailto:${BUSINESS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  if (Platform.OS === 'web') {
    try {
      (window as any).location.href = url;
    } catch {
      Alert.alert('Email', `Please email us at ${BUSINESS_EMAIL}`);
    }
    return;
  }

  Linking.openURL(url).catch(() => {
    Alert.alert(
      'No Email App Found',
      `Please send an email to ${BUSINESS_EMAIL}`,
      [{ text: 'OK' }],
    );
  });
};
