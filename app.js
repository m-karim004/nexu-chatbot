 /* ==============================
           SmartChat AI Multi-Session
                by Karim Akhond
   
   ==============================
   */
  const messagesEl = document.getElementById("messages");
  const chatForm = document.getElementById("chatForm");
  const promptInput = document.getElementById("prompt");
  const sendBtn = document.getElementById("sendBtn");
  const sidebar = document.querySelector(".sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const closeSidebar = document.getElementById("closeSidebar");
  const overlay = document.getElementById("overlay");
  const clearChatBtn = document.getElementById("clearChat");
  const memoryList = document.getElementById("memoryList");

  const MAX_SESSIONS = 3;
  const CHAT_SESSIONS_KEY = "smartcv_chat_sessions";
  const ACTIVE_SESSION_KEY = "smartcv_active_session";

  // Add "New Chat" button if not present
  if (!document.getElementById("newChatBtn")) {
    const newChatBtn = document.createElement("button");
    newChatBtn.id = "newChatBtn";
    newChatBtn.className =
      "w-full py-2 mt-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm transition";
    newChatBtn.textContent = "➕ New Chat";
    memoryList.parentNode.insertBefore(newChatBtn, memoryList);
  }

  // Load saved sessions
  let sessions = JSON.parse(localStorage.getItem(CHAT_SESSIONS_KEY) || "[]");
  let activeSessionId = localStorage.getItem(ACTIVE_SESSION_KEY);

  // If no session, create first
  if (!activeSessionId) {
    activeSessionId = createNewSession();
  }

  // Load active session messages
  loadSession(activeSessionId);

  // -------------- FUNCTIONS --------------
  function createNewSession() {
    const id = "session_" + Date.now();
    const newSession = { id, title: "New Chat", messages: [] };

    // Keep max 3 sessions
    sessions.push(newSession);
    if (sessions.length > MAX_SESSIONS) sessions.shift();

    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
    renderSidebar();
    messagesEl.innerHTML = "";
    addMessage("assistant", "✨ New chat started. What would you like to talk about?");
    return id;
  }

  function saveSession() {
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
  }

  function getActiveSession() {
    return sessions.find((s) => s.id === activeSessionId);
  }

  function addMessage(role, text, save = true) {
    const wrapper = document.createElement("div");
    wrapper.className = role === "user" ? "text-right" : "text-left";
    wrapper.innerHTML = `
      <div class="${
        role === "user"
          ? "inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
          : "inline-block bg-slate-800 text-slate-200"
      } px-4 py-3 rounded-2xl max-w-[85%] message-bubble glow">
        ${formatText(text)}
      </div>
    `;
    messagesEl.appendChild(wrapper);
    wrapper.scrollIntoView({ behavior: "smooth", block: "end" });

    if (save) {
      const session = getActiveSession();
      session.messages.push({ role, text });

      // Generate title from first user message
      if (session.title === "New Chat" && role === "user") {
        session.title = text.length > 25 ? text.slice(0, 25) + "..." : text;
      }
      saveSession();
      renderSidebar();
    }
  }

  async function typeMessage(role, text) {
    const wrapper = document.createElement("div");
    wrapper.className = role === "assistant" ? "text-left" : "text-right";
    const bubble = document.createElement("div");
    bubble.className =
      "inline-block bg-slate-800 text-slate-200 px-4 py-3 rounded-2xl max-w-[85%] message-bubble glow";
    wrapper.appendChild(bubble);
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    for (let i = 0; i < text.length; i++) {
      bubble.innerHTML = formatText(text.slice(0, i + 1));
      await new Promise((r) => setTimeout(r, 12));
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    const session = getActiveSession();
    session.messages.push({ role, text });
    saveSession();
    renderSidebar();
  }

  function formatText(text) {
    const escaped = text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    return escaped
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-indigo-400 underline">Visit Link</a>')
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
  }

  async function sendMessage(userText) {
    addMessage("user", userText);
    sendBtn.disabled = true;
    promptInput.value = "";

    const typing = document.createElement("div");
    typing.className = "text-left";
    typing.innerHTML = `
      <div class="inline-block bg-slate-800 text-slate-200 px-4 py-3 rounded-2xl max-w-[85%]">
        <div class="flex space-x-1 items-center">
          <span class="typing-dot bg-slate-400 w-2 h-2 rounded-full animate-bounce"></span>
          <span class="typing-dot bg-slate-400 w-2 h-2 rounded-full animate-bounce delay-75"></span>
          <span class="typing-dot bg-slate-400 w-2 h-2 rounded-full animate-bounce delay-150"></span>
        </div>
      </div>`;
    messagesEl.appendChild(typing);
    typing.scrollIntoView({ behavior: "smooth", block: "end" });

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      typing.remove();
      if (res.ok && data?.reply) {
        await typeMessage("assistant", data.reply);
      } else {
        addMessage("assistant", "⚠️ Error: " + (data?.message || "No response"));
      }
    } catch (err) {
      typing.remove();
      addMessage("assistant", "⚠️ Server connection failed. Please check backend.");
      console.error(err);
    } finally {
      sendBtn.disabled = false;
      promptInput.focus();
    }
  }
    // Sidebar rendering
  function renderSidebar() {
    memoryList.innerHTML = sessions
      .map(
        (s) => `
      <div class="memory-item p-3 mb-2 rounded-lg cyber-border text-slate-300 text-sm cursor-pointer ${
        s.id === activeSessionId ? "bg-slate-800" : "hover:bg-slate-700"
      }" data-id="${s.id}">
        <div class="flex justify-between">
          <span>${escapeHtml(s.title)}</span>
          <span class="text-xs text-slate-500">${
            s.id === activeSessionId ? "Active" : "Load"
          }</span>
        </div>
      </div>`
      )
      .join("");

    document.querySelectorAll(".memory-item").forEach((item) =>
      item.addEventListener("click", () => {
        const id = item.getAttribute("data-id");
        if (id !== activeSessionId) loadSession(id);
      })
    );
  }

  function escapeHtml(s) {
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  function loadSession(id) {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    activeSessionId = id;
    localStorage.setItem(ACTIVE_SESSION_KEY, id);

    messagesEl.innerHTML = "";
    if (session.messages.length === 0) {
      addMessage("assistant", "🧠 New session started. Ready when you are!");
    } else {
      session.messages.forEach((msg) => addMessage(msg.role, msg.text, false));
    }
    renderSidebar();
  }

  // ---------------- Events ----------------
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = promptInput.value.trim();
    if (!text) return;
    sendMessage(text);
  });

  document.getElementById("newChatBtn").addEventListener("click", createNewSession);

  sidebarToggle.addEventListener("click", () => {
    sidebar.classList.add("open");
    overlay.classList.add("active");
  });
  closeSidebar.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
  });
  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
  });

  clearChatBtn.addEventListener("click", () => {
    if (confirm("🧹 Clear all sessions?")) {
      sessions = [];
      localStorage.removeItem(CHAT_SESSIONS_KEY);
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      createNewSession();
    }
  });