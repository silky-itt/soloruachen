/**
 * Solo Code Content Script for LeetCode
 */

(function () {
  console.log('[Solo Code] Content Script loaded on', window.location.href);

  // Extract current problem slug from URL
  const slugMatch = window.location.pathname.match(/\/problems\/([a-zA-Z0-9_-]+)/);
  const currentProblemSlug = slugMatch ? slugMatch[1].toLowerCase() : '';

  // Inject page-bridge.js into Page World
  function injectBridge() {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('content/page-bridge.js');
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.warn('[Solo Code] Failed to inject page bridge:', e);
    }
  }
  injectBridge();

  // Create & mount Floating Side Panel
  let sidePanel = null;
  let isCollapsed = false;
  let detectedUsername = null;
  let opponentCode = '// Đang chờ kết nối đối thủ...';
  let matchRemainingSecs = 0;
  let matchInterval = null;

  function mountPanel() {
    if (document.getElementById('solo-code-sidepanel')) return;

    sidePanel = document.createElement('div');
    sidePanel.id = 'solo-code-sidepanel';

    sidePanel.innerHTML = `
      <div class="solo-header" id="solo-header-toggle">
        <div class="solo-brand">
          <span>⚔️</span>
          <span class="solo-title">SOLO CODE 1v1</span>
        </div>
        <div class="solo-controls">
          <span id="solo-timer-display" class="solo-timer">20:00</span>
          <button id="solo-btn-collapse" class="solo-btn-toggle" title="Thu gọn/Mở rộng">_</button>
        </div>
      </div>

      <div class="solo-body">
        <div id="solo-slug-warning" class="solo-alert solo-alert-warning" style="display: none;">
          ⚠️ Bạn đang mở đề khác với trận đấu!
        </div>

        <div class="solo-opponent-card">
          <div class="solo-opponent-header">
            <span id="solo-opponent-name">Đối thủ: Chờ ghép nối</span>
            <span class="solo-shield-badge">CHỈ XEM • BẢO MẬT</span>
          </div>
          <div id="solo-opponent-code-view" class="solo-code-scroll">
            ${opponentCode}
          </div>
        </div>
      </div>

      <div class="solo-footer">
        <span id="solo-pairing-status">Chờ kết nối app</span>
        <a href="http://localhost:3000" target="_blank" class="solo-link-btn">Mở Web Đấu ↗</a>
      </div>
    `;

    document.body.appendChild(sidePanel);

    // Event listeners
    const collapseBtn = document.getElementById('solo-btn-collapse');
    const headerToggle = document.getElementById('solo-header-toggle');

    const toggleCollapse = () => {
      isCollapsed = !isCollapsed;
      if (isCollapsed) {
        sidePanel.classList.add('collapsed');
        collapseBtn.textContent = '□';
      } else {
        sidePanel.classList.remove('collapsed');
        collapseBtn.textContent = '_';
      }
    };

    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCollapse();
    });

    headerToggle.addEventListener('click', () => {
      if (isCollapsed) toggleCollapse();
    });

    // Notify background
    chrome.runtime.sendMessage({
      type: 'LEETCODE_PAGE_ACTIVE',
      data: {
        problemSlug: currentProblemSlug,
        username: detectedUsername,
      },
    });
  }

  // Hook custom events from page-bridge.js
  window.addEventListener('solo-code:user-detected', (event) => {
    if (event.detail && event.detail.username) {
      detectedUsername = event.detail.username;
      const statusEl = document.getElementById('solo-pairing-status');
      if (statusEl) {
        statusEl.textContent = `@${detectedUsername}`;
      }
    }
  });

  window.addEventListener('solo-code:editor-content', (event) => {
    const { code, language, timestamp } = event.detail;
    chrome.runtime.sendMessage({
      type: 'SYNC_CODE_EVENT',
      data: {
        problemSlug: currentProblemSlug,
        code,
        language,
        timestamp,
      },
    });
  });

  // Watch for Run & Submit button clicks
  function observeLeetCodeActions() {
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target;
        if (!target) return;

        const buttonText = target.innerText || target.textContent || '';
        const isRun =
          buttonText.includes('Run') ||
          target.getAttribute('data-e2e-locator') === 'console-run-button';
        const isSubmit =
          buttonText.includes('Submit') ||
          target.getAttribute('data-e2e-locator') === 'console-submit-button';

        if (isSubmit) {
          console.log('[Solo Code] Submit button clicked on LeetCode');
          chrome.runtime.sendMessage({
            type: 'SUBMISSION_DETECTED',
            data: {
              problemSlug: currentProblemSlug,
              status: 'PENDING',
              isRunOnly: false,
              timestamp: Date.now(),
            },
          });
          watchForVerdict();
        } else if (isRun) {
          console.log('[Solo Code] Run button clicked on LeetCode');
          chrome.runtime.sendMessage({
            type: 'SUBMISSION_DETECTED',
            data: {
              problemSlug: currentProblemSlug,
              status: 'PENDING',
              isRunOnly: true,
              timestamp: Date.now(),
            },
          });
        }
      },
      true
    );
  }

  // Poll for LeetCode Submission Result (Accepted, Wrong Answer, etc.)
  function watchForVerdict() {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    const checkVerdict = setInterval(() => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(checkVerdict);
        return;
      }

      // Check DOM for result indicators
      const acceptedEl = document.querySelector('[data-e2e-locator="submission-result-accepted"]') ||
        Array.from(document.querySelectorAll('span, div')).find(
          (el) => el.textContent && el.textContent.trim() === 'Accepted' && el.offsetParent !== null
        );

      const wrongEl = Array.from(document.querySelectorAll('span, div')).find(
        (el) => el.textContent && (el.textContent.trim() === 'Wrong Answer' || el.textContent.trim() === 'Compile Error') && el.offsetParent !== null
      );

      if (acceptedEl) {
        clearInterval(checkVerdict);
        console.log('[Solo Code] Accepted verdict detected in LeetCode DOM!');
        chrome.runtime.sendMessage({
          type: 'SUBMISSION_DETECTED',
          data: {
            problemSlug: currentProblemSlug,
            status: 'ACCEPTED',
            isRunOnly: false,
            timestamp: Date.now(),
          },
        });
      } else if (wrongEl) {
        clearInterval(checkVerdict);
        console.log('[Solo Code] Wrong answer / error detected in LeetCode DOM');
        chrome.runtime.sendMessage({
          type: 'SUBMISSION_DETECTED',
          data: {
            problemSlug: currentProblemSlug,
            status: 'WRONG_ANSWER',
            isRunOnly: false,
            timestamp: Date.now(),
          },
        });
      }
    }, 1000);
  }

  // Listen to messages from background
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_LEETCODE_USER') {
      sendResponse({ username: detectedUsername });
      return true;
    }

    if (msg.type === 'ROOM_STATE_UPDATE') {
      const { room, isSlugMatched } = msg;
      const warningEl = document.getElementById('solo-slug-warning');
      if (warningEl) {
        warningEl.style.display = isSlugMatched ? 'none' : 'block';
      }
    }

    if (msg.type === 'OPPONENT_CODE_UPDATE') {
      opponentCode = msg.snapshot.code;
      const viewEl = document.getElementById('solo-opponent-code-view');
      if (viewEl) {
        viewEl.textContent = opponentCode;
      }
    }
  });

  // Mount on document ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountPanel();
      observeLeetCodeActions();
    });
  } else {
    mountPanel();
    observeLeetCodeActions();
  }
})();
