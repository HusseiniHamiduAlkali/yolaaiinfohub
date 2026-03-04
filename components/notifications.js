// Notifications Module for Yola AI Info Hub
// Handles Web Push Notifications and PWA installation prompts

window.NotificationManager = window.NotificationManager || {};

// Initialize notification system
window.NotificationManager.init = async function() {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('Notifications not supported by this browser');
      return false;
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers not supported by this browser');
      return false;
    }

    // Request notification permission if not already granted
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted');
        return true;
      }
    } else if (Notification.permission === 'granted') {
      return true;
    }

    return false;
  } catch (err) {
    console.error('Error initializing notifications:', err);
    return false;
  }
};

// Request notification permission
window.NotificationManager.requestPermission = async function() {
  try {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return false;
  }
};

// Send local notification
window.NotificationManager.sendNotification = async function(title, options = {}) {
  try {
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    const defaultOptions = {
      icon: 'Data/Images/jippujam.jpg',
      badge: 'Data/Images/jippujam.jpg',
      tag: options.tag || 'notification',
      requireInteraction: options.requireInteraction || false,
      ...options
    };

    // Send via service worker if available, otherwise use local notification
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.showNotification(title, defaultOptions);
        }
      });
      return true;
    } else {
      // Fallback to local notification
      new Notification(title, defaultOptions);
      return true;
    }
  } catch (err) {
    console.error('Error sending notification:', err);
    return false;
  }
};

// Send message received notification
window.NotificationManager.notifyMessageReceived = async function(section = '', preview = '') {
  if (document.hidden) {
    // Only show notification if app is in background
    const sectionName = section || 'AI Assistant';
    const title = 'Response Received';
    const body = preview ? preview.substring(0, 100) + '...' : `New response from ${sectionName}`;

    await window.NotificationManager.sendNotification(title, {
      body: body,
      tag: `message-${Date.now()}`,
      data: { type: 'message', section: section }
    });
  }
};

// Send FAQ notification
window.NotificationManager.notifyFAQSelected = async function(faqText = '') {
  if (Notification.permission === 'granted') {
    await window.NotificationManager.sendNotification('FAQ Selected', {
      body: faqText.substring(0, 100),
      tag: 'faq-notification'
    });
  }
};

// Send welcome notification
window.NotificationManager.notifyWelcome = async function() {
  await window.NotificationManager.sendNotification('Welcome to Yola AI Info Hub!', {
    body: 'Your AI assistant for Yola. Ask me anything!',
    tag: 'welcome',
    requireInteraction: false
  });
};

// Subscribe to push notifications
window.NotificationManager.subscribeToPushNotifications = async function() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('Already subscribed to push notifications');
      return true;
    }

    // Note: vapidPublicKey should be your server's public key
    // For now, we'll skip the actual subscription
    console.log('Push notifications can be enabled with a backend service');
    return false;
  } catch (err) {
    console.error('Error subscribing to push notifications:', err);
    return false;
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.NotificationManager.init();
  });
} else {
  window.NotificationManager.init();
}
