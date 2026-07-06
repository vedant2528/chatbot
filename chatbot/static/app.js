(() => {
  "use strict";

  // ---------- UTF-8 Encoding Helpers ----------
  const utf8Encode = (str) => {
    return unescape(encodeURIComponent(str));
  };

  const utf8Decode = (str) => {
    return decodeURIComponent(escape(str));
  };

  // ---------- Storage helpers ----------
  const LS_CHATS = "shwedant.chats";
  const LS_ACTIVE = "shwedant.activeChat";
  const LS_THEME = "shwedant.theme";
  const msgKey = (id) => `shwedant.messages.${id}`;

  const loadChats = () => JSON.parse(localStorage.getItem(LS_CHATS) || "[]");
  const saveChats = (chats) => localStorage.setItem(LS_CHATS, JSON.stringify(chats));
  const loadMessages = (id) => JSON.parse(localStorage.getItem(msgKey(id)) || "[]");
  const saveMessages = (id, messages) => localStorage.setItem(msgKey(id), JSON.stringify(messages));

  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  // ---------- DOM refs ----------
  const chatBox = document.getElementById("chat-box");
  const emptyState = document.getElementById("empty-state");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("user-input");
  const fileInput = document.getElementById("file-input");
  const filePreview = document.getElementById("file-preview");
  const statusText = document.getElementById("status-text");
  const chatTitleEl = document.getElementById("chat-title");
  const chatList = document.getElementById("chat-list");
  const newChatBtn = document.getElementById("new-chat-btn");
  const resetBtn = document.getElementById("reset-btn");
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebar-toggle");
  const sendBtn = document.getElementById("send-btn");
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  const themeLabel = document.getElementById("theme-label");
  const hljsTheme = document.getElementById("hljs-theme");

  let selectedFiles = [];
  let activeChatId = null;
  let abortController = null;
  let isStreaming = false;

  marked.setOptions({ breaks: true, gfm: true });

  // ---------- Theme ----------
  function applyTheme(theme) {
    document.body.classList.toggle("light", theme === "light");
    themeIcon.textContent = theme === "light" ? "☀️" : "🌙";
    themeLabel.textContent = theme === "light" ? "Light mode" : "Dark mode";
    hljsTheme.href = theme === "light"
      ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css"
      : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css";
  }
  const savedTheme = localStorage.getItem(LS_THEME) || "dark";
  applyTheme(savedTheme);
  themeToggle.addEventListener("click", () => {
    const next = document.body.classList.contains("light") ? "dark" : "light";
    localStorage.setItem(LS_THEME, next);
    applyTheme(next);
  });

  // ---------- Sidebar ----------
  sidebarToggle.addEventListener("click", () => sidebar.classList.toggle("open"));

  function renderChatList() {
    const chats = loadChats();
    chatList.innerHTML = "";
    chats
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach((chat) => {
        const item = document.createElement("div");
        item.className = "chat-item" + (chat.id === activeChatId ? " active" : "");
        item.dataset.id = chat.id;

        const label = document.createElement("span");
        label.className = "chat-item-label";
        label.textContent = chat.title || "New chat";
        label.title = "Double-click to rename";
        label.addEventListener("dblclick", (e) => {
          e.stopPropagation();
          const name = prompt("Rename chat", chat.title || "New chat");
          if (name && name.trim()) {
            chat.title = name.trim().slice(0, 60);
            saveChats(chats);
            renderChatList();
            if (chat.id === activeChatId) chatTitleEl.textContent = chat.title;
          }
        });

        const del = document.createElement("button");
        del.className = "chat-item-del";
        del.type = "button";
        del.setAttribute("aria-label", "Delete chat");
        del.textContent = "×";
        del.addEventListener("click", (e) => {
          e.stopPropagation();
          deleteChat(chat.id);
        });

        item.appendChild(label);
        item.appendChild(del);
        item.addEventListener("click", () => switchChat(chat.id));
        chatList.appendChild(item);
      });
  }

  function deleteChat(id) {
    let chats = loadChats().filter((c) => c.id !== id);
    localStorage.removeItem(msgKey(id));
    saveChats(chats);
    if (id === activeChatId) {
      if (chats.length) {
        switchChat(chats.sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
      } else {
        createChat();
      }
    } else {
      renderChatList();
    }
  }

  function upsertChatMeta(id, patch) {
    const chats = loadChats();
    const idx = chats.findIndex((c) => c.id === id);
    if (idx === -1) {
      chats.push({ id, title: "New chat", updatedAt: Date.now(), ...patch });
    } else {
      chats[idx] = { ...chats[idx], ...patch, updatedAt: Date.now() };
    }
    saveChats(chats);
  }

  function createChat() {
    const id = uuid();
    upsertChatMeta(id, { title: "New chat" });
    switchChat(id);
  }

  function switchChat(id) {
    activeChatId = id;
    localStorage.setItem(LS_ACTIVE, id);
    const chats = loadChats();
    const meta = chats.find((c) => c.id === id);
    chatTitleEl.textContent = (meta && meta.title) || "New chat";
    renderChatList();
    renderMessages(loadMessages(id));
    input.value = "";
    autoGrow();
  }

  newChatBtn.addEventListener("click", () => {
    createChat();
    sidebar.classList.remove("open");
  });

  resetBtn.addEventListener("click", async () => {
    if (!activeChatId) return;
    if (!confirm("Clear this chat? This can't be undone.")) return;
    await fetch("/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: activeChatId }),
    });
    saveMessages(activeChatId, []);
    renderMessages([]);
  });

  // ---------- Rendering ----------
  function renderMessages(messages) {
    chatBox.innerHTML = "";
    if (!messages.length) {
      chatBox.appendChild(emptyState);
      return;
    }
    messages.forEach((m) => appendMessage(m.role, m.content, m.files || [], false));
    scrollBottom();
  }

  function renderMarkdownInto(el, text) {
    const html = DOMPurify.sanitize(marked.parse(text || ""));
    el.innerHTML = html;
    el.querySelectorAll("pre code").forEach((block) => {
      hljs.highlightElement(block);
      const pre = block.parentElement;
      if (pre.querySelector(".code-copy")) return;
      const btn = document.createElement("button");
      btn.className = "code-copy";
      btn.type = "button";
      btn.textContent = "Copy";
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(block.textContent).then(() => {
          btn.textContent = "Copied";
          setTimeout(() => (btn.textContent = "Copy"), 1300);
        });
      });
      pre.classList.add("has-copy");
      pre.appendChild(btn);
    });
  }

  function appendMessage(sender, text, files = [], animate = true) {
    if (emptyState.isConnected) emptyState.remove();
    const wrapper = document.createElement("div");
    wrapper.className = `message ${sender === "user" ? "user-msg" : "bot-msg"}`;
    if (animate) wrapper.classList.add("enter");

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = sender === "user" ? "🧑" : "sv";

    const col = document.createElement("div");
    col.className = "msg-col";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (sender === "user") {
      bubble.textContent = text;
    } else {
      renderMarkdownInto(bubble, text);
    }

    if (files.length) {
      const list = document.createElement("div");
      list.className = "attached-files";
      list.textContent = "📎 " + files.join(", ");
      bubble.appendChild(list);
    }

    col.appendChild(bubble);

    if (sender === "bot") {
      const actions = document.createElement("div");
      actions.className = "msg-actions";
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(bubble.dataset.raw || text).then(() => {
          copyBtn.textContent = "Copied";
          setTimeout(() => (copyBtn.textContent = "Copy"), 1300);
        });
      });
      actions.appendChild(copyBtn);
      col.appendChild(actions);
    }

    wrapper.appendChild(avatar);
    wrapper.appendChild(col);
    chatBox.appendChild(wrapper);
    scrollBottom();
    return { wrapper, bubble };
  }

  function scrollBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // ---------- Composer ----------
  input.addEventListener("input", autoGrow);
  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 160) + "px";
  }
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  fileInput.addEventListener("change", () => {
    selectedFiles = [...selectedFiles, ...Array.from(fileInput.files)].slice(0, 5);
    fileInput.value = "";
    renderFilePreview();
  });

  function renderFilePreview() {
    filePreview.innerHTML = "";
    selectedFiles.forEach((file, index) => {
      const pill = document.createElement("div");
      pill.className = "file-pill";
      const sizeKb = (file.size / 1024).toFixed(0);
      pill.innerHTML = `<span>📎 ${file.name} <em>${sizeKb}KB</em></span>`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "×";
      btn.addEventListener("click", () => {
        selectedFiles.splice(index, 1);
        renderFilePreview();
      });
      pill.appendChild(btn);
      filePreview.appendChild(pill);
    });
  }

  form.addEventListener("submit", sendMessage);

  function setStreamingUI(streaming) {
    isStreaming = streaming;
    sendBtn.classList.toggle("stop", streaming);
    sendBtn.innerHTML = streaming
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/></svg>';
    statusText.textContent = streaming ? "Thinking..." : "Ready";
  }

  sendBtn.addEventListener("click", (e) => {
    if (isStreaming) {
      e.preventDefault();
      if (abortController) abortController.abort();
    }
  });

  async function sendMessage(e) {
    e.preventDefault();
    if (isStreaming) return;
    const message = input.value.trim();
    if (!message && selectedFiles.length === 0) return;
    if (!activeChatId) createChat();

    const fileNames = selectedFiles.map((f) => f.name);
    appendMessage("user", message, fileNames);

    const messages = loadMessages(activeChatId);
    messages.push({ role: "user", content: message, files: fileNames });
    saveMessages(activeChatId, messages);

    const chats = loadChats();
    const meta = chats.find((c) => c.id === activeChatId);
    if (meta && meta.title === "New chat" && message) {
      const title = message.slice(0, 48) + (message.length > 48 ? "…" : "");
      upsertChatMeta(activeChatId, { title });
      chatTitleEl.textContent = title;
      renderChatList();
    } else {
      upsertChatMeta(activeChatId, {});
    }

    const formData = new FormData();
    formData.append("session_id", activeChatId);
    formData.append("message", message);
    selectedFiles.forEach((file) => formData.append("files", file));
    selectedFiles = [];
    renderFilePreview();

    input.value = "";
    autoGrow();

    const { bubble } = appendMessage("bot", "");
    bubble.classList.add("streaming");
    let accumulated = "";
    setStreamingUI(true);
    abortController = new AbortController();

    try {
      const response = await fetch("/chat/stream", {
        method: "POST",
        body: formData,
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalReply = null;
      let finalFiles = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop();

        for (const block of events) {
          const lines = block.split("\n");
          let eventName = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event:")) eventName = line.slice(6).trim();
            if (line.startsWith("data:")) dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;
          let payload;
          try {
            payload = JSON.parse(dataStr);
          } catch {
            continue;
          }

          if (eventName === "delta" && payload.text) {
            accumulated += payload.text;
            renderMarkdownInto(bubble, accumulated);
            bubble.dataset.raw = accumulated;
            scrollBottom();
          } else if (eventName === "error") {
            throw new Error(payload.error || "Something went wrong.");
          } else if (eventName === "done") {
            finalReply = payload.reply;
            finalFiles = payload.files || [];
          }
        }
      }

      bubble.classList.remove("streaming");
      const reply = finalReply != null ? finalReply : accumulated;
      renderMarkdownInto(bubble, reply);
      bubble.dataset.raw = reply;

      const updated = loadMessages(activeChatId);
      updated.push({ role: "assistant", content: reply, files: [] });
      saveMessages(activeChatId, updated);
      upsertChatMeta(activeChatId, {});
    } catch (err) {
      bubble.classList.remove("streaming");
      if (err.name === "AbortError") {
        if (!accumulated) bubble.parentElement.parentElement.remove();
        else {
          renderMarkdownInto(bubble, accumulated + "\n\n*(stopped)*");
          const updated = loadMessages(activeChatId);
          updated.push({ role: "assistant", content: accumulated, files: [] });
          saveMessages(activeChatId, updated);
        }
      } else {
        bubble.classList.add("error-bubble");
        renderMarkdownInto(bubble, `⚠️ ${err.message}`);
      }
    } finally {
      setStreamingUI(false);
      abortController = null;
    }
  }

  // ---------- Voice input ----------
  const voiceBtn = document.getElementById("voice-btn");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  // Language codes for voice recognition
  const languages = {
    "en-US": "English (US)",
    "en-GB": "English (UK)",
    "en-IN": "English (India)",
    "hi-IN": "हिंदी (Hindi)",
    "hi": "Hinglish (हिंगलिश) - Mix Hindi & English",
    "es-ES": "Español (Spanish)",
    "es-MX": "Español (Mexico)",
    "fr-FR": "Français (French)",
    "de-DE": "Deutsch (German)",
    "it-IT": "Italiano (Italian)",
    "pt-BR": "Português (Brazil)",
    "pt-PT": "Português (Portugal)",
    "ru-RU": "Русский (Russian)",
    "ja-JP": "日本語 (Japanese)",
    "zh-CN": "普通话 (Mandarin)",
    "zh-TW": "繁體中文 (Cantonese)",
    "ar-SA": "العربية (Arabic)",
    "ko-KR": "한국어 (Korean)",
    "tr-TR": "Türkçe (Turkish)",
    "nl-NL": "Nederlands (Dutch)",
    "pl-PL": "Polski (Polish)",
    "id-ID": "Bahasa Indonesia",
  };
  
  let selectedLang = "en-US";
  
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.onstart = () => {
      statusText.textContent = `Listening (${languages[selectedLang]})...`;
      voiceBtn.classList.add("active");
    };
    recognition.onend = () => {
      statusText.textContent = isStreaming ? "Thinking..." : "Ready";
      voiceBtn.classList.remove("active");
    };
    recognition.onresult = (event) => {
      input.value = (input.value ? input.value + " " : "") + event.results[0][0].transcript;
      input.focus();
      autoGrow();
    };
    recognition.onerror = () => voiceBtn.classList.remove("active");
    
    voiceBtn.addEventListener("click", () => {
      // Show language selector on first click
      if (!voiceBtn.dataset.langSet) {
        const langList = Object.entries(languages);
        const menu = document.createElement("div");
        menu.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2000;background:var(--panel);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px;max-height:60vh;overflow-y:auto;min-width:280px;box-shadow:var(--shadow);";
        
        const title = document.createElement("h3");
        title.textContent = "Select Voice Language";
        title.style.margin = "0 0 16px 0";
        title.style.fontFamily = '"Fraunces", serif';
        title.style.fontSize = "16px";
        menu.appendChild(title);
        
        langList.forEach(([code, name]) => {
          const btn = document.createElement("button");
          btn.textContent = name;
          btn.style.cssText = "display:block;width:100%;text-align:left;padding:10px 12px;margin-bottom:6px;border:1px solid var(--border);background:var(--panel-2);color:var(--text);border-radius:8px;cursor:pointer;font-size:13px;transition:background 0.1s ease;";
          btn.onmouseover = () => btn.style.background = "var(--panel-3)";
          btn.onmouseout = () => btn.style.background = "var(--panel-2)";
          btn.onclick = () => {
            selectedLang = code;
            recognition.lang = code;
            voiceBtn.dataset.langSet = "true";
            voiceBtn.title = `Voice input: ${name}`;
            menu.remove();
            recognition.start();
          };
          menu.appendChild(btn);
        });
        
        document.body.appendChild(menu);
        menu.addEventListener("click", (e) => e.stopPropagation());
      } else {
        recognition.start();
      }
    });
  } else {
    voiceBtn.addEventListener("click", () => alert("Voice input isn't supported in this browser. Try Chrome, Edge, or Safari."));
  }

  // ---------- Boot ----------
  (function init() {
    let chats = loadChats();
    if (!chats.length) {
      const id = uuid();
      chats = [{ id, title: "New chat", updatedAt: Date.now() }];
      saveChats(chats);
    }
    const savedActive = localStorage.getItem(LS_ACTIVE);
    const target = chats.find((c) => c.id === savedActive) ? savedActive : chats.sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
    switchChat(target);
    
    // Initialize Knowledge Base button
    const kbBtn = document.getElementById("kb-btn");
    if (kbBtn) {
      kbBtn.addEventListener("click", () => KnowledgeBaseManager.showKBPanel());
    }
  })();
})();
