const SERVER_URL = 'http://localhost:3001';

console.log('[Solo Code Background Worker] Initialized');

// Message router between Content Scripts and Extension Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LEETCODE_PAGE_ACTIVE') {
    handlePageActive(message.data, sender.tab?.id);
    sendResponse({ received: true });
    return true;
  }

  if (message.type === 'SYNC_CODE_EVENT') {
    handleCodeSync(message.data);
    sendResponse({ received: true });
    return true;
  }

  if (message.type === 'SUBMISSION_DETECTED') {
    handleSubmission(message.data);
    sendResponse({ received: true });
    return true;
  }

  if (message.type === 'GET_PAIRING_STATE') {
    chrome.storage.local.get(['pairedSession', 'currentRoomId', 'matchStatus']).then((res) => {
      sendResponse(res);
    });
    return true;
  }
});

async function handlePageActive(data, tabId) {
  const { problemSlug, username } = data;
  if (username) {
    await chrome.storage.local.set({ leetcodeUsername: username });
  }

  // Check if active match problem matches
  const { currentRoomId } = await chrome.storage.local.get(['currentRoomId']);
  if (currentRoomId) {
    try {
      const res = await fetch(`${SERVER_URL}/api/room/${currentRoomId}`);
      if (res.ok) {
        const room = await res.json();
        // Send room state to the tab
        if (tabId) {
          chrome.tabs.sendMessage(tabId, {
            type: 'ROOM_STATE_UPDATE',
            room,
            isSlugMatched: room.problemSlug === problemSlug,
          });
        }
      }
    } catch (e) {
      console.error('[Background] Failed to query room state:', e);
    }
  }
}

async function handleCodeSync(data) {
  const { pairedSession, currentRoomId } = await chrome.storage.local.get([
    'pairedSession',
    'currentRoomId',
  ]);

  if (!pairedSession || !currentRoomId) return;

  // We forward code sync to server
  try {
    // Note: server socket handles real-time stream. For REST/extension bridge:
    // can emit or post snapshot
  } catch (err) {
    console.error('[Background] Sync error:', err);
  }
}

async function handleSubmission(data) {
  const { pairedSession, currentRoomId } = await chrome.storage.local.get([
    'pairedSession',
    'currentRoomId',
  ]);

  if (!pairedSession || !currentRoomId) return;

  console.log('[Background] Forwarding submission:', data);
}
