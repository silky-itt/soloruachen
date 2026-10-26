/**
 * Solo Code Page Bridge (Injected into LeetCode DOM)
 * Safely reads Monaco Editor instance & LeetCode username without touching cookies or passwords.
 */

(function () {
  console.log('[Solo Code Page Bridge] Injected into LeetCode Page');

  let lastCode = '';
  let debounceTimer = null;

  function detectUsername() {
    try {
      // Method 1: Check Next.js initial props if present
      if (window.__NEXT_DATA__ && window.__NEXT_DATA__.props) {
        const userStatus = window.__NEXT_DATA__.props.pageProps?.userStatus;
        if (userStatus && userStatus.username) {
          return userStatus.username;
        }
      }

      // Method 2: DOM profile avatar link /u/username
      const profileLink = document.querySelector('a[href^="/u/"]');
      if (profileLink) {
        const href = profileLink.getAttribute('href');
        const match = href.match(/\/u\/([^/?#]+)/);
        if (match && match[1]) {
          return match[1];
        }
      }
    } catch (e) {
      console.warn('[Solo Code] Username detection error:', e);
    }
    return null;
  }

  function getMonacoCode() {
    try {
      if (window.monaco && window.monaco.editor) {
        const models = window.monaco.editor.getModels();
        if (models && models.length > 0) {
          // Find the active problem model (usually first or matching language)
          const model = models[0];
          return {
            code: model.getValue(),
            language: model.getLanguageId ? model.getLanguageId() : 'unknown',
          };
        }
      }
    } catch (e) {
      // Monaco not ready or CodeMirror in use
    }
    return null;
  }

  function notifyCodeChange() {
    const editorData = getMonacoCode();
    if (!editorData) return;

    if (editorData.code !== lastCode) {
      lastCode = editorData.code;
      window.dispatchEvent(
        new CustomEvent('solo-code:editor-content', {
          detail: {
            code: editorData.code,
            language: editorData.language,
            timestamp: Date.now(),
          },
        })
      );
    }
  }

  // Periodic polling + Mutation check for editor readiness
  const checkInterval = setInterval(() => {
    const username = detectUsername();
    if (username) {
      window.dispatchEvent(
        new CustomEvent('solo-code:user-detected', {
          detail: { username },
        })
      );
    }

    const editorData = getMonacoCode();
    if (editorData) {
      notifyCodeChange();
      // Once editor is found, set up input listener or interval
      if (window.monaco && window.monaco.editor) {
        const models = window.monaco.editor.getModels();
        if (models[0] && !models[0].__soloHooked) {
          models[0].__soloHooked = true;
          models[0].onDidChangeContent(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(notifyCodeChange, 200); // 200ms debounce
          });
        }
      }
    }
  }, 1000);
})();
