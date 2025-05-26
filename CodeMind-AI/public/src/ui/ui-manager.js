/**
     * مدير الواجهة التفاعلية الكامل
     * يدير جميع عناصر الواجهة والتفاعلات
     */

    // import { Logger } from '../utils/logger.js';
    // import { Storage } from '../utils/storage.js';
    import { CONFIG } from '../utils/config.js';

    const Logger = console; // Placeholder
    const Storage = class { async get() {} async set() {} }; // Placeholder

    export class UIManager {
        constructor() {
            this.logger = Logger; // Placeholder
            this.storage = new Storage(); // Placeholder
            this.isInitialized = false;
            this.currentTheme = 'dark';
            this.animations = new Map();
            this.components = new Map();
            this.eventListeners = new Map();
            this.state = { isSettingsOpen: false, isTerminalVisible: true, isAgentActive: false, currentMessage: null, typingIndicator: false };
            this.messageQueue = [];
            this.isProcessingQueue = false;
            this.logger.info('🎨 UI Manager initialized');
        }

        async initialize() {
            try {
                this.logger.info('🚀 Initializing UI Manager...');
                await this.loadUserPreferences();
                this.initializeComponents();
                this.setupEventListeners();
                this.applyTheme(this.currentTheme);
                this.setupAnimations();
                this.hideLoadingScreen();
                this.isInitialized = true;
                this.logger.info('✅ UI Manager initialized successfully'); // Changed from success
            } catch (error) {
                this.logger.error('❌ Failed to initialize UI Manager:', error);
                throw error;
            }
        }

        initializeComponents() {
            const ids = ['chat-container', 'chat-messages', 'user-input', 'send-btn', 'command-terminal', 'clear-terminal', 'toggle-terminal', 'settings-btn', 'settings-panel', 'close-settings', 'api-key', 'ai-model', 'save-settings', 'status-indicator', 'theme-toggle', 'overlay'];
            ids.forEach(id => this.components.set(id, document.getElementById(id)));
            this.logger.info('🧩 UI components initialized');
        }

        setupEventListeners() {
            this.addEventListenerSafe('sendBtn', 'click', () => this.handleSendMessage());
            this.addEventListenerSafe('userInput', 'keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSendMessage(); } });
            this.addEventListenerSafe('userInput', 'input', () => this.handleInputChange());
            this.addEventListenerSafe('settingsBtn', 'click', () => this.toggleSettings());
            this.addEventListenerSafe('closeSettings', 'click', () => this.closeSettings());
            this.addEventListenerSafe('saveSettings', 'click', () => this.saveSettings());
            this.addEventListenerSafe('clearTerminal', 'click', () => this.clearTerminal());
            this.addEventListenerSafe('toggleTerminal', 'click', () => this.toggleTerminal());
            this.addEventListenerSafe('themeToggle', 'click', () => this.toggleTheme());
            this.addEventListenerSafe('overlay', 'click', () => this.closeSettings());
            this.addEventListenerSafe('toggle-api-key', 'click', () => this.toggleApiKeyVisibility());
            this.setupRangeInputs();
            this.setupAgentEventListeners();
            window.addEventListener('beforeunload', () => this.cleanup());
            window.addEventListener('resize', () => this.handleResize());
            this.logger.info('👂 Event listeners setup completed');
        }

        addEventListenerSafe(elementId, event, handler) {
            const element = this.components.get(elementId) || document.getElementById(elementId);
            if (element) {
                element.addEventListener(event, handler);
                if (!this.eventListeners.has(elementId)) this.eventListeners.set(elementId, []);
                this.eventListeners.get(elementId).push({ event, handler });
            } else { this.logger.warn(`Element not found: ${elementId}`); }
        }

        setupAgentEventListeners() {
            const agentEvents = {
                'agent:initialized': () => this.updateStatus('جاهز', 'ready'),
                'agent:activated': () => { this.state.isAgentActive = true; this.updateStatus('نشط', 'active'); this.enableInput(); },
                'agent:deactivated': () => { this.state.isAgentActive = false; this.updateStatus('غير نشط', 'inactive'); this.disableInput(); },
                'agent:taskStarted': (e) => this.handleTaskStarted(e.detail),
                'agent:taskCompleted': (e) => this.handleTaskCompleted(e.detail),
                'agent:taskFailed': (e) => this.handleTaskFailed(e.detail),
                'command:stepStarted': (e) => this.handleStepStarted(e.detail),
                'command:stepCompleted': (e) => this.handleStepCompleted(e.detail),
                'command:stepFailed': (e) => this.handleStepFailed(e.detail),
                'agent:message': (e) => this.addMessage('agent', e.detail.content)
            };
            for (const [eventName, handler] of Object.entries(agentEvents)) {
                window.addEventListener(eventName, handler);
            }
            this.logger.info('🤖 Agent event listeners setup completed');
        }

        async handleSendMessage() {
            const input = this.components.get('userInput');
            const message = input.value.trim();
            if (!message) return;
            if (!this.state.isAgentActive) { this.showNotification('يرجى تفعيل الوكيل أولاً من الإعدادات', 'warning'); return; }
            try {
                this.addMessage('user', message);
                input.value = ''; this.updateSendButton(); this.autoResizeTextarea(); // autoResize after clearing
                this.showTypingIndicator();
                this.emit('userMessage', { message });
            } catch (error) { this.logger.error('Error sending message:', error); this.showNotification('حدث خطأ في إرسال الرسالة', 'error'); }
        }

        addMessage(type, content, options = {}) {
            const message = { id: this.generateMessageId(), type, content, timestamp: new Date(), ...options };
            this.messageQueue.push(message); this.processMessageQueue(); return message;
        }

        async processMessageQueue() {
            if (this.isProcessingQueue || this.messageQueue.length === 0) return;
            this.isProcessingQueue = true;
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift(); await this.renderMessage(message);
                if (this.messageQueue.length > 0) await this.delay(300);
            }
            this.isProcessingQueue = false;
        }

        async renderMessage(message) {
            const messagesContainer = this.components.get('chatMessages'); if (!messagesContainer) return;
            this.hideTypingIndicator();
            const messageElement = this.createMessageElement(message);
            messageElement.style.opacity = '0'; messageElement.style.transform = 'translateY(20px)';
            messagesContainer.appendChild(messageElement);
            await this.animateElement(messageElement, { opacity: '1', transform: 'translateY(0)' }, 300);
            this.scrollToBottom();
            if (message.type === 'agent' && message.content) await this.typeMessageContent(messageElement, message.content);
        }

        createMessageElement(message) {
            const messageDiv = document.createElement('div'); messageDiv.className = `message ${message.type}-message`; messageDiv.dataset.messageId = message.id;
            const avatar = document.createElement('div'); avatar.className = 'message-avatar'; avatar.textContent = message.type === 'user' ? '👤' : '🤖';
            const contentContainer = document.createElement('div'); contentContainer.className = 'message-content';
            const timestamp = document.createElement('div'); timestamp.className = 'message-timestamp'; timestamp.textContent = this.formatTime(message.timestamp);
            const content = document.createElement('div'); content.className = 'message-text';
            if (message.type === 'user') content.textContent = message.content; else content.innerHTML = '<span class="typing-cursor">|</span>';
            contentContainer.append(content, timestamp); messageDiv.append(avatar, contentContainer); return messageDiv;
        }

        async typeMessageContent(messageElement, content) {
            const contentElement = messageElement.querySelector('.message-text'); if (!contentElement) return;
            contentElement.innerHTML = ''; // Clear existing before typing
            if (typeof content === 'object' && content !== null && content.type) { // Check for .type for structured content
                 await this.renderStructuredContent(contentElement, content);
            } else if (typeof content === 'string') {
                 await this.typeText(contentElement, content);
            } else {
                this.logger.warn("Unsupported message content type:", content);
                await this.typeText(contentElement, "Unsupported content format.");
            }
        }


        async renderStructuredContent(container, content) {
            switch (content.type) {
                case 'code': await this.renderCodeContent(container, content); break;
                case 'search': await this.renderSearchContent(container, content); break;
                // case 'analysis': await this.renderAnalysisContent(container, content); break; // Assuming renderAnalysisContent exists
                default: await this.typeText(container, content.content || JSON.stringify(content)); // Fallback
            }
        }

        async renderCodeContent(container, content) {
            const title = document.createElement('h3'); title.textContent = '💻 تم إنشاء الكود'; container.appendChild(title);
            if (content.explanation) { const exp = document.createElement('p'); await this.typeText(exp, content.explanation); container.appendChild(exp); }
            const codeContainer = document.createElement('div'); codeContainer.className = 'code-container';
            const codeHeader = document.createElement('div'); codeHeader.className = 'code-header';
            codeHeader.innerHTML = `<span class="code-language">${content.language}</span><button class="copy-btn">📋 نسخ</button>`;
            codeHeader.querySelector('.copy-btn').onclick = () => { navigator.clipboard.writeText(content.code); this.showNotification('تم نسخ الكود!', 'success'); };
            const codeBlock = document.createElement('pre'); codeBlock.className = 'code-block'; const codeElement = document.createElement('code'); codeElement.className = `language-${content.language}`;
            codeBlock.appendChild(codeElement); codeContainer.append(codeHeader, codeBlock); container.appendChild(codeContainer);
            await this.typeCode(codeElement, content.code);
            if (content.language === 'html' || content.files) {
                const previewBtn = document.createElement('button'); previewBtn.className = 'preview-btn primary-btn'; previewBtn.textContent = '👁️ معاينة';
                previewBtn.onclick = () => this.showCodePreview(content); container.appendChild(previewBtn);
            }
        }

        async renderSearchContent(container, content) {
            const title = document.createElement('h3'); title.textContent = `🔍 نتائج البحث عن: ${content.query}`; container.appendChild(title);
            if (content.results && content.results.length > 0) {
                const resultsList = document.createElement('div'); resultsList.className = 'search-results';
                for (const result of content.results) {
                    const item = document.createElement('div'); item.className = 'search-result-item';
                    item.innerHTML = `<h4><a href="${result.url}" target="_blank" rel="noopener noreferrer">${result.title}</a></h4><p class="result-snippet">${result.snippet}</p><span class="result-source">${result.source}</span>`;
                    resultsList.appendChild(item);
                    await this.animateElement(item, { opacity: '1', transform: 'translateX(0)' }, 200); await this.delay(100);
                }
                container.appendChild(resultsList);
            }
        }
        // Placeholder for renderAnalysisContent
        async renderAnalysisContent(container, content) {
            const title = document.createElement('h3'); title.textContent = '📊 نتائج التحليل'; container.appendChild(title);
            const summary = document.createElement('p'); await this.typeText(summary, content.summary || "لا يوجد ملخص متاح."); container.appendChild(summary);
        }


        async typeText(element, text, speed = 30) { for (const char of text.split('')) { element.textContent += char; await this.delay(speed); } }
        async typeCode(element, code, speed = 20) { for (const line of code.split('
')) { for (const char of line.split('')) { element.textContent += char; await this.delay(speed); } element.textContent += '
'; await this.delay(speed * 2); } this.applySyntaxHighlighting(element); }

        applySyntaxHighlighting(element) {
             if (typeof hljs !== 'undefined' && hljs.highlightElement) { // Check if highlight.js is available
                element.textContent = element.textContent.trim(); // Trim before highlighting
                hljs.highlightElement(element);
            } else { // Fallback to simple regex if hljs not found
                const code = element.textContent;
                const keywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export'];
                let highlightedCode = code.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>') // Comments first
                                      .replace(/(["'`])((?:(?!)[^\]|\.)*)()/g, '<span class="string">$1$2$3</span>'); // Strings
                keywords.forEach(k => { highlightedCode = highlightedCode.replace(new RegExp(`\\b${k}\\b`, 'g'), `<span class="keyword">${k}</span>`); });
                element.innerHTML = highlightedCode;
            }
        }


        showTypingIndicator() {
            if (this.state.typingIndicator) return;
            const messagesContainer = this.components.get('chatMessages'); if (!messagesContainer) return;
            const typingDiv = document.createElement('div'); typingDiv.className = 'typing-indicator'; typingDiv.id = 'typing-indicator';
            typingDiv.innerHTML = `<div class="message-avatar">🤖</div><div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
            messagesContainer.appendChild(typingDiv); this.scrollToBottom(); this.state.typingIndicator = true;
        }
        hideTypingIndicator() { const ind = document.getElementById('typing-indicator'); if (ind) { ind.remove(); this.state.typingIndicator = false; } }

        addTerminalMessage(message, type = 'info') {
            const terminal = this.components.get('commandTerminal'); if (!terminal) return;
            const content = terminal.querySelector('.terminal-content'); if (!content) return;
            const line = document.createElement('div'); line.className = `terminal-line terminal-${type}`;
            line.innerHTML = `<span class="terminal-timestamp">[${new Date().toLocaleTimeString()}]</span> <span class="terminal-prompt">$</span> <span class="terminal-text">${message}</span>`;
            content.appendChild(line); terminal.scrollTop = terminal.scrollHeight;
            const lines = content.querySelectorAll('.terminal-line'); if (lines.length > 100) lines[0].remove();
        }

        handleTaskStarted(task) { this.addTerminalMessage(`بدء تنفيذ المهمة: ${task.input}`, 'info'); this.updateStatus('يعمل...', 'working'); }
        handleTaskCompleted(task) { this.addTerminalMessage(`تم إكمال المهمة بنجاح`, 'success'); this.updateStatus('نشط', 'active'); if (task.result) this.addMessage('agent', task.result); }
        handleTaskFailed(task) { this.addTerminalMessage(`فشل في تنفيذ المهمة: ${task.error}`, 'error'); this.updateStatus('خطأ', 'error'); this.addMessage('agent', `عذراً، حدث خطأ: ${task.error}`); }
        handleStepStarted(data) { this.addTerminalMessage(`تنفيذ: ${data.step.description}`, 'info'); }
        handleStepCompleted(data) { this.addTerminalMessage(`✅ ${data.step.description}`, 'success'); }
        handleStepFailed(data) { this.addTerminalMessage(`❌ ${data.step.description}: ${data.error.message}`, 'error'); }

        updateStatus(text, statusClass) { // Renamed status to statusClass to avoid conflict
            const indicator = this.components.get('statusIndicator'); if (!indicator) return;
            const dot = indicator.querySelector('.status-dot'); const txt = indicator.querySelector('.status-text');
            if (dot) dot.className = `status-dot ${statusClass}`; if (txt) txt.textContent = text;
        }

        enableInput() { const ui = this.components.get('userInput'), sb = this.components.get('sendBtn'); if (ui) { ui.disabled = false; ui.placeholder = 'اكتب أمرك هنا...'; } if (sb) sb.disabled = false; this.updateSendButton(); }
        disableInput() { const ui = this.components.get('userInput'), sb = this.components.get('sendBtn'); if (ui) { ui.disabled = true; ui.placeholder = 'يرجى تفعيل الوكيل من الإعدادات...'; } if (sb) sb.disabled = true; this.updateSendButton(); }
        handleInputChange() { this.updateSendButton(); this.autoResizeTextarea(); }
        updateSendButton() { const ui = this.components.get('userInput'), sb = this.components.get('sendBtn'); if (ui && sb) { const hasText = ui.value.trim().length > 0; sb.disabled = !hasText || !this.state.isAgentActive; sb.style.opacity = (!hasText || !this.state.isAgentActive) ? '0.5' : '1'; } }
        autoResizeTextarea() { const ui = this.components.get('userInput'); if (!ui) return; ui.style.height = 'auto'; ui.style.height = `${Math.min(ui.scrollHeight, 120)}px`; }
        scrollToBottom() { const chatContainer = this.components.get('chatContainer'); if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight; }
        toggleSettings() { if (this.state.isSettingsOpen) this.closeSettings(); else this.openSettings(); }

        openSettings() {
            const panel = this.components.get('settingsPanel'), overlay = this.components.get('overlay');
            if (panel && overlay) {
                panel.classList.remove('hidden'); overlay.classList.remove('hidden'); this.state.isSettingsOpen = true;
                this.loadSettingsToForm();
                panel.style.transform = 'translateX(100%)'; panel.style.opacity = '0'; // Start off-screen for RTL
                this.animateElement(panel, { transform: 'translateX(0)', opacity: '1' }, 300);
            }
        }
        closeSettings() {
            const panel = this.components.get('settingsPanel'), overlay = this.components.get('overlay');
            if (panel && overlay) {
                this.animateElement(panel, { transform: 'translateX(100%)', opacity: '0' }, 300) // Off-screen for RTL
                    .then(() => { panel.classList.add('hidden'); overlay.classList.add('hidden'); this.state.isSettingsOpen = false; });
            }
        }

        async saveSettings() {
            try {
                const apiKey = this.components.get('apiKey')?.value, aiModel = this.components.get('aiModel')?.value;
                if (!apiKey) { this.showNotification('يرجى إدخال مفتاح API', 'warning'); return; }
                const settings = { apiKey, aiModel, theme: this.currentTheme };
                await this.storage.set('user_settings', settings);
                this.emit('settingsSaved', settings);
                this.showNotification('تم حفظ الإعدادات بنجاح', 'success'); this.closeSettings();
            } catch (error) { this.logger.error('Error saving settings:', error); this.showNotification('حدث خطأ في حفظ الإعدادات', 'error'); }
        }
        async loadSettingsToForm() { try { const s = await this.storage.get('user_settings'); if (s) { if (this.components.get('apiKey') && s.apiKey) this.components.get('apiKey').value = s.apiKey; if (this.components.get('aiModel') && s.aiModel) this.components.get('aiModel').value = s.aiModel; } } catch (e) { this.logger.error('Error loading settings to form:', e); } }
        toggleApiKeyVisibility() { const i = this.components.get('apiKey'), t = document.getElementById('toggle-api-key'); if (i && t) { i.type = i.type === 'password' ? 'text' : 'password'; t.textContent = i.type === 'password' ? '👁️' : '🙈'; } }

        setupRangeInputs() { document.querySelectorAll('.range-input').forEach(i => { const u = () => { const v = i.parentElement.querySelector('.range-value'); if (v) v.textContent = i.value; }; i.addEventListener('input', u); u(); }); }
        clearTerminal() { const t = this.components.get('commandTerminal'); if (t) { const c = t.querySelector('.terminal-content'); if (c) c.innerHTML = `<div class="terminal-line"><span class="terminal-prompt">CodeMind AI $</span> <span class="terminal-text">تم مسح الطرفية</span></div>`; } }
        toggleTerminal() { const ts = document.querySelector('.terminal-section'), tb = this.components.get('toggleTerminal'); if (ts && tb) { this.state.isTerminalVisible = !this.state.isTerminalVisible; ts.style.display = this.state.isTerminalVisible ? 'flex' : 'none'; tb.textContent = this.state.isTerminalVisible ? 'إخفاء' : 'إظهار'; } } // Changed display to flex for terminal section
        toggleTheme() { this.applyTheme(this.currentTheme === 'dark' ? 'light' : 'dark'); }
        applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme); this.currentTheme = theme;
            const tt = this.components.get('themeToggle'); if (tt) { const i = tt.querySelector('.icon'); if (i) i.textContent = theme === 'dark' ? '☀️' : '🌙'; }
            this.storage.set('theme_preference', theme); this.logger.info(`🎨 Theme applied: ${theme}`);
        }

        showNotification(message, type = 'info') {
            const n = document.createElement('div'); n.className = `notification notification-${type}`; n.textContent = message;
            n.style.cssText = `position:fixed;top:20px;right:20px;padding:12px 20px;border-radius:8px;color:white;font-weight:600;z-index:10000;max-width:300px;word-wrap:break-word;transform:translateX(120%);transition:transform 0.3s ease-out;box-shadow:0 4px 15px rgba(0,0,0,0.2);`; // Increased z-index
            const c = { error: '#ef4444', success: '#10b981', warning: '#f59e0b', info: '#3b82f6' }; n.style.backgroundColor = c[type] || c.info;
            document.body.appendChild(n); setTimeout(() => { n.style.transform = 'translateX(0)'; }, 10);
            setTimeout(() => { n.style.transform = 'translateX(120%)'; setTimeout(() => { if (n.parentNode) n.parentNode.removeChild(n); }, 300); }, 5000);
        }

        showCodePreview(content) {
            const modalId = 'code-preview-modal-container';
            let modalContainer = document.getElementById(modalId);
            if (!modalContainer) {
                modalContainer = document.createElement('div');
                modalContainer.id = modalId;
                modalContainer.className = 'code-preview-modal'; // This is the overlay
                document.body.appendChild(modalContainer);
            }

            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content'; // Actual dialog box
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h3>معاينة الكود</h3>
                    <button class="close-modal-btn">✕</button>
                </div>
                <div class="modal-body">
                    <iframe class="code-preview-frame" sandbox="allow-scripts allow-same-origin"></iframe>
                </div>`;
            modalContainer.innerHTML = ''; // Clear previous modal if any
            modalContainer.appendChild(modalContent);
            modalContainer.classList.add('visible');


            const iframe = modalContent.querySelector('.code-preview-frame');
            const htmlContent = content.files ? content.files.find(f => f.name.endsWith('.html'))?.content : (content.language === 'html' ? content.code : null);
            const cssContent = content.files ? content.files.find(f => f.name.endsWith('.css'))?.content : (content.language === 'css' ? content.code : '');
            const jsContent = content.files ? content.files.find(f => f.name.endsWith('.js'))?.content : (content.language === 'javascript' ? content.code : '');

            let finalHtml = htmlContent || `
                <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>معاينة</title>
                <style>${cssContent}</style></head><body>
                ${!htmlContent && (jsContent || cssContent) ? `<script>${jsContent}</script>` : (content.code || '')}
                </body></html>`;

            if (htmlContent && jsContent) { // Inject JS into HTML
                 finalHtml = finalHtml.replace('</body>', `<script>${jsContent}</script></body>`);
            }
             if (htmlContent && cssContent && !finalHtml.includes(`<style>${cssContent}</style>`)) { // Inject CSS if not already there
                 finalHtml = finalHtml.replace('</head>', `<style>${cssContent}</style></head>`);
            }

            iframe.srcdoc = finalHtml;

            const closeModal = () => {
                 modalContainer.classList.remove('visible');
                 setTimeout(() => { if (modalContainer.parentNode) modalContainer.parentNode.removeChild(modalContainer); }, 300); // Remove after transition
            };
            modalContent.querySelector('.close-modal-btn').onclick = closeModal;
            modalContainer.onclick = (e) => { if (e.target === modalContainer) closeModal(); };
        }


        setupAnimations() { const s = document.createElement('style'); s.textContent = `@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}} .typing-dot{animation:pulse 1.4s infinite ease-in-out} .typing-dot:nth-child(1){animation-delay:-.32s} .typing-dot:nth-child(2){animation-delay:-.16s} .typing-dot:nth-child(3){animation-delay:0s}`; document.head.appendChild(s); }
        animateElement(element, properties, duration = 300) { return new Promise(resolve => { const sT = performance.now(), sP = {}; for (const p in properties) sP[p] = getComputedStyle(element)[p] || '0'; const anim = (cT) => { const e = cT - sT, prog = Math.min(e / duration, 1), eP = this.easeOutCubic(prog); for (const p in properties) { const sV = parseFloat(sP[p]) || 0, eV = parseFloat(properties[p]) || 0, cV = sV + (eV - sV) * eP; if (p === 'opacity') element.style[p] = cV; else if (p === 'transform') element.style[p] = properties[p]; else element.style[p] = `${cV}px`; } if (prog < 1) requestAnimationFrame(anim); else resolve(); }; requestAnimationFrame(anim); }); }
        easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
        hideLoadingScreen() { const ls = document.getElementById('loading-screen'), app = document.getElementById('app'); if (ls && app) { setTimeout(() => { ls.style.opacity = '0'; app.style.display = 'flex'; app.style.opacity = '0'; setTimeout(() => { ls.style.display = 'none'; app.style.opacity = '1'; }, 300); }, 500); } } // Changed app display to flex
        handleResize() { const iM = window.innerWidth < 768; document.documentElement.classList.toggle('mobile', iM); setTimeout(() => this.scrollToBottom(), 100); }
        async loadUserPreferences() { try { const p = await this.storage.get('user_preferences'); if (p) this.currentTheme = p.theme || 'dark'; const tP = await this.storage.get('theme_preference'); if (tP) this.currentTheme = tP; } catch (e) { this.logger.error('Error loading user preferences:', e); } }
        formatTime(date) { return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }); }
        generateMessageId() { return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`; }
        delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
        emit(eventName, data) { const event = new CustomEvent(`ui:${eventName}`, { detail: data }); if (typeof window !== 'undefined') window.dispatchEvent(event); this.logger.debug(`📡 UI Event emitted: ${eventName}`); }
        async cleanup() { try { this.logger.info('🧹 Cleaning up UI Manager...'); for (const [elId, listeners] of this.eventListeners) { const el = this.components.get(elId) || document.getElementById(elId); if (el) listeners.forEach(({ event, handler }) => el.removeEventListener(event, handler)); } this.animations.clear(); this.messageQueue = []; this.logger.info('✅ UI Manager cleanup completed'); } catch (e) { this.logger.error('Error during cleanup:', e); } }
    }
    export default UIManager;
    ```
