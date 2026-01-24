// ===== 全局状态 =====
    const SILICONFLOW_API_KEY = "sk-csblnlipczusnmuoocqrrqdbbuskicjtxteonucqidqxxahv"; // <--- 在这里替换成您自己的 SiliconFlow API 密钥
    const SILICONFLOW_API_URL = "https://api.siliconflow.cn/v1/chat/completions";
    const MULTIMODAL_API_URL = "https://api.siliconflow.cn/v1/chat/completions";
    const MULTIMODAL_MODEL = "Qwen/Qwen3-VL-32B-Instruct";
    const MAX_SUBTITLE_SNIPPET_CHARS = 20000;
    const VIDEO_CATALOG = [
      {
        id: '100dianlu',
        title: '100个电路图',
        videoSrc: './assets/videos/100dianlu.mp4',
        danmakuSrc: './assets/data/100dianlu/初三物理_100个电路图_前60秒_增强弹幕.xml',
        captionSrc: './assets/data/100dianlu/caption.srt'
      },
      {
        id: 'zhengzhi',
        title: '中美关系、中法关系、中俄关系、中欧关系，全部考点区别，10分钟搞定！',
        videoSrc: './assets/videos/中美关系、中法关系、中俄关系、中欧关系，全部考点区别，10分钟搞定！.flv',
        danmakuSrc: './assets/data/zhengzhi/中美中法中俄中欧_前60秒_不规则多线程回复集弹幕.xml',
        captionSrc: './assets/data/zhengzhi/中美关系、中法关系、中俄关系、中欧关系，全部考点区别，10分钟搞定！.srt'
      },
      {
        id: 'jixian',
        title: '你极限学得6吗？我打赌95%的同学算不对',
        videoSrc: './assets/videos/你极限学得6吗？我打赌95%的同学算不对.mp4',
        danmakuSrc: './assets/data/jixian/极限学得6_前60秒_增强弹幕.xml',
        captionSrc: './assets/data/jixian/你极限学得6吗？我打赌95%的同学算不对.json'
      }
    ];
    let activeVideoIndex = 0;
    let activeVideoConfig = VIDEO_CATALOG[0];
    let captionFilePath = activeVideoConfig ? activeVideoConfig.captionSrc : '';
    let danmakuFilePath = activeVideoConfig ? activeVideoConfig.danmakuSrc : '';
    const AUTO_SEND_AI_ON_RIGHT_CLICK = true; // 右键弹幕后是否直接自动提问
    const AI_QUESTION_TEMPLATE = "请围绕这条弹幕进行分析并给出回复建议：{text}"; // 自定义提问模板，保留 {text} 作为弹幕占位符
    const AI_GROUP_QUESTION_TEMPLATE = "请结合以下整组对话弹幕，给出总结和回复建议：{text}";
    const AI_RESPONSE_MAX_TOKENS = 150; // 短回复时限制回答长度
    const AI_RESPONSE_GUIDELINE = "请用不超过60字的中文简短回答，避免长段落。"; 
    const AI_RESPONSE_GUIDELINE_LONG = "请详细回答，必要时可以展开论述，无需长度限制。"; 
    const AI_SIDEBAR_DEFAULT_HINT = "输入弹幕问题，AI 已预先读取视频上下文。";
    const ENABLE_AUTO_VIDEO_CONTEXT = false; // true 自动上传视频截图，false 不自动上传，只有在第一次发送消息时才会上传

    let danmakuData = [], dialogueGroups = [], danmakuIndex = 0, dialogueIndex = 0;
    const SCROLL_THRESHOLD = 5;
    let parentDanmakuIds = new Set();
    let dialogueDanmakuIds = new Set();
    const NUM_TOTAL_TRACKS = 12;
    const NUM_DIALOGUE_TRACKS = 4;
    const FLOOD_WINDOW = 5;            // 秒：统计刷屏的时间窗口
    const FLOOD_THRESHOLD = 3;         // 条数：达到该阈值才会合并
    
    const video = document.getElementById('my-video');
    const danmakuScreen = document.getElementById('danmaku-screen');
    const sidebarContent = document.getElementById('sidebar-content');
    const mainContent = document.querySelector('.main-content');
    const dialogueSidebar = document.getElementById('dialogue-sidebar');
    const aiSidebar = document.getElementById('ai-sidebar');
    const aiMessages = document.getElementById('ai-chat-messages');
    const aiQuestionInput = document.getElementById('ai-question-input');
    const aiSendBtn = document.getElementById('ai-send-btn');
    const aiSystemMessage = document.getElementById('ai-system-message');
    let aiSystemMessageFallback = null;
    const aiReplyModeSelect = document.getElementById('ai-reply-mode');
    const aiOrbMessages = document.getElementById('ai-orb-chat-messages');
    const aiOrbQuestionInput = document.getElementById('ai-orb-question-input');
    const aiOrbSendBtn = document.getElementById('ai-orb-send-btn');
    const aiOrbSystemMessage = document.getElementById('ai-orb-system-message');
    const aiOrbReplyModeSelect = document.getElementById('ai-orb-reply-mode');
    const container = document.getElementById('player-container');
    const tapIndicator = document.getElementById('tap-indicator');
    const fsToggle2 = document.getElementById('fs-toggle-2');
    const danmakuInput = document.getElementById('danmaku-input');
    const sendDanmakuBtn = document.getElementById('send-danmaku-btn');
    const danmakuAiToggle = document.getElementById('danmaku-ai-toggle');
    const danmakuCount = document.getElementById('danmaku-count');
    const danmakuToggleBtn = document.getElementById('danmaku-toggle-btn');
    const danmakuToggleIcon = document.getElementById('danmaku-toggle-icon');
    const danmakuSettingsBtn = document.getElementById('danmaku-settings-btn');
    const danmakuSettingsPanel = document.getElementById('danmaku-settings-panel');
    const danmakuAreaRange = document.getElementById('danmaku-area-range');
    const videoShelf = document.getElementById('video-shelf');
    const videoShelfList = document.getElementById('video-shelf-list');
    const videoShelfHeader = document.querySelector('.video-shelf-header');
    const videoCount = document.getElementById('video-count');
    
    const connectorSvg = document.getElementById('dialogue-connector-svg');
    const aiOrbButton = document.getElementById('ai-orb');
    const aiPopover = document.getElementById('ai-popover');
    const aiPopoverStatus = document.getElementById('ai-popover-status');
    const aiVideoNodeBtn = document.getElementById('ai-video-node-btn');

    if (aiVideoNodeBtn) {
      aiVideoNodeBtn.remove();
    }

    const chatContexts = {
      sidebar: {
        messagesEl: aiMessages,
        inputEl: aiQuestionInput,
        sendBtn: aiSendBtn,
        systemMessageEl: aiSystemMessage,
        replyModeSelect: aiReplyModeSelect,
      },
      orb: {
        messagesEl: aiOrbMessages,
        inputEl: aiOrbQuestionInput,
        sendBtn: aiOrbSendBtn,
        systemMessageEl: aiOrbSystemMessage,
        replyModeSelect: aiOrbReplyModeSelect,
      }
    };

    function getChatContext(key = 'sidebar') {
      return key === 'orb' ? chatContexts.orb : chatContexts.sidebar;
    }

    function getChatSession(key = 'sidebar') {
      const sessionKey = key === 'orb' ? 'orb' : 'sidebar';
      if (!chatSessions[sessionKey]) chatSessions[sessionKey] = { history: [] };
      chatSessions[sessionKey].history = chatSessions[sessionKey].history || [];
      return chatSessions[sessionKey];
    }

    function cloneHistoryMessages(history = []) {
      return history.map(entry => ({ role: entry.role, content: entry.content }));
    }

    function appendSessionMessages(targetKey, messages = []) {
      if (!messages.length) return;
      const session = getChatSession(targetKey);
      session.history.push(...messages.map(msg => ({ role: msg.role, content: msg.content })));
    }

    function broadcastSessionMessages(messages = []) {
      ['sidebar', 'orb'].forEach(key => appendSessionMessages(key, messages));
    }

    function resetChatSessions() {
      Object.keys(chatSessions).forEach(key => {
        chatSessions[key].history = [];
      });
    }

    let activeDialogueDanmaku = new Map();
    let lineAnimationId = null;
    let manualAiReplyEnabled = false;
    let aiSystemStatusText = '';
    let isOrbProcessing = false;
    let orbProcessingLocks = 0;
    let danmakuVisible = true;
    let danmakuTotalCount = 0;
    const DANMAKU_AREA_MODES = {
      REPLY_ONLY: 1,
      HALF: 2,
      FULL: 3
    };
    let danmakuAreaMode = DANMAKU_AREA_MODES.HALF;
    const VIDEO_CONTEXT_WINDOW_SECONDS = 60;
    const VIDEO_CONTEXT_INTERVAL_SECONDS = 5;
    const VIDEO_CONTEXT_PROMPT = "请通读以下视频前一分钟的截图与字幕，生成详尽的内容理解，提炼教学要点，供后续问答使用。";

    const chatSessions = {
      sidebar: { history: [] },
      orb: { history: [] }
    };

    const interactionStats = {
      侧边栏打开次数: 0,
      溯源点击次数: 0,
      '信息检索/跳转次数': 0,
      语义簇展开次数: 0,
      AI对话深度: 0
    };

    if (typeof window !== 'undefined') {
      window.__interactionStats = interactionStats;
    }

    function logInteractionStats(reason = '') {
      if (typeof console === 'undefined') return;
      const label = reason ? `[metrics] ${reason}` : '[metrics]';
      console.log(label, { ...interactionStats });
    }

    function bumpInteractionStat(key, reason) {
      if (!Object.prototype.hasOwnProperty.call(interactionStats, key)) return;
      interactionStats[key] += 1;
      logInteractionStats(reason);
    }

    let videoContextInitPromise = null;

    const CONNECTION_COLORS = ['rgb(149,225,211)', 'rgb(234,255,208)', 'rgb(252,227,138)', 'rgb(243,129,129)'];

    let danmakuManager;
    let dialogueTracks = [];
    let dialogueLaunchQueue = [];
    let subtitleFileBlob = null;
    let subtitleFileName = 'caption.srt';
    let subtitleFileText = '';

    const CONTEXT_CAPTURE_OFFSETS = [-2, -1, 0, 1, 2];
    let captureVideoElement = null;
    let captureVideoReadyPromise = null;

    // ===== 工具函数 =====
    function formatTime(seconds) {
      return `${Math.floor(seconds / 60).toString().padStart(2,'0')}:${Math.floor(seconds % 60).toString().padStart(2,'0')}`;
    }
    function encodeAssetPath(path = '') {
      if (!path) return '';
      return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
    }
    function syncDanmakuCount() {
      if (danmakuCount) {
        danmakuCount.textContent = `${danmakuTotalCount}`;
      }
    }
    function setDanmakuVisibility(visible) {
      danmakuVisible = !!visible;
      if (danmakuScreen) danmakuScreen.classList.toggle('is-hidden', !danmakuVisible);
      if (connectorSvg) connectorSvg.classList.toggle('is-hidden', !danmakuVisible);
      if (danmakuToggleBtn) danmakuToggleBtn.setAttribute('aria-pressed', String(danmakuVisible));
      if (danmakuToggleBtn) danmakuToggleBtn.classList.toggle('is-active', danmakuVisible);
      if (danmakuToggleBtn) {
        danmakuToggleBtn.title = danmakuVisible ? '关闭弹幕' : '开启弹幕';
      }
      if (danmakuToggleIcon) {
        danmakuToggleIcon.src = danmakuVisible
          ? './assets/images/弹幕开.png'
          : './assets/images/弹幕关.png';
      }
    }
    function setDanmakuAreaMode(mode) {
      danmakuAreaMode = mode;
      if (danmakuAreaRange) danmakuAreaRange.value = String(mode);
      if (danmakuManager) {
        danmakuManager.setNormalTrackMode(mode);
        rebuildFromTime(video.currentTime);
      }
    }
    function toggleDanmakuSettingsPanel(forceOpen = null) {
      if (!danmakuSettingsPanel) return;
      const shouldOpen = forceOpen !== null
        ? !!forceOpen
        : !danmakuSettingsPanel.classList.contains('is-open');
      danmakuSettingsPanel.classList.toggle('is-open', shouldOpen);
      danmakuSettingsPanel.setAttribute('aria-hidden', (!shouldOpen).toString());
      if (danmakuSettingsBtn) {
        danmakuSettingsBtn.classList.toggle('is-active', shouldOpen);
      }
    }
    function syncLayoutHeight() {
      const playerHeight = mainContent.clientHeight;
      if (playerHeight > 0) {
        [dialogueSidebar, aiSidebar].forEach(panel => {
          if (panel) panel.style.height = `${playerHeight}px`;
        });
      }
      scheduleVideoShelfLayout();
    }

    function getVideoLabel(item, index) {
      if (!item) return `视频 ${index + 1}`;
      if (item.title) return item.title;
      if (item.id) return item.id;
      return `视频 ${index + 1}`;
    }

    function syncVideoShelfLayout() {
      if (!videoShelf || !container) return;
      const rect = container.getBoundingClientRect();
      const gap = 16;
      const rightGap = 30;
      const availableRight = window.innerWidth - rect.right - gap - rightGap;
      const maxWidth = 220;
      const targetWidth = Math.min(maxWidth, Math.max(0, availableRight));
      if (targetWidth <= 0) {
        videoShelf.classList.add('is-hidden');
        return;
      }

      videoShelf.classList.remove('is-hidden');
      videoShelf.style.width = `${targetWidth}px`;
      videoShelf.style.left = `${rect.right + gap}px`;
      videoShelf.style.top = `${rect.top}px`;
      videoShelf.style.maxHeight = `${rect.height}px`;
      videoShelf.style.height = 'auto';
      if (videoShelfList) {
        const headerHeight = videoShelfHeader ? videoShelfHeader.getBoundingClientRect().height : 0;
        const listMax = Math.max(0, rect.height - headerHeight - 20);
        videoShelfList.style.maxHeight = `${listMax}px`;
      }
    }

    let videoShelfLayoutTimeout = null;
    function scheduleVideoShelfLayout() {
      syncVideoShelfLayout();
      if (videoShelfLayoutTimeout) {
        clearTimeout(videoShelfLayoutTimeout);
        videoShelfLayoutTimeout = null;
      }
      videoShelfLayoutTimeout = setTimeout(() => {
        syncVideoShelfLayout();
        videoShelfLayoutTimeout = null;
      }, 450);
    }

    function syncVideoShelf() {
      const total = VIDEO_CATALOG.length;
      if (videoCount) {
        videoCount.textContent = `${total}`;
      }
      if (!videoShelfList) return;
      videoShelfList.innerHTML = '';
      if (total === 0) {
        const empty = document.createElement('div');
        empty.className = 'video-shelf-empty';
        empty.textContent = '暂无视频';
        videoShelfList.appendChild(empty);
        return;
      }
      VIDEO_CATALOG.forEach((item, index) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'video-shelf-card';
        if (index === activeVideoIndex) card.classList.add('is-active');
        card.dataset.index = String(index);

        const thumb = document.createElement('video');
        thumb.className = 'video-shelf-thumb';
        thumb.src = encodeAssetPath(item.videoSrc || '');
        thumb.preload = 'metadata';
        thumb.muted = true;
        thumb.playsInline = true;
        thumb.setAttribute('aria-hidden', 'true');
        thumb.tabIndex = -1;

        const title = document.createElement('div');
        title.className = 'video-shelf-name';
        title.textContent = getVideoLabel(item, index);

        card.appendChild(thumb);
        card.appendChild(title);
        card.addEventListener('click', () => switchVideoByIndex(index));
        videoShelfList.appendChild(card);
      });
      syncVideoShelfLayout();
    }

    function resetVideoState() {
      stopLineAnimation();
      if (danmakuManager) danmakuManager.clear();
      if (danmakuScreen) danmakuScreen.innerHTML = '';
      if (connectorSvg) connectorSvg.innerHTML = '';
      if (sidebarContent) sidebarContent.innerHTML = '';
      if (heatmapContent) heatmapContent.innerHTML = '';

      danmakuData = [];
      dialogueGroups = [];
      danmakuIndex = 0;
      dialogueIndex = 0;
      danmakuTotalCount = 0;
      syncDanmakuCount();
      parentDanmakuIds = new Set();
      dialogueDanmakuIds = new Set();
      activeDialogueDanmaku = new Map();
      dialogueLaunchQueue = [];
      dialogueTracks = [];

      subtitleFileBlob = null;
      subtitleFileText = '';
      subtitleFileName = 'caption.srt';
      videoContextInitPromise = null;

      if (captureVideoElement) {
        captureVideoElement.remove();
        captureVideoElement = null;
      }
      captureVideoReadyPromise = null;

      resetAiSidebarConversation();
      setDanmakuVisibility(danmakuVisible);
      if (danmakuAreaRange) danmakuAreaRange.value = String(danmakuAreaMode);
    }

    async function loadVideoBundle(config, { autoPlay = false } = {}) {
      if (!config || !video) return;
      resetVideoState();
      heatmapActiveVideoKey = getHeatmapVideoKey(config);
      heatmapFirstOpenPending = !heatmapViewStates.has(heatmapActiveVideoKey);
      if (heatmapFirstOpenPending) heatmapForceScrollToStart = true;
      heatmapPendingRestore = null;
      applyHeatmapViewState(heatmapViewStates.get(heatmapActiveVideoKey));

      const nextSource = encodeAssetPath(config.videoSrc || '');
      if (nextSource) {
        video.pause();
        video.src = nextSource;
        video.load();
        try {
          video.currentTime = 0;
        } catch (error) {
          console.warn('视频尚未就绪，稍后再重置时间轴', error);
        }
      }

      danmakuData = await loadAndProcessDanmaku(config.danmakuSrc || danmakuFilePath);
      danmakuManager = new DanmakuManager(danmakuScreen, NUM_TOTAL_TRACKS, NUM_DIALOGUE_TRACKS, danmakuAreaMode);
      await preloadSubtitleFile(config.captionSrc || captionFilePath);

      dialogueTracks = Array.from({ length: NUM_DIALOGUE_TRACKS }, () => ({ reservedForGroupId: null, releaseAt: 0 }));

      rebuildFromTime(0);
      renderBottomHeatmap();
      if (heatmapPanel && !heatmapPanel.classList.contains(HEATMAP_COLLAPSED_CLASS) && heatmapFirstOpenPending) {
        enterHeatmapOverview({ forceScroll: true });
        heatmapFirstOpenPending = false;
      }

      if (autoPlay) {
        video.play().catch(() => {});
      }
    }

    async function switchVideoByIndex(nextIndex, { autoPlay = false } = {}) {
      if (!VIDEO_CATALOG.length) return;
      const safeIndex = Number.isFinite(nextIndex)
        ? Math.max(0, Math.min(VIDEO_CATALOG.length - 1, nextIndex))
        : 0;
      if (safeIndex === activeVideoIndex && activeVideoConfig) return;

      saveHeatmapViewState();
      activeVideoIndex = safeIndex;
      activeVideoConfig = VIDEO_CATALOG[activeVideoIndex];
      captionFilePath = activeVideoConfig ? activeVideoConfig.captionSrc : '';
      danmakuFilePath = activeVideoConfig ? activeVideoConfig.danmakuSrc : '';
      syncVideoShelf();
      await loadVideoBundle(activeVideoConfig, { autoPlay });
    }

    function buildAiQuestionFromDanmaku(text) {
      if (!text) return "";
      const trimmed = text.trim();
      if (AI_QUESTION_TEMPLATE.includes("{text}")) {
        return AI_QUESTION_TEMPLATE.replace("{text}", trimmed);
      }
      return `${AI_QUESTION_TEMPLATE} ${trimmed}`;
    }

    function buildGroupQuestionFromDialogue(group) {
      if (!group) return "";
      const combined = (group.messages || []).map((m, idx) => `${idx + 1}. ${m.text}`).join('\n');
      if (!combined) return "";
      if (AI_GROUP_QUESTION_TEMPLATE.includes("{text}")) {
        return AI_GROUP_QUESTION_TEMPLATE.replace("{text}", combined);
      }
      return `${AI_GROUP_QUESTION_TEMPLATE}\n${combined}`;
    }

    function findGroupByDanmakuElement(el) {
      if (!el) return null;
      const groupId = el.dataset?.groupId;
      const msgId = el.dataset?.id;
      if (groupId) {
        const found = dialogueGroups.find(g => g.id === groupId);
        if (found) return found;
      }
      if (msgId) {
        return dialogueGroups.find(g => g.parentId === msgId) ||
               dialogueGroups.find(g => (g.messages || []).some(m => m.id === msgId));
      }
      return null;
    }

    async function preloadSubtitleFile(path = captionFilePath) {
      try {
        if (!path) throw new Error('字幕路径为空');
        const encodedPath = encodeAssetPath(path);
        const response = await fetch(encodedPath);
        if (!response.ok) throw new Error(`字幕文件请求失败: ${response.status}`);
        const text = await response.text();
        subtitleFileText = text;
        subtitleFileBlob = new Blob([text], { type: 'text/plain' });
        subtitleFileName = path.split('/').pop() || 'caption.srt';
        console.log(`字幕文件已加载: ${subtitleFileName}`);
      } catch (error) {
        console.error('加载字幕文件失败:', error);
        subtitleFileBlob = null;
        subtitleFileText = '';
      }
    }

    function ensureSubtitleReady() {
      return Boolean(subtitleFileBlob);
    }

    function buildOrbPrompt(baseText, timestampLabel) {
      if (baseText && baseText.trim()) return baseText.trim();
      if (!timestampLabel) return '请结合字幕内容与截图，对当前视频片段进行分析。';
      return `请结合字幕全文与视频在 ${timestampLabel} 的截图，分析该片段知识点并回答可能的学习疑问。`;
    }

    function getVideoSourceUrl() {
      if (!video) return '';
      return video.currentSrc || video.src || '';
    }

    async function ensureCaptureVideoReady() {
      const sourceUrl = getVideoSourceUrl();
      if (!sourceUrl) throw new Error('无法确定视频源，无法截图');

      const existingSource = captureVideoElement?.dataset?.baseSrc;
      if (captureVideoElement && captureVideoElement.readyState >= 2 && existingSource === sourceUrl) {
        return captureVideoElement;
      }

      if (captureVideoElement && existingSource !== sourceUrl) {
        captureVideoElement.remove();
        captureVideoElement = null;
        captureVideoReadyPromise = null;
      }

      if (!captureVideoReadyPromise) {
        captureVideoReadyPromise = new Promise((resolve, reject) => {
          const hiddenVideo = document.createElement('video');
          hiddenVideo.src = sourceUrl;
          hiddenVideo.preload = 'auto';
          hiddenVideo.muted = true;
          hiddenVideo.playsInline = true;
          hiddenVideo.crossOrigin = video?.crossOrigin || '';
          hiddenVideo.dataset.baseSrc = sourceUrl;
          hiddenVideo.style.position = 'fixed';
          hiddenVideo.style.opacity = '0';
          hiddenVideo.style.pointerEvents = 'none';
          hiddenVideo.style.width = '0';
          hiddenVideo.style.height = '0';
          hiddenVideo.style.zIndex = '-1';
          hiddenVideo.setAttribute('aria-hidden', 'true');
          hiddenVideo.tabIndex = -1;

          const cleanup = () => {
            hiddenVideo.removeEventListener('loadeddata', onLoaded);
            hiddenVideo.removeEventListener('error', onError);
          };

          const onLoaded = () => {
            cleanup();
            captureVideoElement = hiddenVideo;
            resolve(hiddenVideo);
          };

          const onError = (event) => {
            cleanup();
            hiddenVideo.remove();
            captureVideoElement = null;
            captureVideoReadyPromise = null;
            reject(event?.error || new Error('隐藏视频加载失败'));
          };

          hiddenVideo.addEventListener('loadeddata', onLoaded, { once: true });
          hiddenVideo.addEventListener('error', onError, { once: true });
          document.body.appendChild(hiddenVideo);
          hiddenVideo.load();
        });
      }

      return captureVideoReadyPromise;
    }

    function clampTimeToDuration(target, duration) {
      if (!Number.isFinite(duration) || duration <= 0) return Math.max(target, 0);
      return Math.min(Math.max(target, 0), duration);
    }

    function formatOffsetLabel(offset, absoluteTime) {
      const offsetLabel = offset === 0 ? 't' : (offset > 0 ? `t+${offset}s` : `t${offset}s`);
      return `${offsetLabel}@${formatTime(Math.max(absoluteTime, 0))}`;
    }

    function seekVideoElement(videoEl, targetTime) {
      return new Promise((resolve, reject) => {
        if (!videoEl) {
          reject(new Error('缺少可用于截图的视频元素'));
          return;
        }
        const normalizedTime = Math.max(targetTime, 0);
        if (Math.abs(videoEl.currentTime - normalizedTime) < 0.01) {
          resolve();
          return;
        }
        const cleanup = () => {
          videoEl.removeEventListener('seeked', onSeeked);
          videoEl.removeEventListener('error', onError);
        };
        const onSeeked = () => {
          cleanup();
          resolve();
        };
        const onError = (event) => {
          cleanup();
          reject(event?.error || new Error('视频跳转失败'));
        };
        videoEl.addEventListener('seeked', onSeeked, { once: true });
        videoEl.addEventListener('error', onError, { once: true });
        try {
          videoEl.currentTime = normalizedTime;
        } catch (error) {
          cleanup();
          reject(error);
        }
      });
    }

    async function captureFrameFromVideoElement(targetVideo, reusableCanvas) {
      if (!targetVideo || targetVideo.readyState < 2 || !targetVideo.videoWidth || !targetVideo.videoHeight) {
        throw new Error('视频尚未准备好，无法截图');
      }
      const canvas = reusableCanvas || document.createElement('canvas');
      canvas.width = targetVideo.videoWidth;
      canvas.height = targetVideo.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(targetVideo, 0, 0, canvas.width, canvas.height);
      return await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('截图生成失败'));
        }, 'image/png');
      });
    }

    async function captureContextFrameBlobs(baseTime, offsets = CONTEXT_CAPTURE_OFFSETS) {
      if (!video) throw new Error('视频元素缺失，无法截图');
      const hiddenVideo = await ensureCaptureVideoReady();
      hiddenVideo.pause();

      const duration = hiddenVideo.duration || video.duration || 0;
      const canvas = document.createElement('canvas');
      const uniqueOffsets = Array.from(new Set(offsets)).sort((a, b) => a - b);
      const seenTimes = new Set();
      const frames = [];

      for (const offset of uniqueOffsets) {
        const targetTime = clampTimeToDuration((baseTime || 0) + offset, duration);
        const timeKey = targetTime.toFixed(3);
        if (seenTimes.has(timeKey)) continue;
        seenTimes.add(timeKey);

        await seekVideoElement(hiddenVideo, targetTime);
        const blob = await captureFrameFromVideoElement(hiddenVideo, canvas);
        frames.push({
          blob,
          offset,
          timestamp: targetTime,
          label: formatOffsetLabel(offset, targetTime)
        });
      }

      return frames;
    }

    // Capture evenly spaced frames during the first minute to preload AI context.
    async function captureVideoSnapshotsOverWindow({ startSeconds = 0, windowSeconds = VIDEO_CONTEXT_WINDOW_SECONDS, intervalSeconds = VIDEO_CONTEXT_INTERVAL_SECONDS } = {}) {
      if (!video) throw new Error('视频元素缺失，无法截图');
      const hiddenVideo = await ensureCaptureVideoReady();
      hiddenVideo.pause();

      const duration = hiddenVideo.duration || video.duration || 0;
      const effectiveDuration = Number.isFinite(duration) && duration > 0 ? duration : windowSeconds;
      const captureEnd = startSeconds + windowSeconds;
      const samplePoints = [];
      for (let offset = 0; offset <= windowSeconds; offset += intervalSeconds) {
        const sampleTime = startSeconds + offset;
        if (sampleTime > effectiveDuration) break;
        samplePoints.push(sampleTime);
      }
      if (
        effectiveDuration >= captureEnd &&
        (samplePoints.length === 0 || samplePoints[samplePoints.length - 1] < captureEnd)
      ) {
        samplePoints.push(captureEnd);
      }

      const canvas = document.createElement('canvas');
      const seenTimes = new Set();
      const frames = [];

      for (const timePoint of samplePoints) {
        const targetTime = clampTimeToDuration(timePoint, duration || windowSeconds);
        const timeKey = targetTime.toFixed(3);
        if (seenTimes.has(timeKey)) continue;
        seenTimes.add(timeKey);

        await seekVideoElement(hiddenVideo, targetTime);
        const blob = await captureFrameFromVideoElement(hiddenVideo, canvas);
        frames.push({
          blob,
          timestamp: targetTime,
          offset: targetTime - startSeconds,
          label: `t=${formatTime(Math.max(targetTime, 0))}`
        });
      }

      return frames;
    }

    function getSubtitleSnippet() {
      if (!subtitleFileText) return '暂无字幕内容';
      if (subtitleFileText.length <= MAX_SUBTITLE_SNIPPET_CHARS) return subtitleFileText;
      return subtitleFileText.slice(0, MAX_SUBTITLE_SNIPPET_CHARS) + '\n...（其余字幕已截断）';
    }

    async function blobToDataUrl(blob) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) resolve(reader.result.toString());
          else reject(new Error('截图编码失败'));
        };
        reader.onerror = () => reject(new Error('截图编码失败'));
        reader.readAsDataURL(blob);
      });
    }

    function buildMultimodalMessages(questionText, timestampLabel, screenshotDataEntries = []) {
      const timestampNote = timestampLabel ? `（焦点时间：${timestampLabel}）` : '';
      const frameLabels = screenshotDataEntries.map(entry => entry.label).filter(Boolean);
      const coverageNote = frameLabels.length ? `（截图覆盖：${frameLabels.join('、')}）` : '';
      const userInstruction = `${questionText}${timestampNote}${coverageNote}`.trim();
      const imageContents = screenshotDataEntries.map(entry => ({
        type: 'image_url',
        image_url: { url: entry.url, detail: 'high' }
      }));
      return [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text: '你是一名多模态教学助理，请结合提供的字幕内容与视频截图，为学生输出结构化、可执行的学习建议。'
            }
          ]
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: userInstruction },
            { type: 'text', text: `字幕摘录：\n${getSubtitleSnippet()}` },
            ...imageContents
          ]
        }
      ];
    }

    function extractAssistantText(content) {
      if (!content) return '';
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .map(item => {
            if (!item) return '';
            if (typeof item === 'string') return item;
            if (typeof item.text === 'string') return item.text;
            if (typeof item.content === 'string') return item.content;
            return '';
          })
          .join('')
          .trim();
      }
      if (typeof content === 'object') {
        if (typeof content.text === 'string') return content.text;
        if (typeof content.content === 'string') return content.content;
      }
      return '';
    }

    async function requestOrbMultimodalAnalysis(questionText, screenshotFrames, timestampLabel) {
      if (!ensureSubtitleReady()) throw new Error('字幕文件尚未准备好');
      if (!Array.isArray(screenshotFrames) || screenshotFrames.length === 0) {
        throw new Error('缺少截图信息');
      }

      const screenshotDataEntries = await Promise.all(
        screenshotFrames.map(async (frame) => ({
          url: await blobToDataUrl(frame.blob),
          label: frame.label,
          timestamp: frame.timestamp,
          offset: frame.offset
        }))
      );
      const payload = {
        model: MULTIMODAL_MODEL,
        messages: buildMultimodalMessages(questionText, timestampLabel, screenshotDataEntries)
      };

      const response = await fetch(MULTIMODAL_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorPayload = await response.text();
        throw new Error(`多模态API请求失败: ${response.status} ${errorPayload}`);
      }

      const result = await response.json();
      const answer = extractAssistantText(result.choices?.[0]?.message?.content);
      return answer || '分析完成，但接口未返回文本内容。';
    }

    function recordVideoUnderstanding(promptText, summaryText) {
      const batch = [];
      if (promptText) batch.push({ role: 'user', content: promptText });
      if (summaryText) batch.push({ role: 'assistant', content: summaryText });
      if (batch.length) broadcastSessionMessages(batch);
    }

    // Ensure the AI reads the video once so later chats can reuse the shared summary.
    async function ensureVideoContextInitialized() {
      if (videoContextInitPromise) return videoContextInitPromise;

      const startInitialization = async () => {
        if (!video) throw new Error('视频元素缺失，无法执行视频理解');
        if (!ensureSubtitleReady()) await preloadSubtitleFile();
        if (!ensureSubtitleReady()) throw new Error('字幕文件加载失败');
        setAiSystemStatus('正在分析视频内容，请稍候...');

        try {
          const frames = await captureVideoSnapshotsOverWindow({
            startSeconds: 0,
            windowSeconds: VIDEO_CONTEXT_WINDOW_SECONDS,
            intervalSeconds: VIDEO_CONTEXT_INTERVAL_SECONDS
          });
          if (!frames.length) throw new Error('未采集到有效截图');
          const lastTimestamp = frames[frames.length - 1]?.timestamp || VIDEO_CONTEXT_WINDOW_SECONDS;
          const timestampLabel = `0s-${Math.max(Math.round(lastTimestamp), VIDEO_CONTEXT_INTERVAL_SECONDS)}s`;
          const summary = await requestOrbMultimodalAnalysis(VIDEO_CONTEXT_PROMPT, frames, timestampLabel);
          setAiSystemStatus('视频已经分析完成，请提出问题');
          recordVideoUnderstanding(VIDEO_CONTEXT_PROMPT, summary);
          return summary;
        } catch (error) {
          console.error('视频理解失败:', error);
          setAiSystemStatus('视频分析失败，请刷新页面后重试');
          throw error;
        }
      };

      videoContextInitPromise = startInitialization();
      videoContextInitPromise.catch(() => { videoContextInitPromise = null; });
      return videoContextInitPromise;
    }


    async function loadAndProcessDanmaku(url) {
      try {
        const encodedUrl = encodeAssetPath(url);
        const response = await fetch(encodedUrl);
        const xmlString = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        const danmakuElements = Array.from(xmlDoc.querySelectorAll('d'));
        const parsedData = [], tempMap = new Map();

        danmakuElements.forEach(d => {
          const pAttribute = d.getAttribute('p'), text = d.textContent;
          if (!pAttribute || !text) return;
          const params = pAttribute.split(','), mode = parseInt(params[1], 10);
          if (![1, 4, 5].includes(mode)) return;

          const id = d.getAttribute('id');
          const replyTo = d.getAttribute('reply_to');
          const time = parseFloat(params[0]);
          const sendTimeRaw = params[4];
          const sendTime = sendTimeRaw !== undefined ? parseInt(sendTimeRaw, 10) : NaN;
          const colorHex = '#' + parseInt(params[3], 10).toString(16).padStart(6, '0');
          const replyClusterId = d.getAttribute('reply_cluster');
          const replyClusterLabel = d.getAttribute('reply_cluster_label');
          const replyClusterOrderRaw = d.getAttribute('reply_cluster_order');
          const replyClusterOrder = replyClusterOrderRaw !== null ? parseInt(replyClusterOrderRaw, 10) : NaN;
          const opinionSet = d.getAttribute('opinion_set');

          const danmakuObj = {
            id,
            replyTo,
            text,
            time,
            sendTime: Number.isFinite(sendTime) ? sendTime : null,
            color: colorHex,
            replies: [],
            replyClusterId: replyClusterId || null,
            replyClusterLabel: replyClusterLabel || null,
            replyClusterOrder: Number.isFinite(replyClusterOrder) ? replyClusterOrder : null,
            opinionSet: opinionSet || null,
          };
          parsedData.push(danmakuObj);
          if (id) tempMap.set(id, danmakuObj);
        });

        parsedData.sort((a, b) => a.time - b.time);
        danmakuTotalCount = parsedData.length;
        syncDanmakuCount();

        const isValidReplyLink = (reply, parent) => {
          if (!reply || !parent) return false;
          if (!Number.isFinite(reply.time) || !Number.isFinite(parent.time)) return false;
          if (!Number.isFinite(reply.sendTime) || !Number.isFinite(parent.sendTime)) return false;
          return reply.time >= parent.time && reply.sendTime >= parent.sendTime;
        };

        parsedData.forEach(d => {
          if (d.replyTo && tempMap.has(d.replyTo)) {
            const parent = tempMap.get(d.replyTo);
            if (isValidReplyLink(d, parent)) {
              parent.replies.push(d);
            }
          }
        });

        parentDanmakuIds = new Set();
        parsedData.forEach(d => {
          if (!d.replyTo && d.id && Number.isFinite(d.replyClusterOrder) && d.replyClusterOrder === 1) {
            parentDanmakuIds.add(d.id);
          }
        });

        const getClusterKey = (item) => item?.replyClusterId || item?.opinionSet || null;
        const getTopClusterParentId = (item) => {
          if (!item || !item.replyTo) return item?.id || null;
          const clusterKey = getClusterKey(item);
          if (!clusterKey) return item?.id || null;
          let current = item;
          let topId = item.id || null;
          while (current.replyTo && tempMap.has(current.replyTo)) {
            const parent = tempMap.get(current.replyTo);
            if (!isValidReplyLink(current, parent)) break;
            const parentKey = getClusterKey(parent);
            if (parentKey && parentKey === clusterKey) {
              topId = parent.id || topId;
              current = parent;
            } else {
              break;
            }
          }
          return topId;
        };

        parentDanmakuIds.forEach(parentId => {
          const parent = tempMap.get(parentId);
          if (!parent) return;
          const clusterRootId = getTopClusterParentId(parent);
          const isNestedParent = clusterRootId && clusterRootId !== parent.id;
          const repliesSorted = [...parent.replies].sort((a, b) => a.time - b.time);
          const allMessages = [parent, ...repliesSorted].sort((a, b) => a.time - b.time);
          const structure = buildDialogueStructure(parent, repliesSorted);
          dialogueGroups.push({
            id: `group_${parent.id}`,
            parentId: parent.id,
            rootParentId: clusterRootId || parent.id,
            rootGroupId: clusterRootId ? `group_${clusterRootId}` : `group_${parent.id}`,
            isNestedParent,
            startTime: parent.time,
            title: parent.text,
            messages: allMessages,
            timeline: structure.timeline,
            color: CONNECTION_COLORS[dialogueGroups.length % CONNECTION_COLORS.length],
            assignedTrack: null,
            nextIdx: 0,
            parentLaunched: false,
            completedAt: null
          });
        });

        dialogueGroups.sort((a, b) => a.startTime - b.startTime);

        dialogueGroups.forEach(group => {
          group.messages.forEach(msg => {
            if (msg.id) dialogueDanmakuIds.add(msg.id);
          });
          const sequence = group.timeline || [];
          sequence.forEach((msg, index) => {
            if (msg.id) dialogueDanmakuIds.add(msg.id);
            if (Array.isArray(msg.clusterMessages)) {
              msg.clusterMessages.forEach(child => {
                if (child.id) dialogueDanmakuIds.add(child.id);
              });
            }
            msg.dialogueColor = group.color;
            msg.groupId = group.id;
            msg.dialogueIndex = index;
          });
        });

        const mergedData = mergeFloodDanmaku(parsedData);
        console.log(`加载完成: ${parsedData.length}条弹幕, ${dialogueGroups.length}个对话集（刷屏合并后剩余${mergedData.length}条）。`);
        return mergedData;
      } catch (error) {
        console.error("加载或解析弹幕文件失败:", error);
        alert(`弹幕文件加载失败，请确保 '${url}' 文件存在。`);
        return [];
      }
    }

    function isDialogueDanmaku(danmakuObj) {
      return dialogueDanmakuIds.has(danmakuObj.id);
    }

    function normalizeDanmakuText(text) {
      return text ? text.trim().replace(/\s+/g, ' ').toLowerCase() : '';
    }

    function mergeFloodDanmaku(list) {
      const merged = [];
      let bucket = [];
      let bucketKey = null;
      let bucketStart = 0;

      const flushBucket = () => {
        if (!bucket.length) return;
        if (bucket.length >= FLOOD_THRESHOLD) {
          const [first] = bucket;
          merged.push({
            ...first,
            floodCount: bucket.length,
            mergedIds: bucket.map(item => item.id).filter(Boolean),
          });
        } else {
          merged.push(...bucket);
        }
        bucket = [];
        bucketKey = null;
        bucketStart = 0;
      };

      list.forEach(item => {
        if (isDialogueDanmaku(item)) {
          flushBucket();
          merged.push(item);
          return;
        }
        const key = normalizeDanmakuText(item.text);
        if (!key) {
          flushBucket();
          merged.push(item);
          return;
        }
        if (!bucket.length) {
          bucket = [item];
          bucketKey = key;
          bucketStart = item.time;
          return;
        }
        const withinWindow = (item.time - bucketStart) <= FLOOD_WINDOW;
        if (key === bucketKey && withinWindow) {
          bucket.push(item);
        } else {
          flushBucket();
          bucket = [item];
          bucketKey = key;
          bucketStart = item.time;
        }
      });

      flushBucket();
      return merged;
    }

    function buildDialogueStructure(parent, replies = []) {
      const parentTimelineItem = {
        ...parent,
        isParent: true,
        isClusterNode: false,
        remainingCount: 0,
      };
      const timeline = [parentTimelineItem];
      const clusters = [];
      if (!replies.length) {
        return { timeline, clusters, hasClusters: false };
      }

      const directReplies = [...replies].sort((a, b) => a.time - b.time);
      const hasClusters = directReplies.some(reply => Array.isArray(reply.replies) && reply.replies.length > 0);

      if (!hasClusters) {
        if (directReplies.length > 0) {
          const first = { ...directReplies[0] };
          first.isClusterNode = false;
          first.remainingCount = Math.max(directReplies.length - 1, 0);
          first.simpleReplyBadge = true;
          timeline.push(first);
        }
        return { timeline, clusters, hasClusters: false };
      }

      const getNodeKey = (item) => item?.id ? `id_${item.id}` : `t_${item?.time}_${item?.text || ''}`;
      const allNodes = [];
      const seen = new Set();
      const addNode = (item) => {
        if (!item || !Number.isFinite(item.time)) return;
        const key = getNodeKey(item);
        if (seen.has(key)) return;
        seen.add(key);
        allNodes.push(item);
      };

      const queue = [...directReplies];
      queue.forEach(addNode);
      while (queue.length) {
        const node = queue.shift();
        const children = Array.isArray(node.replies) ? node.replies : [];
        children.forEach(child => {
          addNode(child);
          queue.push(child);
        });
      }

      const directReplyKeys = new Set(directReplies.map(getNodeKey));
      const timelineNodes = allNodes
        .filter(node => {
          const hasReplies = Array.isArray(node.replies) && node.replies.length > 0;
          return hasReplies || directReplyKeys.has(getNodeKey(node));
        })
        .sort((a, b) => a.time - b.time);

      timelineNodes.forEach(node => {
        const entry = { ...node };
        entry.replyClusterLabel = entry.replyClusterLabel || entry.text;
        const hasReplies = Array.isArray(entry.replies) && entry.replies.length > 0;
        if (hasReplies) {
          const leafReplies = entry.replies.filter(child => !(child.replies && child.replies.length));
          entry.isClusterNode = true;
          entry.clusterMessages = leafReplies;
          entry.clusterSize = leafReplies.length;
          entry.remainingCount = leafReplies.length;
          clusters.push({
            id: `cluster_${parent.id || 'root'}_${entry.id || entry.time}`,
            label: entry.replyClusterLabel,
            count: leafReplies.length,
            time: entry.time,
            messages: leafReplies,
          });
        } else {
          entry.isClusterNode = false;
          entry.clusterMessages = [];
          entry.clusterSize = 0;
          entry.remainingCount = 0;
        }
        timeline.push(entry);
      });

      return { timeline, clusters, hasClusters: true };
    }

    // 弹幕管理器
    class DanmakuManager {
      constructor(screenElement, totalTracks, dialogueTracksCount, normalTrackMode = DANMAKU_AREA_MODES.HALF) {
        this.screen = screenElement;
        this.numTotalTracks = totalTracks;
        this.numDialogueTracks = dialogueTracksCount;
        this.trackTimestamps = new Array(totalTracks).fill(0);
        this.normalTrackMode = normalTrackMode;
      }

      setNormalTrackMode(mode) {
        this.normalTrackMode = mode;
      }

      launch(danmakuObj, isDialogue, forcedTrack = null) {
        const danmakuElement = document.createElement('div');
        danmakuElement.classList.add('danmaku-item');
        const isFloodDanmaku = danmakuObj.floodCount && danmakuObj.floodCount > 1;
        danmakuElement.textContent = '';
        if (danmakuObj.isClusterNode) danmakuElement.classList.add('is-cluster-node');

        const textSpan = document.createElement('span');
        textSpan.className = 'danmaku-text';
        textSpan.textContent = danmakuObj.text;
        danmakuElement.appendChild(textSpan);
        if (isFloodDanmaku) {
          const countSpan = document.createElement('span');
          countSpan.className = 'danmaku-flood-count';
          countSpan.textContent = `×${danmakuObj.floodCount}`;
          danmakuElement.appendChild(countSpan);
          danmakuElement.dataset.floodCount = danmakuObj.floodCount;
        }
        danmakuElement.style.color = danmakuObj.color || '#ffffff';
        danmakuElement.dataset.id = danmakuObj.id;
        if (danmakuObj.groupId) danmakuElement.dataset.groupId = danmakuObj.groupId;
        if (danmakuObj.isParent) danmakuElement.dataset.isParent = '1';

        if (danmakuObj.remainingCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'danmaku-badge';
            if (danmakuObj.simpleReplyBadge) badge.classList.add('simple-reply-badge');
            if (danmakuObj.inlineBadge) badge.classList.add('inline-badge');
            badge.textContent = `+${danmakuObj.remainingCount}`;
            danmakuElement.appendChild(badge);
        }

        if (isDialogue) {
          danmakuElement.classList.add('is-dialogue-member');
          danmakuElement.style.setProperty('--dialogue-color', danmakuObj.dialogueColor);

          if (parentDanmakuIds.has(danmakuObj.id)) {
            danmakuElement.classList.add('is-parent-danmaku');
            danmakuElement.addEventListener('click', () => {
              bumpInteractionStat('溯源点击次数', 'parent danmaku click');
              showSidebarAndHighlight(danmakuObj.groupId);
            });
          } else if (danmakuObj.groupId) {
            danmakuElement.addEventListener('click', () => showSidebarAndHighlight(danmakuObj.groupId));
          }
        }

        const currentTime = video.currentTime;
        let containerWidth = this.screen.clientWidth || window.innerWidth;
        const BASE_SCROLL_SPEED = 150;
        const trackHeight = this.screen.clientHeight / this.numTotalTracks;

        danmakuElement.style.visibility = 'hidden';
        danmakuElement.style.top = '-1000px';
        this.screen.appendChild(danmakuElement);
        const danmakuWidth = danmakuElement.clientWidth;
        danmakuElement.remove();

        const totalScrollDistance = containerWidth + danmakuWidth;
        const duration = totalScrollDistance / BASE_SCROLL_SPEED;
        const timeToPassSelf = (danmakuWidth / BASE_SCROLL_SPEED) + 0.2;

        let targetTrack = -1;
        if (isDialogue) {
          if (forcedTrack !== null && forcedTrack >= 0 && forcedTrack < this.numDialogueTracks) targetTrack = forcedTrack;
          else return 0;
        } else {
          const normalTracks = Math.max(0, this.numTotalTracks - this.numDialogueTracks);
          let usableNormalTracks = 0;
          if (this.normalTrackMode === DANMAKU_AREA_MODES.REPLY_ONLY) {
            usableNormalTracks = 0;
          } else if (this.normalTrackMode === DANMAKU_AREA_MODES.FULL) {
            usableNormalTracks = normalTracks;
          } else {
            usableNormalTracks = Math.max(1, Math.ceil(normalTracks / 2));
          }
          if (usableNormalTracks <= 0) return 0;
          const firstNormalTrack = this.numDialogueTracks;
          const lastNormalTrack = Math.min(this.numTotalTracks - 1, firstNormalTrack + usableNormalTracks - 1);
          let bestTrack = firstNormalTrack;
          let earliestFreeTime = this.trackTimestamps[bestTrack];
          for (let i = firstNormalTrack + 1; i <= lastNormalTrack; i++) {
            if (this.trackTimestamps[i] < earliestFreeTime) {
              earliestFreeTime = this.trackTimestamps[i];
              bestTrack = i;
            }
          }
          targetTrack = bestTrack;
        }
        if (targetTrack === -1) return 0;
        
        const launchTime = Math.max(currentTime, this.trackTimestamps[targetTrack]);

        danmakuElement.style.setProperty('--scroll-to-x', `-${totalScrollDistance}px`);
        danmakuElement.style.animationName = 'danmaku-scroll';
        danmakuElement.style.animationDuration = `${duration}s`;
        danmakuElement.style.animationTimingFunction = 'linear';
        danmakuElement.style.animationFillMode = 'forwards';
        danmakuElement.style.top = `${targetTrack * trackHeight}px`;

        this.trackTimestamps[targetTrack] = launchTime + timeToPassSelf;

        const delay = launchTime - currentTime;
        if (delay > 0.01) danmakuElement.style.animationDelay = `${delay}s`;

        danmakuElement.style.visibility = 'visible';
        this.screen.appendChild(danmakuElement);
        
        if (isDialogue) addActiveDialogueDanmaku(danmakuElement, danmakuObj);
        
        danmakuElement.addEventListener('animationend', () => {
          if (isDialogue) removeActiveDialogueDanmaku(danmakuObj);
          danmakuElement.remove();
        });

        return launchTime + duration;
      }

      clear() { this.screen.innerHTML = ''; this.trackTimestamps.fill(0); }
      pause() { this.screen.classList.add('paused'); }
      resume() { this.screen.classList.remove('paused'); }
    }
    
    // ===== 连接线与弹幕追踪 =====
    function layoutConnectorLines() {
      const containerRect = container.getBoundingClientRect();
      for (const groupDanmakus of activeDialogueDanmaku.values()) {
        if (groupDanmakus.length < 2) continue;
        const sortedDanmakus = [...groupDanmakus].sort((a, b) => a.msg.dialogueIndex - b.msg.dialogueIndex);
        for (let i = 0; i < sortedDanmakus.length - 1; i++) {
          const fromDanmaku = sortedDanmakus[i], toDanmaku = sortedDanmakus[i+1];
          const lineId = `line-${fromDanmaku.msg.id}-to-${toDanmaku.msg.id}`;
          const line = document.getElementById(lineId);
          if (!line) continue;
          const fromRect = fromDanmaku.el.getBoundingClientRect();
          const toRect = toDanmaku.el.getBoundingClientRect();
          line.setAttribute('x1', fromRect.right - containerRect.left);
          line.setAttribute('y1', fromRect.top + fromRect.height / 2 - containerRect.top);
          line.setAttribute('x2', toRect.left - containerRect.left);
          line.setAttribute('y2', toRect.top + toRect.height / 2 - containerRect.top);
        }
      }
    }
    function updateConnectorLines() {
      layoutConnectorLines();
      lineAnimationId = requestAnimationFrame(updateConnectorLines);
    }

    function requestConnectorLayoutRefresh() {
      layoutConnectorLines();
      requestAnimationFrame(layoutConnectorLines);
      setTimeout(layoutConnectorLines, 350);
    }
    function startLineAnimation() { if (!lineAnimationId) lineAnimationId = requestAnimationFrame(updateConnectorLines); }
    function stopLineAnimation() { if (lineAnimationId) { cancelAnimationFrame(lineAnimationId); lineAnimationId = null; } }

    function addActiveDialogueDanmaku(el, msg) {
        if (!activeDialogueDanmaku.has(msg.groupId)) activeDialogueDanmaku.set(msg.groupId, []);
        const groupDanmakus = activeDialogueDanmaku.get(msg.groupId);
        if (msg.dialogueIndex > 0) {
            const prevDanmaku = groupDanmakus.find(d => d.msg.dialogueIndex === msg.dialogueIndex - 1);
            if (prevDanmaku) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.id = `line-${prevDanmaku.msg.id}-to-${msg.id}`;
                line.classList.add('dialogue-connector-line');
                line.style.setProperty('--dialogue-color', msg.dialogueColor);
                connectorSvg.appendChild(line);
            }
        }
        groupDanmakus.push({ el, msg });
        requestConnectorLayoutRefresh();
    }

    function removeActiveDialogueDanmaku(msg) {
        if (!activeDialogueDanmaku.has(msg.groupId)) return;
        const groupDanmakus = activeDialogueDanmaku.get(msg.groupId);
        const index = groupDanmakus.findIndex(d => d.msg.id === msg.id);
        if (index > -1) groupDanmakus.splice(index, 1);
        if (groupDanmakus.length === 0) activeDialogueDanmaku.delete(msg.groupId);
        document.querySelectorAll(`[id*="-to-${msg.id}"], [id*="line-${msg.id}-to-"]`).forEach(line => line.remove());
        requestConnectorLayoutRefresh();
    }
    
    function rebuildFromTime(seekTime) {
      if (!danmakuManager) return;
      danmakuManager.clear();
      stopLineAnimation();
      connectorSvg.innerHTML = '';
      activeDialogueDanmaku.clear();
      if (!video.paused) startLineAnimation();

      dialogueLaunchQueue = [];
      dialogueTracks.forEach(track => { track.reservedForGroupId = null; track.releaseAt = 0; });
      dialogueGroups.forEach(group => {
        group.assignedTrack = null;
        const sequence = group.timeline || [];
        let ni = sequence.findIndex(m => m.time >= seekTime);
        group.nextIdx = (ni === -1) ? sequence.length : ni;
        const parent = sequence[0];
        group.parentLaunched = !!(parent && parent.time <= seekTime);
        const lastMsg = sequence[sequence.length - 1];
        group.completedAt = (lastMsg && lastMsg.time <= seekTime) ? seekTime : null;
      });

      danmakuIndex = danmakuData.findIndex(d => d.time >= seekTime) ?? danmakuData.length;
      if (danmakuIndex === -1) danmakuIndex = danmakuData.length;

      const expandedCardIds = new Set(Array.from(document.querySelectorAll('.dialogue-card.expanded'), card => card.id));
      reconcileSidebar(seekTime);
      expandedCardIds.forEach(id => {
        const card = document.getElementById(id);
        if (card) {
          card.classList.add('expanded');
          card.querySelector('.expand-toggle').textContent = '−';
          const body = card.querySelector('.message-list');
          if (!body.classList.contains('scrollable')) body.style.maxHeight = body.scrollHeight + 'px';
        }
      });
      document.querySelectorAll('.dialogue-card').forEach(card => updateCardContent(card, seekTime));
      
      dialogueIndex = dialogueGroups.findIndex(g => g.startTime >= seekTime) ?? dialogueGroups.length;
      if (dialogueIndex === -1) dialogueIndex = dialogueGroups.length;
    }

    // ===== 初始化与事件绑定 =====
    function handleVideoMetadata() {
      syncLayoutHeight();
      renderBottomHeatmap();
    }

    async function initializePlayer() {
      syncVideoShelf();

      await loadVideoBundle(activeVideoConfig);

      video.addEventListener('loadedmetadata', handleVideoMetadata);
      if (video.readyState >= 1) handleVideoMetadata();

      window.addEventListener('resize', () => { syncLayoutHeight(); rebuildFromTime(video.currentTime); });
      if (mainContent) {
        mainContent.addEventListener('transitionend', (event) => {
          if (event.propertyName === 'width') scheduleVideoShelfLayout();
        });
      }
      video.addEventListener('play', () => {
        danmakuManager.resume();
        startLineAnimation();
        removeInteractionMenu();
        startHeatmapPlayheadLoop();
      });
      video.addEventListener('pause', () => {
        danmakuManager.pause();
        stopLineAnimation();
        stopHeatmapPlayheadLoop();
        updateHeatmapPlayhead(video.currentTime);
      });
      video.addEventListener('ended', () => {
        stopHeatmapPlayheadLoop();
        updateHeatmapPlayhead(video.currentTime);
      });
      video.addEventListener('seeking', () => rebuildFromTime(video.currentTime));
      video.addEventListener('seeked', () => updateHeatmapPlayhead(video.currentTime));

      video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;
        dialogueTracks.forEach(track => {
          if (track.releaseAt > 0 && currentTime >= track.releaseAt) track.reservedForGroupId = null;
        });

        dialogueGroups.forEach(group => {
          if (group.startTime <= currentTime && group.assignedTrack === null && !dialogueLaunchQueue.some(g => g.id === group.id)) {
            dialogueLaunchQueue.push(group);
            dialogueLaunchQueue.sort((a, b) => a.startTime - b.startTime);
          }
        });

        let freeIdx;
        while (dialogueLaunchQueue.length > 0 && (freeIdx = dialogueTracks.findIndex(t => t.reservedForGroupId === null)) !== -1) {
          const nextGroup = dialogueLaunchQueue.shift();
          nextGroup.assignedTrack = freeIdx;
          dialogueTracks[freeIdx].reservedForGroupId = nextGroup.id;
        }

        dialogueGroups.forEach(group => {
          if (group.assignedTrack === null) return;
          const sequence = group.timeline || [];
          while (group.nextIdx < sequence.length && sequence[group.nextIdx].time <= currentTime) {
            const msg = sequence[group.nextIdx];
            const exitTime = danmakuManager.launch(msg, true, group.assignedTrack);
            if (msg.isParent && !group.parentLaunched) {
              group.parentLaunched = true;
            }
            if (group.nextIdx === sequence.length - 1 && exitTime > 0) {
              dialogueTracks[group.assignedTrack].releaseAt = exitTime;
              group.completedAt = exitTime;
            }
            group.nextIdx++;
          }
        });

        dialogueGroups.forEach(group => {
          if (group.assignedTrack !== null && group.completedAt && currentTime >= group.completedAt) {
            group.assignedTrack = null;
          }
        });

        while (danmakuIndex < danmakuData.length && danmakuData[danmakuIndex].time <= currentTime) {
          const item = danmakuData[danmakuIndex];
          if (!isDialogueDanmaku(item)) danmakuManager.launch(item, false);
          danmakuIndex++;
        }

        while (dialogueIndex < dialogueGroups.length && dialogueGroups[dialogueIndex].startTime <= currentTime) {
          const group = dialogueGroups[dialogueIndex];
          if (group.parentLaunched && !document.getElementById(group.id)) {
            createDialogueCardFrame(group);
          }
          if (!group.parentLaunched) break;
          dialogueIndex++;
        }
        reconcileSidebar(currentTime);
        document.querySelectorAll('.dialogue-card').forEach(card => updateCardContent(card, currentTime));
      });

      if (dialogueSidebar) {
        const dialogueSidebarToggle = dialogueSidebar.querySelector('.sidebar-toggle-button');
        if (dialogueSidebarToggle) {
          dialogueSidebarToggle.addEventListener('click', () => {
            const willOpen = !dialogueSidebar.classList.contains('sidebar-open');
            dialogueSidebar.classList.toggle('sidebar-open');
            document.body.classList.toggle('sidebar-is-open');
            scheduleVideoShelfLayout();
            if (willOpen) bumpInteractionStat('侧边栏打开次数', 'dialogue sidebar open');
            requestConnectorLayoutRefresh();
          });
        }
      }
      if (aiSidebar) {
        const aiSidebarToggle = aiSidebar.querySelector('.sidebar-toggle-button');
        if (aiSidebarToggle) {
          aiSidebarToggle.addEventListener('click', () => {
            toggleAiSidebarPanel();
          });
        }
      }
      updateAiSidebarUI();
      resetAiSidebarConversation();
      const startVideoUnderstanding = () => {
        if (!ENABLE_AUTO_VIDEO_CONTEXT) return;
        ensureVideoContextInitialized().catch(err => console.warn('视频理解初始化失败:', err));
      };
      if (video.readyState >= 2) {
        startVideoUnderstanding();
      } else {
        video.addEventListener('loadeddata', startVideoUnderstanding, { once: true });
      }
      mainContent.addEventListener('transitionend', (e) => {
        syncLayoutHeight();
        if (e.propertyName === 'width') requestConnectorLayoutRefresh();
      });
      document.body.addEventListener('transitionend', (e) => {
        if (
          e.target === document.body &&
          (e.propertyName === 'padding-left' || e.propertyName === 'padding-right')
        ) {
          requestConnectorLayoutRefresh();
        }
      });

      const onFullscreenChange = () => {
        rebuildFromTime(video.currentTime);
        fsToggle2.textContent = isFullscreen() ? '退出全屏' : '全屏';
      };
      document.addEventListener('fullscreenchange', onFullscreenChange);
      document.addEventListener('webkitfullscreenchange', onFullscreenChange);
      const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement || container.classList.contains('pseudo-fullscreen'));
      const toggleFs = () => {
        if (isFullscreen()) {
          (document.exitFullscreen || document.webkitExitFullscreen).call(document).catch(() => {});
          container.classList.remove('pseudo-fullscreen');
        } else {
          (container.requestFullscreen || container.webkitRequestFullscreen).call(container).catch(() => container.classList.add('pseudo-fullscreen'));
        }
        onFullscreenChange();
      };
      fsToggle2.addEventListener('click', toggleFs);

      video.addEventListener('click', toggleVideoPlayback);
      video.addEventListener('dblclick', (e) => e.preventDefault());

      danmakuScreen.addEventListener('contextmenu', handleDanmakuRightClick);
      danmakuScreen.addEventListener('click', handleDanmakuLeftClick);
    }

    function showTapIndicator(kind) {
      tapIndicator.textContent = '';
      tapIndicator.classList.toggle('play-icon', kind === 'play');
      tapIndicator.classList.toggle('pause-icon', kind === 'pause');
      tapIndicator.setAttribute('aria-label', kind === 'play' ? '播放' : '暂停');
      tapIndicator.classList.add('show');
      clearTimeout(tapIndicator._timer);
      tapIndicator._timer = setTimeout(() => tapIndicator.classList.remove('show'), 500);
    }

    function toggleVideoPlayback() {
      if (!video) return;
      if (video.paused) {
        video.play();
        showTapIndicator('play');
      } else {
        video.pause();
        showTapIndicator('pause');
      }
    }
    
    // ===== 弹幕交互功能 (赞/踩) =====
    let activeInteractionMenu = null;
    // 【修改】使用指定的图片路径
    const LIKE_ICON_SRC = "./assets/images/赞 (1).png";
    const DISLIKE_ICON_SRC = "./assets/images/踩 (1).png";
    const AI_ICON_SRC = "./assets/images/AI.png";

    function removeInteractionMenu() {
        if (activeInteractionMenu) {
            activeInteractionMenu.remove();
            activeInteractionMenu = null;
        }
    }

    function isDialogueAreaDanmaku(element) {
        return element && element.classList.contains('is-dialogue-member');
    }

    function handleDanmakuLeftClick(e) {
        const targetDanmaku = e.target.closest('.danmaku-item');
        if (!targetDanmaku) return;
        if (isDialogueAreaDanmaku(targetDanmaku)) {
            if (!video.paused) {
                video.pause();
                showTapIndicator('pause');
            }
        } else {
            toggleVideoPlayback();
        }
        const removed = clearDanmakuReaction(targetDanmaku);
        if (removed) {
            e.stopPropagation();
            removeInteractionMenu();
        }
    }

      function setAiPopoverOpenState(open) {
        if (!aiPopover) return;
        if (!open && isOrbProcessing) return;
        aiPopover.classList.toggle('open', open);
        aiPopover.setAttribute('aria-hidden', open ? 'false' : 'true');
      }

      function updateAiPopoverStatus(text) {
        if (!aiPopoverStatus) return;
        aiPopoverStatus.textContent = text || '';
      }

      function applyOrbProcessingVisuals(isBusy) {
        if (!aiOrbButton) return;
        aiOrbButton.classList.toggle('is-loading', isBusy);
        if (isBusy) {
          aiOrbButton.setAttribute('aria-busy', 'true');
        } else {
          aiOrbButton.removeAttribute('aria-busy');
        }
      }

      function updateOrbProcessingState() {
        const shouldBeBusy = orbProcessingLocks > 0;
        if (isOrbProcessing === shouldBeBusy) return;
        isOrbProcessing = shouldBeBusy;
        applyOrbProcessingVisuals(isOrbProcessing);
      }

      function lockOrbProcessing() {
        orbProcessingLocks++;
        updateOrbProcessingState();
      }

      function unlockOrbProcessing() {
        if (orbProcessingLocks > 0) orbProcessingLocks--;
        updateOrbProcessingState();
      }

      function setAiSidebarOpenState(open) {
        if (!aiSidebar) return;
        aiSidebar.classList.toggle('sidebar-open', open);
        document.body.classList.toggle('ai-sidebar-is-open', open);
        scheduleVideoShelfLayout();
      }

      function toggleAiSidebarPanel() {
        if (!aiSidebar) return;
        setAiSidebarOpenState(!aiSidebar.classList.contains('sidebar-open'));
      }

      function updateAiSidebarUI() {
        if (aiSidebar) {
          aiSidebar.classList.remove('video-mode');
          aiSidebar.classList.remove('danmaku-mode');
        }
        if (aiQuestionInput) {
          aiQuestionInput.placeholder = '输入弹幕问题，AI 已加载视频上下文';
        }
      }

      function getSystemMessageElement() {
        if (aiSystemMessage) return aiSystemMessage;
        if (!aiSystemMessageFallback) {
          aiSystemMessageFallback = document.createElement('div');
          aiSystemMessageFallback.className = 'ai-message system';
        }
        return aiSystemMessageFallback;
      }

      function refreshAiSystemMessage() {
        const target = getSystemMessageElement();
        if (!target) return;
        const baseText = AI_SIDEBAR_DEFAULT_HINT;
        target.textContent = aiSystemStatusText ? `${baseText}\n${aiSystemStatusText}` : baseText;
      }

      function setAiSystemStatus(text) {
        aiSystemStatusText = text && text.trim() ? text.trim() : '';
        refreshAiSystemMessage();
      }

      function resetAiSidebarConversation() {
        resetChatSessions();
        aiSystemStatusText = '';
        if (!aiMessages) return;
        aiMessages.innerHTML = '';
        refreshAiSystemMessage();
        const systemEl = getSystemMessageElement();
        if (systemEl) aiMessages.appendChild(systemEl);
      }

    function openAiSidebarWithDanmakuContent(content, { autoSend = false } = {}) {
        if (!aiSidebar) return;
        setAiSidebarOpenState(true);

        const danmakuText = (content || '').trim();
        const questionText = buildAiQuestionFromDanmaku(danmakuText);
        // 直接提问，不在输入框中展示问题文本
        if (aiQuestionInput) aiQuestionInput.value = '';
        if (autoSend && questionText) {
            sendAiRequest(questionText);
        }
    }

    let activeAiChoiceBlock = null;
    function showAiPromptChoices({ singleQuestion, groupQuestion, groupTitle }) {
        if (!aiMessages) return;
        if (activeAiChoiceBlock) {
            activeAiChoiceBlock.remove();
            activeAiChoiceBlock = null;
        }
        const block = document.createElement('div');
        block.className = 'ai-message system ai-choice-block';
        const title = document.createElement('div');
        title.textContent = groupTitle ? `选择提问范围（${groupTitle}）` : '选择提问范围';
        block.appendChild(title);

        const buttons = document.createElement('div');
        buttons.className = 'ai-choice-buttons';

        const addBtn = (label, question) => {
            const btn = document.createElement('button');
            btn.className = 'ai-choice-btn';
            btn.textContent = label;
            btn.addEventListener('click', () => {
                if (question) sendAiRequest(question);
                block.remove();
                activeAiChoiceBlock = null;
            });
            buttons.appendChild(btn);
        };

        addBtn('只问这条首弹幕', singleQuestion);
        addBtn('问整个对话集', groupQuestion || singleQuestion);

        block.appendChild(buttons);
        aiMessages.appendChild(block);
        aiMessages.scrollTop = aiMessages.scrollHeight;
        activeAiChoiceBlock = block;
    }

    function handleDanmakuRightClick(e) {
        e.preventDefault();
        const targetDanmaku = e.target.closest('.danmaku-item');
        if (!targetDanmaku) return;

        video.pause();
        removeInteractionMenu();

        const menu = document.createElement('div');
        menu.className = 'danmaku-interaction-menu';

        // 点赞按钮
        const likeBtn = document.createElement('img');
        likeBtn.src = LIKE_ICON_SRC;
        likeBtn.className = 'danmaku-interaction-icon';
        likeBtn.title = '赞';
        likeBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            addDanmakuReaction(targetDanmaku, 'like');
            removeInteractionMenu();
        });

        // 点踩按钮
        const dislikeBtn = document.createElement('img');
        dislikeBtn.src = DISLIKE_ICON_SRC; // 【修改】使用点踩图片
        dislikeBtn.className = 'danmaku-interaction-icon'; // 【修改】移除 .dislike 类
        dislikeBtn.title = '踩';
        dislikeBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            addDanmakuReaction(targetDanmaku, 'dislike');
            removeInteractionMenu();
        });

        const aiBtn = document.createElement('img');
        aiBtn.src = AI_ICON_SRC;
        aiBtn.className = 'danmaku-interaction-icon';
        aiBtn.title = 'AI';
        aiBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const textSpan = targetDanmaku.querySelector('.danmaku-text');
            const danmakuText = textSpan ? textSpan.textContent : targetDanmaku.textContent;
            const isParent = targetDanmaku.classList.contains('is-parent-danmaku');
            if (isParent) {
                const group = findGroupByDanmakuElement(targetDanmaku);
                const singleQuestion = buildAiQuestionFromDanmaku(danmakuText);
                const groupQuestion = buildGroupQuestionFromDialogue(group);
                openAiSidebarWithDanmakuContent(danmakuText, { autoSend: false });
                showAiPromptChoices({
                    singleQuestion,
                    groupQuestion,
                    groupTitle: group?.title || danmakuText
                });
            } else {
                openAiSidebarWithDanmakuContent(danmakuText, { autoSend: AUTO_SEND_AI_ON_RIGHT_CLICK });
            }
            removeInteractionMenu();
        });

        menu.appendChild(likeBtn);
        menu.appendChild(dislikeBtn);
        menu.appendChild(aiBtn);
        danmakuScreen.appendChild(menu);
        activeInteractionMenu = menu;

        const danmakuRect = targetDanmaku.getBoundingClientRect();
        const screenRect = danmakuScreen.getBoundingClientRect();

        menu.style.left = `${danmakuRect.left - screenRect.left + danmakuRect.width / 2}px`;
        menu.style.top = `${danmakuRect.top - screenRect.top}px`;
    }

    function clearDanmakuReaction(danmakuElement) {
        if (!danmakuElement) return false;
        const existingReaction = danmakuElement.querySelector('.danmaku-reaction-icon');
        if (existingReaction) {
            existingReaction.remove();
            return true;
        }
        return false;
    }

    function addDanmakuReaction(danmakuElement, type) {
        clearDanmakuReaction(danmakuElement);

        const reactionIcon = document.createElement('img');
        reactionIcon.className = 'danmaku-reaction-icon';
        
        // 【修改】根据类型设置正确的图片源
        if (type === 'like') {
            reactionIcon.src = LIKE_ICON_SRC;
        } else { // 'dislike'
            reactionIcon.src = DISLIKE_ICON_SRC;
        }
        
        danmakuElement.appendChild(reactionIcon);
    }
    // ===========================================

    // ===== 侧边栏交互 =====
    function showSidebarAndHighlight(groupId) {
        if (!dialogueSidebar.classList.contains('sidebar-open')) {
            dialogueSidebar.classList.add('sidebar-open');
            document.body.classList.add('sidebar-is-open');
        }
        const group = dialogueGroups.find(g => g.id === groupId);
        const targetGroupId = (group && group.isNestedParent && group.rootGroupId) ? group.rootGroupId : groupId;
        const card = document.getElementById(targetGroupId);
        if (!card) return;
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (!card.classList.contains('expanded')) card.querySelector('.card-header').click();
        card.classList.add('highlighted');
        setTimeout(() => card.classList.remove('highlighted'), 2000);
        requestConnectorLayoutRefresh();
    }

    function createDialogueCardFrame(dialogue) {
      const card = document.createElement('div');
      card.className = 'dialogue-card'; card.id = dialogue.id;
      card.style.setProperty('--dialogue-color', dialogue.color);
      const header = document.createElement('div');
      header.className = 'card-header';
      header.innerHTML = `<span class="card-title" title="${dialogue.title}">${dialogue.title}</span><span class="expand-toggle">+</span>`;
      const body = document.createElement('div');
      body.className = 'message-list';
      const timelineLength = (dialogue.timeline && dialogue.timeline.length) || dialogue.messages.length || 0;
      if (timelineLength > SCROLL_THRESHOLD) body.classList.add('scrollable');
      const ul = document.createElement('ul');
      body.appendChild(ul); card.appendChild(header); card.appendChild(body);
      sidebarContent.appendChild(card);
      header.addEventListener('click', () => {
        card.classList.toggle('expanded');
        header.querySelector('.expand-toggle').textContent = card.classList.contains('expanded') ? '−' : '+';
        body.style.maxHeight = (card.classList.contains('expanded') && !body.classList.contains('scrollable')) ? `${body.scrollHeight}px` : '';
      });
      ul.addEventListener('click', (e) => {
        const toggle = e.target.closest('.cluster-expand-toggle');
        if (toggle) {
          const clusterNode = toggle.closest('.cluster-node');
          if (clusterNode) {
            const wasCollapsed = clusterNode.classList.contains('collapsed');
            clusterNode.classList.toggle('collapsed');
            if (wasCollapsed) bumpInteractionStat('语义簇展开次数', 'cluster expand');
          }
          return;
        }
        const targetLi = e.target.closest('li[data-time]');
        if (targetLi && targetLi.dataset.time) {
          const seekTime = parseFloat(targetLi.dataset.time);
          if (!Number.isNaN(seekTime)) {
            bumpInteractionStat('信息检索/跳转次数', 'sidebar jump');
            video.currentTime = seekTime - 0.2;
            video.play();
          }
        }
      });
      return card;
    }

    function reconcileSidebar(currentTime) {
      const groupsToShow = dialogueGroups.filter(g => g.parentLaunched && g.startTime <= currentTime && !g.isNestedParent);
      const idsToShow = new Set(groupsToShow.map(g => g.id));
      const currentCards = Array.from(sidebarContent.children);
      currentCards.forEach(card => { if (!idsToShow.has(card.id)) card.remove(); });
      const currentCardIds = new Set(currentCards.map(c => c.id));
      groupsToShow.forEach(group => {
        if (!currentCardIds.has(group.id)) createDialogueCardFrame(group);
        const cardElement = document.getElementById(group.id);
        if (cardElement) sidebarContent.appendChild(cardElement);
      });
    }

    function updateCardContent(card, currentTime) {
      const group = dialogueGroups.find(g => g.id === card.id);
      if (!group) return;

      const isActive = group.parentLaunched && (!group.completedAt || currentTime < group.completedAt);
      card.classList.toggle('active', isActive);

      const ul = card.querySelector('ul');
      if (!ul) return;

      const hasClusterNodes = (group.timeline || []).some(item => item.isClusterNode);

      if (!hasClusterNodes) {
        const messagesToShow = (group.messages || []).filter(msg => typeof msg.time === 'number' && msg.time <= currentTime);
        const simpleHtml = messagesToShow.map(msg => `
          <li data-time="${msg.time}" class="dialogue-message-item">
            <div class="dialogue-message-content">
              <span class="time-tag">${formatTime(msg.time)}</span>
              <span class="message-text">${msg.text}</span>
            </div>
          </li>
        `).join('');

        if (ul.innerHTML !== simpleHtml) {
          ul.innerHTML = simpleHtml;
        }

        const body = card.querySelector('.message-list');
        if (card.classList.contains('expanded') && !body.classList.contains('scrollable')) {
          body.style.maxHeight = body.scrollHeight + 'px';
        }
        return;
      }

      const previousClusterStates = new Map();
      ul.querySelectorAll('.cluster-node').forEach(node => {
        if (node.dataset.id) {
          previousClusterStates.set(node.dataset.id, node.classList.contains('collapsed'));
        }
      });

      const generateHtmlForItem = (item) => {
        if (typeof item.time !== 'number' || item.time > currentTime) return '';

        if (item.isClusterNode && Array.isArray(item.clusterMessages) && item.clusterMessages.length > 0) {
          const clusterId = String(item.id || item.time);
          const isCollapsed = previousClusterStates.get(clusterId) !== false;
          const repliesHtml = item.clusterMessages
            .filter(reply => typeof reply.time === 'number' && reply.time <= currentTime)
            .map(reply => `
              <li data-time="${reply.time}" class="dialogue-message-item">
                <span class="time-tag">${formatTime(reply.time)}</span>
                <span class="message-text">${reply.text}</span>
              </li>
            `).join('');

          return `
            <li class="cluster-node${isCollapsed ? ' collapsed' : ''}" data-id="${clusterId}" data-time="${item.time}">
              <div class="dialogue-message-content">
                <span class="cluster-expand-toggle" aria-hidden="true"></span>
                <span class="time-tag">${formatTime(item.time)}</span>
                <span class="message-text">${item.text}</span>
                <span class="cluster-count">+${item.remainingCount}</span>
              </div>
              ${repliesHtml ? `<ul class="cluster-replies">${repliesHtml}</ul>` : ''}
            </li>`;
        }

        return `
          <li data-time="${item.time}" class="dialogue-message-item">
            <div class="dialogue-message-content">
              <span class="time-tag">${formatTime(item.time)}</span>
              <span class="message-text">${item.text}</span>
            </div>
          </li>`;
      };

      const timelineToShow = (group.timeline || []).filter(msg => typeof msg.time === 'number' && msg.time <= currentTime);
      const newHtml = timelineToShow.map(generateHtmlForItem).join('');

      if (ul.innerHTML !== newHtml) {
        ul.innerHTML = newHtml;
      }

      const body = card.querySelector('.message-list');
      if (card.classList.contains('expanded') && !body.classList.contains('scrollable')) {
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    }

// ===== AI 问答面板 =====
    function appendAiMessage(role, text, context = 'sidebar') {
      const ctx = getChatContext(context);
      if (!ctx?.messagesEl) return null;
      const bubble = document.createElement('div');
      bubble.className = `ai-message ${role}`;
      bubble.textContent = text;
      ctx.messagesEl.appendChild(bubble);
      ctx.messagesEl.scrollTop = ctx.messagesEl.scrollHeight;
      return bubble; // 返回创建的元素，方便后续更新
    }

    function renderMarkdownInto(element, markdownText) {
      if (!element) return;
      const content = markdownText || '';
      if (window.marked && typeof window.marked.parse === 'function') {
        element.innerHTML = window.marked.parse(content);
      } else {
        element.textContent = content;
      }
    }

    async function handleOrbClick() {
      if (!aiOrbButton) return;
      const popoverIsOpen = aiPopover?.classList.contains('open');

      if (popoverIsOpen) {
        // 修改后：无论是否在思考，只要点击都允许关闭
        setAiPopoverOpenState(false);
        return;
      }

      if (isOrbProcessing) {
        setAiPopoverOpenState(true);
        return;
      }

      if (!video) {
        alert('视频元素缺失，无法执行多模态分析');
        return;
      }

      if (!ensureSubtitleReady()) await preloadSubtitleFile();
      if (!ensureSubtitleReady()) {
        alert('字幕文件加载失败，请稍后重试');
        return;
      }

      const timestampLabel = formatTime(video.currentTime || 0);
      const customQuestion = aiOrbQuestionInput?.value?.trim();
      if (aiOrbQuestionInput) aiOrbQuestionInput.value = '';
      const questionText = buildOrbPrompt(customQuestion, timestampLabel);
      if (aiOrbSystemMessage) {
        aiOrbSystemMessage.textContent = questionText;
      }

      setAiPopoverOpenState(true);

      const userBubbleText = `【多模态提问】${questionText}\n时间：${timestampLabel}`;
      appendAiMessage('user', userBubbleText, 'orb');
      const assistantBubble = appendAiMessage('assistant', '正在上传多帧截图与字幕，请稍候...', 'orb') || null;
      updateAiPopoverStatus('正在上传多帧截图与字幕，请稍候...');

      lockOrbProcessing();

      try {
        const screenshotFrames = await captureContextFrameBlobs(video.currentTime || 0);
        const answer = await requestOrbMultimodalAnalysis(questionText, screenshotFrames, timestampLabel);
        if (assistantBubble) {
          renderMarkdownInto(assistantBubble, answer);
          assistantBubble.classList.remove('error');
        }
        updateAiPopoverStatus(answer);
      } catch (error) {
        console.error('多模态分析失败:', error);
        if (assistantBubble) {
          assistantBubble.textContent = `多模态分析失败：${error.message}`;
          assistantBubble.classList.add('error');
        } else {
          alert(`多模态分析失败：${error.message}`);
        }
        updateAiPopoverStatus(`多模态分析失败：${error.message}`);
      } finally {
        unlockOrbProcessing();
      }
    }

    function buildAiRequestPayload(question, { context = 'sidebar' } = {}) {
      const ctx = getChatContext(context);
      const mode = (ctx?.replyModeSelect && ctx.replyModeSelect.value) || 'short';
      const messages = [];
      if (mode === 'short' && AI_RESPONSE_GUIDELINE) {
        messages.push({ role: 'system', content: AI_RESPONSE_GUIDELINE });
      } else if (mode === 'long' && AI_RESPONSE_GUIDELINE_LONG) {
        messages.push({ role: 'system', content: AI_RESPONSE_GUIDELINE_LONG });
      }
      const session = getChatSession(context);
      messages.push(...cloneHistoryMessages(session.history));
      messages.push({ role: 'user', content: question });

      const payload = {
        model: MULTIMODAL_MODEL,
        messages,
        stream: true
      };
      if (mode === 'short') payload.max_tokens = AI_RESPONSE_MAX_TOKENS;
      return payload;
    }

    async function sendAiRequest(question, { context = 'sidebar' } = {}) {
      if (!question) return;

      const ctx = getChatContext(context);
      appendAiMessage('user', question, context);
      if (context === 'sidebar' && aiSidebar && !aiSidebar.classList.contains('sidebar-open')) {
        setAiSidebarOpenState(true);
      }
      if (ctx?.inputEl) ctx.inputEl.focus();

      if (ctx?.sendBtn) ctx.sendBtn.disabled = true;
      const assistantBubble = appendAiMessage('assistant', '思考中...', context);
      const lockOrbForThisRequest = context === 'orb';
      if (lockOrbForThisRequest) lockOrbProcessing();

      try {
        try {
          await ensureVideoContextInitialized();
        } catch (initError) {
          console.warn('视频理解尚未完成，继续处理当前提问：', initError);
        }

        const response = await fetch(SILICONFLOW_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(buildAiRequestPayload(question, { context }))
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API 请求失败: ${response.status} - ${errorData.error.message || '未知错误'}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";
        let isFirstChunk = true;

        // 循环读取数据流
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value);
          const lines = chunkText.split('\n').filter(line => line.trim().startsWith('data: '));

          for (const line of lines) {
            const jsonStr = line.substring(6); // 移除 "data: " 前缀
            if (jsonStr === '[DONE]') break;

            try {
              const chunkData = JSON.parse(jsonStr);
              const deltaContent = chunkData.choices[0]?.delta?.content;

              if (deltaContent) {
                if (isFirstChunk) {
                  assistantBubble.innerHTML = '';
                  isFirstChunk = false;
                }
                fullResponse += deltaContent;
                renderMarkdownInto(assistantBubble, fullResponse);
                if (ctx?.messagesEl) ctx.messagesEl.scrollTop = ctx.messagesEl.scrollHeight; // 保持滚动条在底部
              }
            } catch (e) {
              console.error('解析数据流中的JSON失败:', e, '原始行:', line);
            }
          }
        }

        appendSessionMessages(context, [
          { role: 'user', content: question },
          { role: 'assistant', content: fullResponse }
        ]);

        if (context === 'sidebar') {
          const session = getChatSession(context);
          if (session.history.length > 2) {
            bumpInteractionStat('AI对话深度', 'ai follow-up');
          }
        }
      } catch (error) {
        console.error('AI 请求过程中发生错误:', error);
        assistantBubble.textContent = `抱歉，请求出错了: ${error.message}`;
        assistantBubble.style.backgroundColor = '#fed7d7'; // 用红色背景提示错误
        assistantBubble.style.borderColor = '#c53030';
      } finally {
        if (ctx?.sendBtn) ctx.sendBtn.disabled = false;
        if (ctx?.inputEl) ctx.inputEl.focus();
        if (lockOrbForThisRequest) unlockOrbProcessing();
      }
    }

    async function handleAiSend() {
      if (!aiQuestionInput) return;
      const question = aiQuestionInput.value.trim();
      if (!question) return;
      aiQuestionInput.value = '';
      await sendAiRequest(question, { context: 'sidebar' });
    }

    async function handleOrbTextSend() {
      if (!aiOrbQuestionInput) return;
      const question = aiOrbQuestionInput.value.trim();
      if (!question) return;
      aiOrbQuestionInput.value = '';
      await sendAiRequest(question, { context: 'orb' });
    }

    if (aiSendBtn) aiSendBtn.addEventListener('click', handleAiSend);
    if (aiQuestionInput) {
      aiQuestionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleAiSend();
        }
      });
    }

    if (aiOrbSendBtn) aiOrbSendBtn.addEventListener('click', handleOrbTextSend);
    if (aiOrbQuestionInput) {
      aiOrbQuestionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleOrbTextSend();
        }
      });
    }

    function toggleManualAiReply() {
      manualAiReplyEnabled = !manualAiReplyEnabled;
      if (danmakuAiToggle) {
        danmakuAiToggle.classList.toggle('active', manualAiReplyEnabled);
        danmakuAiToggle.setAttribute('aria-pressed', String(manualAiReplyEnabled));
        danmakuAiToggle.title = manualAiReplyEnabled ? 'AI自动回复已开启' : '开启AI自动回复';
      }
    }

    function sendManualDanmaku() {
      if (!danmakuManager || !danmakuInput) return;
      const text = danmakuInput.value.trim();
      if (!text) return;

      danmakuManager.launch({ text, time: video.currentTime, color: '#FFFFFF' }, false);
      if (video.paused) {
        danmakuManager.pause(); // 保持新增弹幕在暂停时不滚动
      }
      if (manualAiReplyEnabled) {
        openAiSidebarWithDanmakuContent(text, { autoSend: true });
      }
      danmakuInput.value = '';
    }

    if (danmakuAiToggle) {
      danmakuAiToggle.addEventListener('click', toggleManualAiReply);
    }
    if (danmakuToggleBtn) {
      danmakuToggleBtn.addEventListener('click', () => {
        setDanmakuVisibility(!danmakuVisible);
      });
    }
    if (danmakuSettingsBtn) {
      danmakuSettingsBtn.addEventListener('click', () => {
        toggleDanmakuSettingsPanel();
      });
    }
    if (danmakuAreaRange) {
      danmakuAreaRange.addEventListener('input', (e) => {
        const value = parseInt(e.target.value, 10);
        if ([1, 2, 3].includes(value)) {
          setDanmakuAreaMode(value);
        }
      });
    }
    document.addEventListener('click', (e) => {
      if (!danmakuSettingsPanel || !danmakuSettingsBtn) return;
      const target = e.target;
      if (danmakuSettingsPanel.contains(target) || danmakuSettingsBtn.contains(target)) return;
      toggleDanmakuSettingsPanel(false);
    });

    if (sendDanmakuBtn) sendDanmakuBtn.addEventListener('click', sendManualDanmaku);
    if (danmakuInput) {
      danmakuInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          sendManualDanmaku();
        }
      });
    }

    if (aiOrbButton) aiOrbButton.addEventListener('click', handleOrbClick);

    // ==========================================================
    // T-Cal 底部热度侧边栏逻辑 (Horizontal ThreadPulse)
    // ==========================================================

    const heatmapContent = document.getElementById('heatmap-content');
    const heatmapZoomInput = document.getElementById('heatmap-zoom');
    const heatmapZoomValue = document.getElementById('heatmap-zoom-value');
    const heatmapOverviewBtn = document.getElementById('heatmap-overview-btn');
    const HEATMAP_ZOOM_STEP = 1;
    const HEATMAP_ZOOM_MIN = 1;
    const HEATMAP_ZOOM_MAX = 100;
    const HEATMAP_OVERVIEW_THRESHOLD = 50;
    const HEATMAP_ZOOM_VERTICAL_THRESHOLD = 46;
    const HEATMAP_NODE_MAX_MODE_ZOOM = 26;
    let heatmapZoom = 20;
    let heatmapOverviewFit = false;
    let heatmapZoomAnchor = null;
    let heatmapZoomLocked = false;
    let heatmapPanActive = false;
    let heatmapPanStartX = 0;
    let heatmapPanStartScrollLeft = 0;
    let heatmapPanStartY = 0;
    let heatmapPanStartScrollTop = 0;
    let heatmapForceScrollToStart = false;
    let heatmapFirstOpenPending = true;
    const heatmapViewStates = new Map();
    let heatmapPendingRestore = null;
    let heatmapActiveVideoKey = activeVideoConfig
      ? (activeVideoConfig.id || activeVideoConfig.videoSrc || activeVideoConfig.danmakuSrc || '')
      : '';

    const heatmapPanel = document.getElementById('heatmap-panel');
    const heatmapHeader = heatmapPanel ? heatmapPanel.querySelector('.heatmap-header') : null;
    const HEATMAP_COLLAPSED_CLASS = 'is-collapsed';
    let heatmapRenderTimeout = null;
    const getHeatmapVideoKey = (config) => {
      if (!config) return '';
      return config.id || config.videoSrc || config.danmakuSrc || '';
    };
    const getHeatmapZoomStep = (value) => (value > 5 ? 10 : 1);

    const syncHeatmapZoomUI = () => {
      if (heatmapOverviewBtn) {
        const isOverviewMode = !!heatmapOverviewFit;
        heatmapOverviewBtn.classList.toggle('is-active', isOverviewMode);
        heatmapOverviewBtn.setAttribute('aria-pressed', isOverviewMode.toString());
      }
      if (heatmapContent) {
        heatmapContent.classList.toggle('is-overview', !!heatmapOverviewFit);
      }
      if (heatmapZoomInput && Number(heatmapZoomInput.value) !== heatmapZoom) {
        heatmapZoomInput.value = heatmapZoom.toString();
      }
      if (heatmapZoomValue) {
        heatmapZoomValue.textContent = `${heatmapZoom.toFixed(1)}x`;
      }
    };

    const saveHeatmapViewState = () => {
      if (!heatmapContent || !heatmapActiveVideoKey) return;
      if (!heatmapContent.querySelector('.heatmap-svg')) return;
      heatmapViewStates.set(heatmapActiveVideoKey, {
        zoom: heatmapZoom,
        locked: heatmapZoomLocked,
        overviewFit: heatmapOverviewFit,
        scrollLeft: heatmapContent.scrollLeft,
        scrollTop: heatmapContent.scrollTop,
      });
    };

    const applyHeatmapViewState = (state) => {
      if (!state) return false;
      heatmapZoom = state.zoom;
      heatmapZoomLocked = !!state.locked;
      heatmapOverviewFit = !!state.overviewFit || heatmapZoom <= HEATMAP_ZOOM_MIN;
      heatmapPendingRestore = {
        scrollLeft: state.scrollLeft || 0,
        scrollTop: state.scrollTop || 0,
      };
      syncHeatmapZoomUI();
      return true;
    };

    const enterHeatmapOverview = ({ forceScroll = false } = {}) => {
      updateHeatmapZoom(HEATMAP_ZOOM_MIN, { lock: true, overview: true });
      if (forceScroll) heatmapForceScrollToStart = true;
    };

    function updateHeatmapCollapsedHeight() {
      if (!heatmapPanel || !heatmapHeader) return;
      const headerHeight = heatmapHeader.getBoundingClientRect().height;
      if (headerHeight) {
        heatmapPanel.style.setProperty('--heatmap-collapsed-height', `${headerHeight + 2}px`);
      }
    }

    function setHeatmapCollapsed(collapsed) {
      if (!heatmapPanel) return;
      updateHeatmapCollapsedHeight();
      heatmapPanel.classList.toggle(HEATMAP_COLLAPSED_CLASS, collapsed);
      if (heatmapHeader) {
        heatmapHeader.setAttribute('aria-expanded', (!collapsed).toString());
      }
      if (collapsed) {
        saveHeatmapViewState();
      }
      if (!collapsed) {
        const savedState = heatmapActiveVideoKey
          ? heatmapViewStates.get(heatmapActiveVideoKey)
          : null;
        if (!applyHeatmapViewState(savedState)) {
          enterHeatmapOverview({ forceScroll: heatmapFirstOpenPending });
          heatmapFirstOpenPending = false;
        } else {
          heatmapFirstOpenPending = false;
        }
        scheduleHeatmapRender();
      }
    }

    function toggleHeatmapPanel() {
      if (!heatmapPanel) return;
      const nextCollapsed = !heatmapPanel.classList.contains(HEATMAP_COLLAPSED_CLASS);
      setHeatmapCollapsed(nextCollapsed);
    }

    function getHeatmapRenderHeight() {
      if (heatmapContent) {
        return heatmapContent.clientHeight;
      }
      return 0;
    }

    function scheduleHeatmapRender() {
      renderBottomHeatmap();
      if (!heatmapPanel) return;
      if (heatmapRenderTimeout) {
        clearTimeout(heatmapRenderTimeout);
        heatmapRenderTimeout = null;
      }
      const onTransitionEnd = (event) => {
        if (event.propertyName !== 'height') return;
        renderBottomHeatmap();
      };
      heatmapPanel.addEventListener('transitionend', onTransitionEnd, { once: true });
      heatmapRenderTimeout = setTimeout(() => {
        renderBottomHeatmap();
        heatmapRenderTimeout = null;
      }, 380);
    }

    /**
     * 渲染底部热度图：分离“人气”(背景)与“回复集”(线条)
     */
    function getReplyClusterType(item) {
      const clusterId = (item.replyClusterId || '').toLowerCase();
      if (clusterId.startsWith('emotion_')) return 'emotion';
      if (clusterId.startsWith('answer_')) return 'answer';

      const label = (item.replyClusterLabel || '').toLowerCase();
      if (label.includes('情感') || label.includes('emotion')) return 'emotion';
      if (label.includes('解答') || label.includes('answer')) return 'answer';
      return null;
    }
    function getHeatmapAxisStep(duration) {
      if (heatmapZoom > 35) return 1;
      if (heatmapZoom > 5) return 15;
      if (duration <= 60) return 5;
      if (duration <= 180) return 10;
      if (duration <= 600) return 30;
      if (duration <= 1800) return 60;
      if (duration <= 3600) return 120;
      return 300;
    }

    function updateHeatmapPlayhead(time = video?.currentTime || 0) {
      if (!heatmapContent) return;
      const svg = heatmapContent.querySelector('.heatmap-svg');
      if (!svg) return;
      const duration = parseFloat(svg.dataset.duration || '');
      const plotWidth = parseFloat(svg.dataset.plotWidth || '');
      const edgePadding = parseFloat(svg.dataset.edgePadding || '');
      const chartHeight = parseFloat(svg.dataset.chartHeight || '');
      if (!Number.isFinite(duration) || duration <= 0) return;
      if (!Number.isFinite(plotWidth) || !Number.isFinite(edgePadding) || !Number.isFinite(chartHeight)) return;
      const safeTime = Number.isFinite(time) ? time : 0;
      const clampedTime = Math.max(0, Math.min(duration, safeTime));
      const x = edgePadding + (clampedTime / duration) * plotWidth;
      const playhead = svg.querySelector('#heatmap-playhead-line');
      if (!playhead) return;
      playhead.setAttribute('transform', `translate(${x}, 0)`);
      playhead.setAttribute('y1', '0');
      playhead.setAttribute('y2', String(chartHeight));
    }

    let heatmapPlayheadRaf = null;
    function startHeatmapPlayheadLoop() {
      if (!video) return;
      if (heatmapPlayheadRaf) return;
      const tick = () => {
        updateHeatmapPlayhead(video.currentTime);
        heatmapPlayheadRaf = requestAnimationFrame(tick);
      };
      heatmapPlayheadRaf = requestAnimationFrame(tick);
    }

    function stopHeatmapPlayheadLoop() {
      if (!heatmapPlayheadRaf) return;
      cancelAnimationFrame(heatmapPlayheadRaf);
      heatmapPlayheadRaf = null;
    }

    function renderBottomHeatmap() {
      if (!dialogueGroups.length) return;
      if (!heatmapContent) return;
      if (heatmapPanel && heatmapPanel.classList.contains(HEATMAP_COLLAPSED_CLASS)) return;

      // 记住横向滚动位置（缩放时尽量保持中心不跳）
      const previousScrollWidth = heatmapContent.scrollWidth;
      const previousScrollLeft = heatmapContent.scrollLeft;
      const previousScrollHeight = heatmapContent.scrollHeight;
      const previousScrollTop = heatmapContent.scrollTop;
      const previousScrollRatio = previousScrollWidth
        ? (previousScrollLeft + heatmapContent.clientWidth / 2) / previousScrollWidth
        : 0;
      const anchorInfo = heatmapZoomAnchor;
      const anchorRect = anchorInfo ? heatmapContent.getBoundingClientRect() : null;
      const anchorLocalX = anchorInfo ? (anchorInfo.clientX - anchorRect.left) : 0;
      const anchorLocalY = anchorInfo ? (anchorInfo.clientY - anchorRect.top) : 0;
      const anchorRatioY = (anchorInfo && previousScrollHeight)
        ? (previousScrollTop + anchorLocalY) / previousScrollHeight
        : null;

      heatmapContent.innerHTML = '';

      const contentStyle = getComputedStyle(heatmapContent);
      const paddingX = (parseFloat(contentStyle.paddingLeft) || 0) + (parseFloat(contentStyle.paddingRight) || 0);
      const paddingY = (parseFloat(contentStyle.paddingTop) || 0) + (parseFloat(contentStyle.paddingBottom) || 0);
      const baseWidth = Math.max(0, heatmapContent.clientWidth - paddingX);
      const baseHeight = Math.max(0, getHeatmapRenderHeight() - paddingY);
      if (!baseWidth || !baseHeight) return;

      const totalDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 60;
      const duration = totalDuration;
      if (duration <= 0) return;

      const getZoomScale = (zoom) => (
        zoom > HEATMAP_ZOOM_VERTICAL_THRESHOLD
          ? zoom / HEATMAP_ZOOM_VERTICAL_THRESHOLD
          : 1
      );
      const zoomScale = getZoomScale(heatmapZoom);
      const forceMaxNodeMode = heatmapZoom > HEATMAP_NODE_MAX_MODE_ZOOM;
      const isOverviewMode = (heatmapOverviewFit || heatmapZoom < HEATMAP_OVERVIEW_THRESHOLD) && !forceMaxNodeMode;
      const overviewFitMode = !!heatmapOverviewFit;
      const compactMode = forceMaxNodeMode ? false : (!heatmapZoomLocked || isOverviewMode);

      const edgePadding = 14;
      const previousPlotWidth = previousScrollWidth > 0
        ? Math.max(1, previousScrollWidth - edgePadding * 2)
        : 0;
      const anchorTime = (anchorInfo && previousPlotWidth > 0)
        ? Math.min(
          duration,
          Math.max(0, ((previousScrollLeft + anchorLocalX - edgePadding) / previousPlotWidth) * duration)
        )
        : null;
      const axisHeight = 26 * zoomScale;
      let height = baseHeight * zoomScale;
      let chartHeight = height - axisHeight;
      if (chartHeight <= 0) return;

      // === 1) 挑选要展示的回复串 ===
      const threads = dialogueGroups
        .filter(g => !g.isNestedParent)               // 主串（可按你需求改）
        .sort((a, b) => a.startTime - b.startTime);  // 从早到晚

      if (!threads.length) return;

      const getNodeW = (text = "") => {
        const len = Math.max(1, text.trim().length);
        const minW = 10;
        const maxW = 64;
        const capped = Math.min(40, len); // 40字以上都当作最长
        return minW + (capped / 40) * (maxW - minW);
      };

      const getNodeLabel = (node) => {
        if (!node) return "";
        const text = (node.text || "").trim();
        if (text) return text;
        const label = (node.replyClusterLabel || "").trim();
        if (label) return label;
        if (Array.isArray(node.clusterMessages)) {
          const fallback = node.clusterMessages.find(item => item && item.text);
          if (fallback && fallback.text) return fallback.text;
        }
        return "";
      };

      const getNodeTitle = (node) => {
        const label = getNodeLabel(node);
        if (label) return `[${formatTime(node.time)}] ${label}`;
        return `[${formatTime(node.time)}]`;
      };

      const getThreadNodes = (group) => {
        const timeline = group.timeline || [];
        const hasClusterNodes = timeline.some(item => item && item.isClusterNode);
        if (!hasClusterNodes) {
          const nodes = (group.messages || []).filter(item => item && Number.isFinite(item.time));
          return nodes;
        }
        const nodes = [];
        const seen = new Set();
        const addNode = (item) => {
          if (!item || !Number.isFinite(item.time)) return;
          const key = item.id ? `id_${item.id}` : `t_${item.time}_${item.text || ''}`;
          if (seen.has(key)) return;
          seen.add(key);
          nodes.push(item);
        };
        timeline.forEach(item => {
          addNode(item);
          if (item && item.isClusterNode && Array.isArray(item.clusterMessages)) {
            item.clusterMessages.forEach(addNode);
          }
        });
        return nodes;
      };

      const DOT_BASE = 3;
      const MIN_GAP_BASE = isOverviewMode ? 1 : (compactMode ? 4 : 6);
      const ROW_SPAN_GAP_BASE = isOverviewMode ? 2 : (compactMode ? 6 : 8);
      const MIN_ROW_H_BASE = isOverviewMode ? 8 : (compactMode ? 10 : 22);
      const MAX_ROW_H_BASE = isOverviewMode ? 20 : (compactMode ? 28 : 40);
      const ROW_GAP_BASE = compactMode ? 2 : 6;
      const NODE_CIRCLE_BASE = compactMode ? 10 : 14;
      const NODE_CAPSULE_H_BASE = compactMode ? 8 : 12;
      const ARROW_CLEARANCE_BASE = compactMode ? 2 : 4;
      const RAIL_CLEARANCE_BASE = compactMode ? 1 : 2;

      const threadNodes = threads
        .map(group => ({ group, nodes: getThreadNodes(group) }))
        .filter(entry => entry.nodes.length > 0);

      if (!threadNodes.length) return;

      const getNeededRowsForScale = (scale) => {
        const fullWidth = baseWidth * heatmapZoom;
        const plotWidth = Math.max(1, fullWidth - edgePadding * 2);
        const timeToX = (t) => edgePadding + (t / duration) * plotWidth;
        const rowSlots = [];
        const scaledMinGap = MIN_GAP_BASE * scale;
        const scaledRowSpanGap = ROW_SPAN_GAP_BASE * scale;

        threadNodes.forEach(({ group, nodes }) => {
          if (!nodes.length) return;
          const orderedNodes = nodes.slice().sort((a, b) => a.time - b.time);
          const rootId = group.parentId || group.rootParentId || null;
          const replyTargetIds = new Set();
          orderedNodes.forEach((node) => {
            if (node && node.replyTo) replyTargetIds.add(node.replyTo);
          });
          const anchorNode = orderedNodes[0];
          const anchorId = anchorNode ? anchorNode.id : null;
          const anchorTime = anchorNode && Number.isFinite(anchorNode.time)
            ? anchorNode.time
            : group.startTime;
          let lastX = null;
          let lastHalfW = 0;
          let minX = Infinity;
          let maxX = -Infinity;

          orderedNodes.forEach((node) => {
            if (!node.id) return;
            const hasReplies = Array.isArray(node.replies) && node.replies.length > 0;
            const isRoot = !!node.isParent || (!!rootId && node.id === rootId);
            const isMidNode = (hasReplies || replyTargetIds.has(node.id)) && !isRoot;
            const isCircleNode = isMidNode || isRoot;
            const baseW = overviewFitMode
              ? DOT_BASE
              : (isOverviewMode ? 8 : (isCircleNode ? NODE_CIRCLE_BASE : getNodeW(node.text || "")));
            const nodeW = Math.max(1, baseW * scale);
            const halfW = nodeW / 2;

            const isAnchor = node.id === anchorId;
            let x = isAnchor ? timeToX(anchorTime) : timeToX(node.time);
            if (!isAnchor && lastX !== null) {
              const minAllowedX = lastX + lastHalfW + halfW + scaledMinGap;
              if (x < minAllowedX) x = minAllowedX;
            }
            if (!isAnchor) {
              x = Math.max(edgePadding + halfW, Math.min(edgePadding + plotWidth - halfW, x));
            }
            lastX = x;
            lastHalfW = halfW;
            minX = Math.min(minX, x - halfW);
            maxX = Math.max(maxX, x + halfW);
          });

          if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return;

          let rowIdx = -1;
          for (let i = 0; i < rowSlots.length; i += 1) {
            if (minX >= rowSlots[i].endX + scaledRowSpanGap) {
              rowIdx = i;
              break;
            }
          }
          if (rowIdx === -1) {
            rowSlots.push({ endX: maxX });
          } else {
            rowSlots[rowIdx].endX = Math.max(rowSlots[rowIdx].endX, maxX);
          }
        });

        return rowSlots.length;
      };

      let layoutScale = zoomScale;
      if (overviewFitMode) {
        // 全览模式：压缩节点尺寸，让所有回复串尽量在一屏内
        let fitNeededRows = getNeededRowsForScale(layoutScale);
        if (fitNeededRows > 0) {
          const fitNodeBase = isOverviewMode ? 8 : NODE_CIRCLE_BASE;
          for (let i = 0; i < 2; i += 1) {
            const rawRowH = chartHeight / Math.max(1, fitNeededRows);
            const fitScale = Math.min(1, Math.max(0.2, rawRowH / (fitNodeBase * zoomScale)));
            const nextScale = zoomScale * fitScale;
            const nextNeededRows = getNeededRowsForScale(nextScale);
            layoutScale = nextScale;
            if (nextNeededRows === fitNeededRows) break;
            fitNeededRows = nextNeededRows;
          }
        }
      }

      const minGap = MIN_GAP_BASE * layoutScale;
      const rowSpanGap = ROW_SPAN_GAP_BASE * layoutScale;
      const minRowH = MIN_ROW_H_BASE * layoutScale;
      const maxRowH = MAX_ROW_H_BASE * layoutScale;
      const rowGap = (overviewFitMode ? 0 : ROW_GAP_BASE) * layoutScale;

      // 横向缩放（复用你原来的 zoom）
      const fullWidth = baseWidth * heatmapZoom;
      const plotWidth = Math.max(1, fullWidth - edgePadding * 2);
      const svgWidth = plotWidth + edgePadding * 2;

      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.classList.add("heatmap-svg");
      svg.setAttribute("viewBox", `0 0 ${svgWidth} ${height}`);
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("width", svgWidth);
      svg.setAttribute("height", String(height));
      svg.dataset.duration = String(duration);
      svg.dataset.plotWidth = String(plotWidth);
      svg.dataset.edgePadding = String(edgePadding);
      svg.dataset.chartHeight = String(chartHeight);

      // === defs：箭头 marker + 斜杠填充 pattern ===
      const defs = document.createElementNS(svgNS, "defs");

      if (!overviewFitMode) {
        // arrow marker
        const arrowSize = 4 * layoutScale;
        const arrowHalf = arrowSize / 2;
        const marker = document.createElementNS(svgNS, "marker");
        marker.setAttribute("id", "threadriver-arrow");
        marker.setAttribute("markerWidth", String(arrowSize));
        marker.setAttribute("markerHeight", String(arrowSize));
        marker.setAttribute("refX", String(arrowSize));
        marker.setAttribute("refY", String(arrowHalf));
        marker.setAttribute("orient", "auto");
        const arrowPath = document.createElementNS(svgNS, "path");
        arrowPath.setAttribute("d", `M0,0 L${arrowSize},${arrowHalf} L0,${arrowSize} Z`);
        arrowPath.setAttribute("class", "threadriver-arrowhead");
        marker.appendChild(arrowPath);
        defs.appendChild(marker);
      }

      // hatch pattern (斜杠阴影)
      const pattern = document.createElementNS(svgNS, "pattern");
      pattern.setAttribute("id", "threadriver-hatch");
      pattern.setAttribute("patternUnits", "userSpaceOnUse");
      pattern.setAttribute("width", "8");
      pattern.setAttribute("height", "8");
      const hatchLine = document.createElementNS(svgNS, "path");
      hatchLine.setAttribute("d", "M0,8 L8,0");
      hatchLine.setAttribute("class", "threadriver-hatch-line");
      pattern.appendChild(hatchLine);
      defs.appendChild(pattern);

      svg.appendChild(defs);

      const railLayer = document.createElementNS(svgNS, "g");
      railLayer.setAttribute("class", "threadriver-rails");
      svg.appendChild(railLayer);

      const linkLayer = document.createElementNS(svgNS, "g");
      linkLayer.setAttribute("class", "threadriver-links");
      svg.appendChild(linkLayer);

      const nodeLayer = document.createElementNS(svgNS, "g");
      nodeLayer.setAttribute("class", "threadriver-nodes");
      svg.appendChild(nodeLayer);

      const playheadLayer = document.createElementNS(svgNS, "g");
      playheadLayer.setAttribute("class", "heatmap-playhead-layer");
      const playheadLine = document.createElementNS(svgNS, "line");
      playheadLine.setAttribute("id", "heatmap-playhead-line");
      playheadLine.setAttribute("class", "heatmap-playhead");
      playheadLine.setAttribute("x1", "0");
      playheadLine.setAttribute("x2", "0");
      playheadLine.setAttribute("y1", "0");
      playheadLine.setAttribute("y2", String(chartHeight));
      playheadLayer.appendChild(playheadLine);
      svg.appendChild(playheadLayer);

      // === 工具：time  x ===
      const timeToX = (t) => edgePadding + (t / duration) * plotWidth;

      // === 2) 行分配：不重叠时优先塞回上方行 ===
      const layouts = [];
      const rowSlots = [];

      threadNodes.forEach(({ group, nodes }) => {
        if (!nodes.length) return;

        const orderedNodes = nodes.slice().sort((a, b) => a.time - b.time);
        const rootId = group.parentId || group.rootParentId || null;
        const replyTargetIds = new Set();
        orderedNodes.forEach((node) => {
          if (node && node.replyTo) replyTargetIds.add(node.replyTo);
        });
        const anchorNode = orderedNodes[0];
        const anchorId = anchorNode ? anchorNode.id : null;
        const anchorTime = anchorNode && Number.isFinite(anchorNode.time)
          ? anchorNode.time
          : group.startTime;

        const coord = new Map();
        let lastX = null;
        let lastHalfW = 0;
        let minX = Infinity;
        let maxX = -Infinity;

        orderedNodes.forEach((node) => {
          if (!node.id) return;

          const hasReplies = Array.isArray(node.replies) && node.replies.length > 0;
          const isRoot = !!node.isParent || (!!rootId && node.id === rootId);
          const isMidNode = (hasReplies || replyTargetIds.has(node.id)) && !isRoot;
          const isCluster = !!node.isClusterNode;
          const isCircleNode = isMidNode || isRoot;
          const baseW = overviewFitMode
            ? DOT_BASE
            : (isOverviewMode ? 8 : (isCircleNode ? NODE_CIRCLE_BASE : getNodeW(node.text || "")));
          const nodeW = Math.max(1, baseW * layoutScale);
          const nodeH = overviewFitMode
            ? nodeW
            : (isOverviewMode
              ? (isCircleNode ? nodeW : 6 * layoutScale)
              : (isCircleNode ? nodeW : NODE_CAPSULE_H_BASE * layoutScale));
          const halfW = nodeW / 2;

          const isAnchor = node.id === anchorId;
          let x = isAnchor ? timeToX(anchorTime) : timeToX(node.time);
          if (!isAnchor && lastX !== null) {
            const minAllowedX = lastX + lastHalfW + halfW + minGap;
            if (x < minAllowedX) x = minAllowedX;
          }
          if (!isAnchor) {
            x = Math.max(edgePadding + halfW, Math.min(edgePadding + plotWidth - halfW, x));
          }

          coord.set(node.id, { x, node, isRoot, isMidNode, isCluster, nodeW, nodeH });
          lastX = x;
          lastHalfW = halfW;
          minX = Math.min(minX, x - halfW);
          maxX = Math.max(maxX, x + halfW);
        });

        if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return;

        let rowIdx = -1;
        for (let i = 0; i < rowSlots.length; i += 1) {
          if (minX >= rowSlots[i].endX + rowSpanGap) {
            rowIdx = i;
            break;
          }
        }
        if (rowIdx === -1) {
          rowIdx = rowSlots.length;
          rowSlots.push({ endX: maxX });
        } else {
          rowSlots[rowIdx].endX = Math.max(rowSlots[rowIdx].endX, maxX);
        }

        layouts.push({ group, nodes: orderedNodes, coord, rowIdx });
      });

      if (!layouts.length) return;

      // === 3) 计算行高（让它能自适应显示尽可能多） ===
      const neededRows = rowSlots.length;
      if (neededRows <= 0) return;
      let rowH;
      if (overviewFitMode) {
        const rawRowH = (chartHeight - rowGap * (neededRows - 1)) / neededRows;
        rowH = Math.max(0.5, rawRowH);
      } else {
        const rawRowH = Math.floor((chartHeight - rowGap * (neededRows - 1)) / neededRows);
        rowH = compactMode
          ? Math.max(1, Math.min(maxRowH, rawRowH))
          : Math.max(minRowH, Math.min(maxRowH, rawRowH));
      }
      const rowStep = rowH + rowGap;
      let rowCount = overviewFitMode
        ? neededRows
        : Math.min(neededRows, Math.floor((chartHeight + rowGap) / rowStep));
      if (rowCount <= 0) return;

      if (!overviewFitMode) {
        rowCount = neededRows;
        const neededChartHeight = rowStep * neededRows;
        if (neededChartHeight > chartHeight) {
          chartHeight = neededChartHeight;
          height = chartHeight + axisHeight;
          svg.setAttribute("viewBox", `0 0 ${svgWidth} ${height}`);
          svg.setAttribute("height", String(height));
          svg.dataset.chartHeight = String(chartHeight);
          playheadLine.setAttribute("y2", String(chartHeight));
        }
      }

      const visibleLayouts = overviewFitMode
        ? layouts
        : layouts.filter(layout => layout.rowIdx < rowCount);

      // === 4) 绘制每一行 thread ===
      visibleLayouts.forEach((layout) => {
        const { group, nodes: orderedNodes, coord, rowIdx } = layout;
        const rowTop = rowIdx * rowStep;
        const cy = rowTop + rowH * 0.55; // 让节点偏居中一点
        const baselineY = cy;

        // 4.1 先画节点（根节点也画，但播放键单独画）
        orderedNodes.forEach((node) => {
          if (!node.id) return;
          const nodeLayout = coord.get(node.id);
          if (!nodeLayout) return;
          const { x, isRoot, isMidNode, isCluster, nodeW, nodeH } = nodeLayout;
          const replyType = getReplyClusterType(node);
          const typeClass = replyType === 'emotion'
            ? 'threadriver-node-emotion'
            : replyType === 'answer'
              ? 'threadriver-node-answer'
              : '';

          // 播放键：只画一次（thread 起点）
          // 你说串开头是播放键：对齐 group.startTime
          if (isRoot && !overviewFitMode) {
            const playScale = layoutScale;
            const playX = timeToX(group.startTime) - 6 * playScale;
            const play = document.createElementNS(svgNS, "path");
            play.setAttribute(
              "d",
              `M ${playX - 10 * playScale} ${baselineY - 6 * playScale} ` +
              `L ${playX - 10 * playScale} ${baselineY + 6 * playScale} ` +
              `L ${playX - 1 * playScale} ${baselineY} Z`
            );
            play.setAttribute("class", "threadriver-play");
            const title = document.createElementNS(svgNS, "title");
            title.textContent = ` 跳转到 ${formatTime(group.startTime)}\n${group.title || ""}`;
            play.appendChild(title);

            play.addEventListener("click", (e) => {
              e.stopPropagation();
              video.currentTime = group.startTime;
              video.play();
            });
            nodeLayer.appendChild(play);
          } else if (isRoot && overviewFitMode) {
            const miniScale = Math.max(0.6, 0.6 * layoutScale);
            const miniSize = Math.max(2, 3.2 * miniScale);
            const playX = timeToX(group.startTime) - 3.5 * miniSize;
            const play = document.createElementNS(svgNS, "path");
            play.setAttribute(
              "d",
              `M ${playX - miniSize} ${baselineY - miniSize * 0.8} ` +
              `L ${playX - miniSize} ${baselineY + miniSize * 0.8} ` +
              `L ${playX + miniSize * 0.6} ${baselineY} Z`
            );
            play.setAttribute("class", "threadriver-play-mini");
            nodeLayer.appendChild(play);
          }

          // 节点形状：
          // - 中间节点：阴影圆（斜杠填充）
          // - 普通节点：空心胶囊（宽度映射 text 长度）
          // - cluster 节点：浅色胶囊（也按长度）
          if (overviewFitMode) {
            const dot = document.createElementNS(svgNS, "circle");
            const dotClass = isRoot
              ? `threadriver-node threadriver-node-dot threadriver-node-root${typeClass ? ` ${typeClass}` : ''}`
              : (isMidNode
                ? 'threadriver-node threadriver-node-dot threadriver-node-dot-mid'
                : 'threadriver-node threadriver-node-dot threadriver-node-dot-leaf');
            dot.setAttribute("cx", x);
            dot.setAttribute("cy", baselineY);
            dot.setAttribute("r", Math.max(1, nodeH / 2));
            dot.setAttribute("class", dotClass);
            const title = document.createElementNS(svgNS, "title");
            title.textContent = getNodeTitle(node);
            dot.appendChild(title);

            dot.addEventListener("click", (e) => {
              e.stopPropagation();
              if (group.id) showSidebarAndHighlight(group.id);
            });

            nodeLayer.appendChild(dot);
          } else if (isMidNode || isRoot) {
            // 阴影圆
            const r = nodeH / 2;
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", baselineY);
            circle.setAttribute("r", r);
            const rootClass = isRoot ? 'threadriver-node-root' : 'threadriver-node-mid';
            circle.setAttribute(
              "class",
              `threadriver-node ${rootClass}${typeClass ? ` ${typeClass}` : ''}`
            );
            const title = document.createElementNS(svgNS, "title");
            title.textContent = getNodeTitle(node);
            circle.appendChild(title);

            circle.addEventListener("click", (e) => {
              e.stopPropagation();
              if (group.id) showSidebarAndHighlight(group.id);
            });

            nodeLayer.appendChild(circle);
          } else {
            // 空心胶囊 / cluster 胶囊
            const h = nodeH;
            const w = nodeW;
            const rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", x - w / 2);
            rect.setAttribute("y", baselineY - h / 2);
            rect.setAttribute("width", w);
            rect.setAttribute("height", h);
            rect.setAttribute("rx", h / 2);
            rect.setAttribute("ry", h / 2);
            rect.setAttribute("class", isCluster
              ? "threadriver-node threadriver-node-cluster"
              : "threadriver-node threadriver-node-leaf"
            );

            const title = document.createElementNS(svgNS, "title");
            title.textContent = getNodeTitle(node);
            rect.appendChild(title);

            rect.addEventListener("click", (e) => {
              e.stopPropagation();
              if (group.id) showSidebarAndHighlight(group.id);
            });

            nodeLayer.appendChild(rect);
          }
        });

        // 4.1.1 同一回复串的时间连线（不带箭头）
        for (let i = 0; i < orderedNodes.length - 1; i += 1) {
          const curr = orderedNodes[i];
          const next = orderedNodes[i + 1];
          if (!curr || !next || !curr.id || !next.id) continue;
          const currLayout = coord.get(curr.id);
          const nextLayout = coord.get(next.id);
          if (!currLayout || !nextLayout) continue;
        const railClearance = RAIL_CLEARANCE_BASE * layoutScale;
          const startX = currLayout.x + currLayout.nodeW / 2 + railClearance;
          const endX = nextLayout.x - nextLayout.nodeW / 2 - railClearance;
          if (endX <= startX) continue;

          const rail = document.createElementNS(svgNS, "line");
          rail.setAttribute("x1", String(startX));
          rail.setAttribute("y1", String(baselineY));
          rail.setAttribute("x2", String(endX));
          rail.setAttribute("y2", String(baselineY));
          rail.setAttribute("class", "threadriver-rail");
          railLayer.appendChild(rail);
        }

        // 4.2 再画回复关系（带箭头曲线）
        if (!overviewFitMode) {
          orderedNodes.forEach((node) => {
            if (!node.id || !node.replyTo) return;
            const from = coord.get(node.replyTo);
            const to = coord.get(node.id);
            if (!from || !to) return;

            const x1 = from.x;
            const x2 = to.x;
            if (x2 <= x1) return;

            const arrowClearance = ARROW_CLEARANCE_BASE * layoutScale;
            const startOffset = (from.nodeW ? from.nodeW / 2 : 6) + arrowClearance;
            const endYOffset = (to.nodeH ? to.nodeH / 2 : 6) + arrowClearance;
            const startX = x1 + startOffset;
            const endX = x2;
            const replyToIsRoot = !!from.isRoot || !!(from.node && from.node.isParent);
            const arrowDirection = replyToIsRoot ? -1 : 1;
            const endY = baselineY + arrowDirection * endYOffset;
            if (endX <= startX) return;

            const dx = endX - startX;
            const arcH = Math.min(rowH * 0.7, Math.max(8, dx * 0.12)); // 距离越远弧度越高
            const arcOffset = arcH * arrowDirection;

            const path = document.createElementNS(svgNS, "path");
            path.setAttribute(
              "d",
              `M ${startX} ${baselineY} C ${startX + dx * 0.25} ${baselineY + arcOffset}, ${startX + dx * 0.75} ${endY + arcOffset}, ${endX} ${endY}`
            );
            path.setAttribute("class", "threadriver-link");
            path.setAttribute("marker-end", "url(#threadriver-arrow)");
            linkLayer.appendChild(path);
          });
        }
      });

      // === 5) 时间轴（底部） ===
      const axisGroup = document.createElementNS(svgNS, "g");
      axisGroup.classList.add("heatmap-axis");

      const axisLine = document.createElementNS(svgNS, "line");
      axisLine.classList.add("heatmap-axis-line");
      axisLine.setAttribute("x1", String(edgePadding));
      axisLine.setAttribute("x2", String(edgePadding + plotWidth));
      axisLine.setAttribute("y1", String(chartHeight + 0.5));
      axisLine.setAttribute("y2", String(chartHeight + 0.5));
      axisGroup.appendChild(axisLine);

      const tickStep = getHeatmapAxisStep(duration);
      const tickTimes = [];
      for (let t = 0; t <= duration; t += tickStep) tickTimes.push(t);
      if (tickTimes[tickTimes.length - 1] < duration) tickTimes.push(duration);

      tickTimes.forEach((time) => {
        const tickX = edgePadding + (time / duration) * plotWidth;

        const tick = document.createElementNS(svgNS, "line");
        tick.classList.add("heatmap-axis-tick");
        tick.setAttribute("x1", String(tickX));
        tick.setAttribute("x2", String(tickX));
        tick.setAttribute("y1", String(chartHeight + 0.5));
        tick.setAttribute("y2", String(chartHeight + 6));
        axisGroup.appendChild(tick);

        const label = document.createElementNS(svgNS, "text");
        label.classList.add("heatmap-axis-text");
        label.setAttribute("x", String(tickX));
        label.setAttribute("y", String(chartHeight + axisHeight - 6));
        label.setAttribute("text-anchor", time <= 0 ? "start" : time >= duration ? "end" : "middle");
        label.textContent = formatTime(time);
        axisGroup.appendChild(label);
      });

      svg.appendChild(axisGroup);

      // === 6) 空白点击：跳转视频时间 ===
      svg.addEventListener('click', (e) => {
        const rect = heatmapContent.getBoundingClientRect();
        const clickX = e.clientX - rect.left + heatmapContent.scrollLeft;
        const normalizedX = Math.max(0, Math.min(plotWidth, clickX - edgePadding));
        const percent = plotWidth > 0 ? normalizedX / plotWidth : 0;
        video.currentTime = percent * duration;
        video.play();
      });

      heatmapContent.appendChild(svg);
      updateHeatmapPlayhead(video.currentTime);

      const pendingRestore = heatmapPendingRestore;
      heatmapPendingRestore = null;
      const shouldForceScrollToStart = heatmapForceScrollToStart;
      heatmapForceScrollToStart = false;

      // 恢复横向滚动中心/指向点
      if (pendingRestore) {
        const maxScrollX = Math.max(0, heatmapContent.scrollWidth - heatmapContent.clientWidth);
        const maxScrollY = Math.max(0, heatmapContent.scrollHeight - heatmapContent.clientHeight);
        heatmapContent.scrollLeft = Math.max(0, Math.min(maxScrollX, pendingRestore.scrollLeft || 0));
        heatmapContent.scrollTop = Math.max(0, Math.min(maxScrollY, pendingRestore.scrollTop || 0));
        heatmapZoomAnchor = null;
      } else if (shouldForceScrollToStart) {
        heatmapContent.scrollLeft = 0;
        heatmapContent.scrollTop = 0;
        heatmapZoomAnchor = null;
      } else if (anchorTime !== null || anchorRatioY !== null) {
        if (anchorTime !== null) {
          const targetX = edgePadding + (anchorTime / duration) * plotWidth;
          const maxScroll = Math.max(0, heatmapContent.scrollWidth - heatmapContent.clientWidth);
          heatmapContent.scrollLeft = Math.max(0, Math.min(maxScroll, targetX - anchorLocalX));
        }
        if (anchorRatioY !== null) {
          const targetY = anchorRatioY * heatmapContent.scrollHeight - anchorLocalY;
          const maxScrollY = Math.max(0, heatmapContent.scrollHeight - heatmapContent.clientHeight);
          heatmapContent.scrollTop = Math.max(0, Math.min(maxScrollY, targetY));
        }
        heatmapZoomAnchor = null;
      } else if (heatmapZoom > 1 && heatmapContent.scrollWidth > heatmapContent.clientWidth) {
        if (!heatmapZoomLocked && previousScrollLeft <= 1) {
          heatmapContent.scrollLeft = 0;
          heatmapContent.scrollTop = 0;
        } else {
          const nextScrollCenter = heatmapContent.scrollWidth * previousScrollRatio;
          heatmapContent.scrollLeft = Math.max(0, nextScrollCenter - heatmapContent.clientWidth / 2);
        }
      } else {
        heatmapContent.scrollLeft = 0;
        heatmapContent.scrollTop = 0;
      }
    }

    function handleHeatmapResize() {
      updateHeatmapCollapsedHeight();
      renderBottomHeatmap();
    }

    // 监听窗口大小变化和视频加载，重绘热度图
    if (heatmapHeader) {
      heatmapHeader.setAttribute('role', 'button');
      heatmapHeader.setAttribute('tabindex', '0');
      heatmapHeader.addEventListener('click', toggleHeatmapPanel);
      heatmapHeader.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleHeatmapPanel();
        }
      });
    }

    if (heatmapPanel) {
      setHeatmapCollapsed(heatmapPanel.classList.contains(HEATMAP_COLLAPSED_CLASS));
    }

    if (heatmapContent) {
      window.addEventListener('resize', handleHeatmapResize);
      video.addEventListener('loadedmetadata', handleHeatmapResize);
      heatmapContent.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
      heatmapContent.addEventListener('mousedown', (e) => {
        if (e.button !== 2) return;
        e.preventDefault();
        heatmapPanActive = true;
        heatmapPanStartX = e.clientX;
        heatmapPanStartScrollLeft = heatmapContent.scrollLeft;
        heatmapPanStartY = e.clientY;
        heatmapPanStartScrollTop = heatmapContent.scrollTop;
        heatmapContent.classList.add('heatmap-panning');
      });
      window.addEventListener('mousemove', (e) => {
        if (!heatmapPanActive) return;
        const dx = e.clientX - heatmapPanStartX;
        const dy = e.clientY - heatmapPanStartY;
        heatmapContent.scrollLeft = heatmapPanStartScrollLeft - dx;
        heatmapContent.scrollTop = heatmapPanStartScrollTop - dy;
      });
      window.addEventListener('mouseup', () => {
        if (!heatmapPanActive) return;
        heatmapPanActive = false;
        heatmapContent.classList.remove('heatmap-panning');
      });
      heatmapContent.addEventListener('wheel', (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        heatmapZoomAnchor = { clientX: e.clientX, clientY: e.clientY };
        const baseStep = getHeatmapZoomStep(heatmapZoom);
        const step = e.deltaY > 0 ? -baseStep : baseStep;
        updateHeatmapZoom(heatmapZoom + step, { lock: true, overview: false });
      }, { passive: false });
      // 初始化时尝试渲染一次
      setTimeout(handleHeatmapResize, 1000);
    }

    function updateHeatmapZoom(value, { lock = null, overview = false } = {}) {
      const nextZoom = Number(value);
      if (Number.isFinite(nextZoom)) {
        const snapped = Math.round(nextZoom / HEATMAP_ZOOM_STEP) * HEATMAP_ZOOM_STEP;
        heatmapZoom = Math.min(HEATMAP_ZOOM_MAX, Math.max(HEATMAP_ZOOM_MIN, snapped));
      } else {
        heatmapZoom = HEATMAP_ZOOM_MIN;
      }
      if (lock === true) heatmapZoomLocked = true;
      if (lock === false) heatmapZoomLocked = false;
      if (overview === true || heatmapZoom <= HEATMAP_ZOOM_MIN) {
        heatmapOverviewFit = true;
      } else if (overview === false) {
        heatmapOverviewFit = false;
      }
      syncHeatmapZoomUI();
      renderBottomHeatmap();
    }

    if (heatmapZoomInput) {
      heatmapZoomInput.addEventListener('input', (e) => {
        updateHeatmapZoom(e.target.value, { lock: true, overview: false });
      });
      updateHeatmapZoom(heatmapZoomInput.value);
    }

    if (heatmapOverviewBtn) {
      heatmapOverviewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        enterHeatmapOverview({ forceScroll: true });
      });
      heatmapOverviewBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          e.preventDefault();
          enterHeatmapOverview({ forceScroll: true });
        }
      });
    }

    setDanmakuVisibility(danmakuVisible);
    initializePlayer();
