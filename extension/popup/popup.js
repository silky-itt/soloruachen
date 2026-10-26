const SERVER_URL = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', async () => {
  const statusChip = document.getElementById('status-chip');
  const unpairedSection = document.getElementById('unpaired-section');
  const pairedSection = document.getElementById('paired-section');
  const pairingCodeInput = document.getElementById('pairing-code-input');
  const btnPair = document.getElementById('btn-pair');
  const pairError = document.getElementById('pair-error');
  const pairedUser = document.getElementById('paired-user');
  const lcUsername = document.getElementById('lc-username');
  const currentRoom = document.getElementById('current-room');
  const matchStatus = document.getElementById('match-status');
  const btnOpenWeb = document.getElementById('btn-open-web');
  const btnDisconnect = document.getElementById('btn-disconnect');

  // Load state from chrome storage
  const storage = await chrome.storage.local.get([
    'pairedSession',
    'leetcodeUsername',
    'currentRoomId',
    'matchStatus',
  ]);

  if (storage.pairedSession) {
    showPaired(storage.pairedSession, storage.leetcodeUsername, storage.currentRoomId, storage.matchStatus);
  } else {
    showUnpaired();
  }

  // Handle Pairing submission
  btnPair.addEventListener('click', async () => {
    const code = pairingCodeInput.value.trim();
    if (!code) {
      showError('Vui lòng nhập mã ghép nối');
      return;
    }

    btnPair.disabled = true;
    btnPair.textContent = 'Đang ghép...';
    hideError();

    try {
      // Find current active leetcode tab to inspect username if available
      let detectedUser = storage.leetcodeUsername;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('leetcode.com')) {
        // Send message to content script if injected
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_LEETCODE_USER' });
          if (response && response.username) {
            detectedUser = response.username;
          }
        } catch (e) {
          // Content script not ready yet or on non-problem page
        }
      }

      const res = await fetch(`${SERVER_URL}/api/pairing/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          extensionId: chrome.runtime.id,
          leetcodeUsername: detectedUser || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showError(data.error || 'Ghép nối thất bại. Vui lòng kiểm tra lại mã.');
        btnPair.disabled = false;
        btnPair.textContent = 'Ghép nối';
        return;
      }

      // Save pairing state
      await chrome.storage.local.set({
        pairedSession: data.session,
        leetcodeUsername: detectedUser || data.session.leetcodeUsername || 'Đã kết nối',
      });

      showPaired(data.session, detectedUser);
    } catch (err) {
      showError('Không thể kết nối đến máy chủ Solo Code tại http://localhost:3001');
      btnPair.disabled = false;
      btnPair.textContent = 'Ghép nối';
    }
  });

  // Handle Disconnect
  btnDisconnect.addEventListener('click', async () => {
    await chrome.storage.local.remove(['pairedSession', 'currentRoomId', 'matchStatus']);
    showUnpaired();
  });

  // Handle Open Web
  btnOpenWeb.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });

  function showPaired(session, username, roomId, status) {
    unpairedSection.classList.add('hidden');
    pairedSection.classList.remove('hidden');

    statusChip.className = 'chip chip-online';
    statusChip.textContent = 'Đã ghép nối';

    pairedUser.textContent = `Nickname: ${session.nickname || session.appSessionId}`;
    lcUsername.textContent = username ? `@${username}` : 'Chưa phát hiện tab LeetCode';
    currentRoom.textContent = roomId || 'Chưa vào phòng';
    matchStatus.textContent = status || 'Sẵn sàng';
  }

  function showUnpaired() {
    unpairedSection.classList.remove('hidden');
    pairedSection.classList.add('hidden');

    statusChip.className = 'chip chip-offline';
    statusChip.textContent = 'Chưa ghép nối';
    pairingCodeInput.value = '';
    btnPair.disabled = false;
    btnPair.textContent = 'Ghép nối';
    hideError();
  }

  function showError(msg) {
    pairError.textContent = msg;
    pairError.classList.remove('hidden');
  }

  function hideError() {
    pairError.classList.add('hidden');
  }
});
