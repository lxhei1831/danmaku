// ===== 全局状态 =====
    const SILICONFLOW_API_KEY = "sk-csblnlipczusnmuoocqrrqdbbuskicjtxteonucqidqxxahv"; // <--- 在这里替换成您自己的 SiliconFlow API 密钥
    const SILICONFLOW_API_URL = "https://api.siliconflow.cn/v1/chat/completions";
    const MULTIMODAL_API_URL = "https://api.siliconflow.cn/v1/chat/completions";
    const MULTIMODAL_MODEL = "Qwen/Qwen3-VL-32B-Instruct";
    const MAX_SUBTITLE_SNIPPET_CHARS = 20000;
    const CAPTION_FILE_PATH = "./assets/data/caption.srt";
    const AUTO_SEND_AI_ON_RIGHT_CLICK = true; // 右键弹幕后是否直接自动提问
    const AI_QUESTION_TEMPLATE = "请围绕这条弹幕进行分析并给出回复建议：{text}"; // 自定义提问模板，保留 {text} 作为弹幕占位符
    const AI_GROUP_QUESTION_TEMPLATE = "请结合以下整组对话弹幕，给出总结和回复建议：{text}";
    const AI_RESPONSE_MAX_TOKENS = 150; // 短回复时限制回答长度
    const AI_RESPONSE_GUIDELINE = "请用不超过60字的中文简短回答，避免长段落。"; 
    const AI_RESPONSE_GUIDELINE_LONG = "请详细回答，必要时可以展开论述，无需长度限制。"; 
    const AI_SIDEBAR_DEFAULT_HINT = "输入弹幕问题，AI 已预先读取视频上下文。";

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
    function syncLayoutHeight() {
      const playerHeight = mainContent.clientHeight;
      if (playerHeight > 0) {
        [dialogueSidebar, aiSidebar].forEach(panel => {
          if (panel) panel.style.height = `${playerHeight}px`;
        });
      }
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

    async function preloadSubtitleFile() {
      try {
        const response = await fetch(CAPTION_FILE_PATH);
        if (!response.ok) throw new Error(`字幕文件请求失败: ${response.status}`);
        const text = await response.text();
        subtitleFileText = text;
        subtitleFileBlob = new Blob([text], { type: 'text/plain' });
        subtitleFileName = CAPTION_FILE_PATH.split('/').pop() || 'caption.srt';
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
        const response = await fetch(url);
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
          const colorHex = '#' + parseInt(params[3], 10).toString(16).padStart(6, '0');
          const replyClusterId = d.getAttribute('reply_cluster');
          const replyClusterLabel = d.getAttribute('reply_cluster_label');
          const replyClusterOrderRaw = d.getAttribute('reply_cluster_order');
          const replyClusterOrder = replyClusterOrderRaw !== null ? parseInt(replyClusterOrderRaw, 10) : NaN;

          const danmakuObj = {
            id,
            replyTo,
            text,
            time,
            color: colorHex,
            replies: [],
            replyClusterId: replyClusterId || null,
            replyClusterLabel: replyClusterLabel || null,
            replyClusterOrder: Number.isFinite(replyClusterOrder) ? replyClusterOrder : null,
          };
          parsedData.push(danmakuObj);
          if (id) tempMap.set(id, danmakuObj);
        });

        parsedData.sort((a, b) => a.time - b.time);

        parsedData.forEach(d => {
          if (d.replyTo && tempMap.has(d.replyTo)) {
            const parent = tempMap.get(d.replyTo);
            parent.replies.push(d);
            if (parent.id) parentDanmakuIds.add(parent.id);
          }
        });

        parentDanmakuIds.forEach(parentId => {
          const parent = tempMap.get(parentId);
          if (!parent) return;
          const repliesSorted = [...parent.replies].sort((a, b) => a.time - b.time);
          const allMessages = [parent, ...repliesSorted].sort((a, b) => a.time - b.time);
          const structure = buildDialogueStructure(parent, repliesSorted);
          dialogueGroups.push({
            id: `group_${parent.id}`,
            parentId: parent.id,
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
        alert("弹幕文件加载失败，请确保 'replay_2.xml' 文件存在。");
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

      const collectDescendants = (root) => {
        const collected = [];
        const queue = [...(root.replies || [])];
        while (queue.length) {
          const node = queue.shift();
          collected.push(node);
          if (node.replies && node.replies.length) queue.push(...node.replies);
        }
        collected.sort((a, b) => a.time - b.time);
        return collected;
      };

      directReplies.forEach(reply => {
        const descendants = collectDescendants(reply);
        const entry = { ...reply };
        entry.replyClusterLabel = entry.replyClusterLabel || entry.text;
        if (descendants.length > 0) {
          entry.isClusterNode = true;
          entry.clusterMessages = descendants;
          entry.clusterSize = descendants.length;
          entry.remainingCount = descendants.length;
          clusters.push({
            id: `cluster_${parent.id || 'root'}_${reply.id || reply.time}`,
            label: entry.replyClusterLabel,
            count: descendants.length,
            time: reply.time,
            messages: descendants,
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
      constructor(screenElement, totalTracks, dialogueTracksCount) {
        this.screen = screenElement;
        this.numTotalTracks = totalTracks;
        this.numDialogueTracks = dialogueTracksCount;
        this.trackTimestamps = new Array(totalTracks).fill(0);
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
          const normalTracks = this.numTotalTracks - this.numDialogueTracks;
          const usableNormalTracks = Math.max(1, Math.ceil(normalTracks / 2));
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
    async function initializePlayer() {
      danmakuData = await loadAndProcessDanmaku('./assets/data/replay_2.xml');
      danmakuManager = new DanmakuManager(danmakuScreen, NUM_TOTAL_TRACKS, NUM_DIALOGUE_TRACKS);
      await preloadSubtitleFile();

      dialogueTracks = Array.from({ length: NUM_DIALOGUE_TRACKS }, () => ({ reservedForGroupId: null, releaseAt: 0 }));

      video.addEventListener('loadedmetadata', syncLayoutHeight, { once: true });
      if (video.readyState >= 1) syncLayoutHeight();

      window.addEventListener('resize', () => { syncLayoutHeight(); rebuildFromTime(video.currentTime); });
      video.addEventListener('play', () => { danmakuManager.resume(); startLineAnimation(); removeInteractionMenu(); });
      video.addEventListener('pause', () => { danmakuManager.pause(); stopLineAnimation(); });
      video.addEventListener('seeking', () => rebuildFromTime(video.currentTime));

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
        const card = document.getElementById(groupId);
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
      const groupsToShow = dialogueGroups.filter(g => g.parentLaunched && g.startTime <= currentTime);
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
    const HEATMAP_ZOOM_MIN = 1;
    const HEATMAP_ZOOM_MAX = 20;
    let heatmapZoom = 1;

    /**
     * 渲染底部热度图：分离“人气”(背景)与“内容”(线条)
     */
    function getHeatmapAxisStep(duration) {
      if (duration <= 60) return 5;
      if (duration <= 180) return 10;
      if (duration <= 600) return 30;
      if (duration <= 1800) return 60;
      if (duration <= 3600) return 120;
      return 300;
    }

    function renderBottomHeatmap() {
      if (!danmakuData.length) return;
      if (!heatmapContent) return;

      const previousScrollWidth = heatmapContent.scrollWidth;
      const previousScrollLeft = heatmapContent.scrollLeft;
      const previousScrollRatio = previousScrollWidth
        ? (previousScrollLeft + heatmapContent.clientWidth / 2) / previousScrollWidth
        : 0;

      heatmapContent.innerHTML = ''; // 清空旧图表

      const baseWidth = heatmapContent.clientWidth;
      const height = heatmapContent.clientHeight;
      if (!baseWidth || !height) return;

      const totalDuration = Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : 60;
      const duration = totalDuration;
      if (duration <= 0) return;
      const width = baseWidth * heatmapZoom;
      const axisHeight = 24;
      const chartHeight = height - axisHeight;
      if (chartHeight <= 0) return;

      // --- 1. 数据分箱 (Binning) ---
      // 针对短视频优化：使用 0.5秒 作为高灵敏度分箱单位
      const binSize = 0.5;
      const binCount = Math.max(2, Math.ceil(duration / binSize));
      
      // 初始化两个数组：全量热度(背景) & 对话热度(前景)
      const allDanmakuBins = new Array(binCount).fill(0);
      const dialogueBins = new Array(binCount).fill(0);

      // 遍历数据进行统计
      danmakuData.forEach(d => {
        if (d.time > duration) return;
        const idx = Math.floor(d.time / binSize);
        if (idx >= 0 && idx < binCount) {
          // 统计全量 (人气)
          allDanmakuBins[idx]++;
          
          // 统计对话 (讨论)
          // 判断依据：属于某个对话组 (有groupId) 或是父弹幕/子弹幕
          if (d.groupId || d.replyTo || (d.replies && d.replies.length > 0)) {
            dialogueBins[idx]++;
          }
        }
      });

      // 计算最大值用于归一化
      const maxAll = Math.max(...allDanmakuBins, 1);
      // 【关键】基于对话数据的最大值归一化，而不是全局最大值。
      // 这样即使对话很少，线条也能占满屏幕，体现相对的激烈程度。
      const maxDialogue = Math.max(...dialogueBins, 1);

      // --- 2. 创建 SVG ---
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.classList.add("heatmap-svg");
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("width", width);
      svg.setAttribute("height", height);

      const centerY = chartHeight / 2;

      // --- 3. 绘制背景层 (The Crowd) - 绿色 Area Chart ---
      // 视觉表现：类似声波图的对称阴影
      let areaPathPointsTop = [];
      let areaPathPointsBottom = [];

      for (let i = 0; i < binCount; i++) {
        const x = (i / (binCount - 1)) * width;
        // 归一化高度，最大占画面的 90%
        const intensity = allDanmakuBins[i] / maxAll; 
        const halfHeight = intensity * (chartHeight / 2 * 0.9);
        
        areaPathPointsTop.push({ x, y: centerY - halfHeight });
        areaPathPointsBottom.push({ x, y: centerY + halfHeight });
      }

      // 构建闭合路径
      let areaD = `M ${areaPathPointsTop[0].x} ${areaPathPointsTop[0].y}`;
      // 上边缘
      areaPathPointsTop.forEach(p => { areaD += ` L ${p.x} ${p.y}`; });
      // 下边缘 (反向连接)
      for (let i = areaPathPointsBottom.length - 1; i >= 0; i--) {
        areaD += ` L ${areaPathPointsBottom[i].x} ${areaPathPointsBottom[i].y}`;
      }
      areaD += " Z"; // 闭合

      const areaPath = document.createElementNS(svgNS, "path");
      areaPath.classList.add("heatmap-area");
      areaPath.setAttribute("d", areaD);
      svg.appendChild(areaPath); // 先添加背景，使其位于底层

      // --- 4. 绘制前景层 (The Discussion) - 橙色 Zig-Zag Line ---
      // 视觉表现：上下摆动的脉搏线
      let linePoints = [];

      for (let i = 0; i < binCount; i++) {
        const x = (i / (binCount - 1)) * width;
        
        // 核心 Zig-Zag 逻辑
        // 1. 振幅：由对话热度决定
        const intensity = dialogueBins[i] / maxDialogue;
        const amplitude = intensity * (chartHeight / 2 * 0.8); // 留一点边距
        
        // 2. 方向：奇偶交替 (逢单向上，逢双向下)
        // 如果热度为0，振幅为0，自然就是直线
        const direction = (i % 2 === 0) ? -1 : 1; 
        const y = centerY + (amplitude * direction);
        
        linePoints.push({ x, y });
      }

      // 使用折线连接，保证节点落在曲线上
      if (linePoints.length > 1) {
        let lineD = `M ${linePoints[0].x} ${linePoints[0].y}`;
        
        for (let i = 1; i < linePoints.length; i++) {
          const curr = linePoints[i];
          lineD += ` L ${curr.x} ${curr.y}`;
        }
        
        const linePath = document.createElementNS(svgNS, "path");
        linePath.classList.add("heatmap-line");
        linePath.setAttribute("d", lineD);
        svg.appendChild(linePath);
      }

      // --- 5. 绘制节点 (Nodes) ---
      // 规则：橙色(首), 绿色(中), 蓝色(尾)。仅对话弹幕显示。
      const processedDialogueIds = new Set(); // 防止重复绘制
      
      danmakuData.forEach(d => {
        // 仅处理对话弹幕
        if (!d.groupId && !d.replyTo && (!d.replies || d.replies.length === 0)) return;
        if (d.time > duration) return;
        if (processedDialogueIds.has(d.id)) return;
        
        // 计算位置
        const x = (d.time / duration) * width;
        
        // Y轴位置：我们需要找到它对应在 Zig-Zag 线上的大概位置
        // 简化计算：重新计算该时间点对应的 Zig-Zag Y坐标
        const binFloat = d.time / binSize;
        const leftIdx = Math.min(binCount - 1, Math.max(0, Math.floor(binFloat)));
        const rightIdx = Math.min(binCount - 1, leftIdx + 1);
        const leftPoint = linePoints[leftIdx];
        const rightPoint = linePoints[rightIdx] || leftPoint;
        const segmentWidth = rightPoint.x - leftPoint.x;
        const t = segmentWidth > 0 ? (x - leftPoint.x) / segmentWidth : 0;
        const clampedT = Math.max(0, Math.min(1, t));
        const y = leftPoint.y + (rightPoint.y - leftPoint.y) * clampedT;

        // 颜色判定逻辑
        let color = '#2196F3'; // 默认蓝 (Leaf)
        let radius = 2.5;

        // 1. Root (橙色)
        // 判定：它是某个组的 parentId，或者它自身没有 replyTo 但有 replies
        const isRoot = dialogueGroups.some(g => g.parentId === d.id);
        
        // 2. Bridge (绿色)
        // 判定：不是Root，但它有回复 (replyTo 别人，且别人 replyTo 它 [在数据结构里通常表现为它有replies])
        const hasReplies = d.replies && d.replies.length > 0;
        
        if (isRoot) {
          color = '#FF8C00'; 
          radius = 4;
        } else if (hasReplies) {
          color = '#4CAF50';
          radius = 3;
        }

        const circle = document.createElementNS(svgNS, "circle");
        circle.classList.add("heatmap-node");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", radius);
        circle.setAttribute("fill", color);
        
        // Tooltip
        const title = document.createElementNS(svgNS, "title");
        title.textContent = `[${formatTime(d.time)}] ${d.text}`;
        circle.appendChild(title);
        
        svg.appendChild(circle);
        processedDialogueIds.add(d.id);
      });

      // --- 6. 时间轴 (Axis) ---
      const axisGroup = document.createElementNS(svgNS, "g");
      axisGroup.classList.add("heatmap-axis");
      const axisLine = document.createElementNS(svgNS, "line");
      axisLine.classList.add("heatmap-axis-line");
      axisLine.setAttribute("x1", "0");
      axisLine.setAttribute("x2", String(width));
      axisLine.setAttribute("y1", String(chartHeight + 0.5));
      axisLine.setAttribute("y2", String(chartHeight + 0.5));
      axisGroup.appendChild(axisLine);

      const tickStep = getHeatmapAxisStep(duration);
      const tickTimes = [];
      for (let t = 0; t <= duration; t += tickStep) {
        tickTimes.push(t);
      }
      if (tickTimes[tickTimes.length - 1] < duration) {
        tickTimes.push(duration);
      }

      tickTimes.forEach((time) => {
        const tickX = (time / duration) * width;
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
        label.setAttribute("text-anchor", "middle");
        label.textContent = formatTime(time);
        axisGroup.appendChild(label);
      });

      svg.appendChild(axisGroup);

      // --- 7. 交互：点击跳转 ---
      svg.addEventListener('click', (e) => {
        // 获取点击相对于 SVG 的 X 坐标
        const rect = heatmapContent.getBoundingClientRect();
        const clickX = e.clientX - rect.left + heatmapContent.scrollLeft;
        const percent = Math.max(0, Math.min(1, clickX / width));
        
        // 跳转视频
        video.currentTime = percent * duration;
        video.play();
      });

      heatmapContent.appendChild(svg);

      if (heatmapZoom > 1 && heatmapContent.scrollWidth > heatmapContent.clientWidth) {
        const nextScrollCenter = heatmapContent.scrollWidth * previousScrollRatio;
        heatmapContent.scrollLeft = Math.max(0, nextScrollCenter - heatmapContent.clientWidth / 2);
      } else {
        heatmapContent.scrollLeft = 0;
      }
    }

    // 监听窗口大小变化和视频加载，重绘热度图
    if (heatmapContent) {
      window.addEventListener('resize', renderBottomHeatmap);
      video.addEventListener('loadedmetadata', renderBottomHeatmap);
      // 初始化时尝试渲染一次
      setTimeout(renderBottomHeatmap, 1000);
    }

    function updateHeatmapZoom(value) {
      const nextZoom = Number(value);
      if (Number.isFinite(nextZoom)) {
        heatmapZoom = Math.min(HEATMAP_ZOOM_MAX, Math.max(HEATMAP_ZOOM_MIN, nextZoom));
      } else {
        heatmapZoom = HEATMAP_ZOOM_MIN;
      }
      if (heatmapZoomInput && Number(heatmapZoomInput.value) !== heatmapZoom) {
        heatmapZoomInput.value = heatmapZoom.toString();
      }
      if (heatmapZoomValue) {
        heatmapZoomValue.textContent = `${heatmapZoom.toFixed(1)}x`;
      }
      renderBottomHeatmap();
    }

    if (heatmapZoomInput) {
      heatmapZoomInput.addEventListener('input', (e) => {
        updateHeatmapZoom(e.target.value);
      });
      updateHeatmapZoom(heatmapZoomInput.value);
    }

    initializePlayer();
