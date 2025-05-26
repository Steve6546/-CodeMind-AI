/**
     * النواة الأساسية للوكيل الذكي
     * المسؤولة عن تنسيق جميع العمليات والقرارات
     */

    import { APIManager } from './api-manager.js';
    import { CommandProcessor } from './command-processor.js';
    import { ErrorHandler } from './error-handler.js';
    // import { Logger } from '../utils/logger.js'; // Assuming Logger is used, ensure it's correctly imported if so
    // import { Storage } from '../utils/storage.js'; // Assuming Storage is used
    import { CONFIG } from '../utils/config.js';
    import ZipProcessor from '../utils/zip-processor.js';

    // Placeholder for Logger and Storage if not fully implemented or to avoid errors if they are basic
    const Logger = console; // Simple placeholder
    const Storage = class { async get() {} async set() {} }; // Simple placeholder


    export class AgentCore {
        constructor() {
            this.isInitialized = false;
            this.isActive = false;
            this.currentTask = null;
            this.taskQueue = [];
            this.context = new Map();
            this.capabilities = new Set();

            // Initialize core components
            this.apiManager = new APIManager();
            this.zipProcessor = new ZipProcessor();
            this.currentZipFile = null; // To store info about the loaded zip
            this.commandProcessor = new CommandProcessor(this.apiManager, this); // New: passing 'this' (AgentCore instance)
            this.errorHandler = new ErrorHandler();
            this.logger = Logger; // Use placeholder Logger
            this.storage = new Storage(); // Use placeholder Storage

            // Bind methods
            this.processCommand = this.processCommand.bind(this);
            this.handleError = this.handleError.bind(this);

            // Event listeners
            this.setupEventListeners();

            this.logger.info('🤖 Agent Core initialized');
            this.startTime = Date.now(); // Added for getStatus() uptime
        }

        async handleZipFile(file) {
            this.logger.info(`AgentCore received ZIP file: ${file.name}`);
            this.emit('agentNotification', { message: `Processing ZIP file: ${file.name}...`, type: 'info' }); // For UIManager to show
            try {
                const result = await this.zipProcessor.loadZip(file);
                this.currentZipFile = { name: file.name, processor: this.zipProcessor }; // Store reference
                this.logger.info(`Successfully processed ZIP file: ${file.name}. Files found: ${result.fileCount}`);
                this.emit('agentNotification', { message: `Successfully processed ${file.name}. Found ${result.fileCount} files. You can now ask questions about its content.`, type: 'success' });

                // Add to context or make it available for commands
                this.context.set('last_uploaded_zip', {
                    name: file.name,
                    fileCount: result.fileCount,
                    timestamp: new Date()
                });
                // Optionally, list files immediately or wait for user command
                // const fileList = this.zipProcessor.listFiles();
                // this.emit('message', { type: 'agent', content: `Files in ${file.name}:\n${fileList.map(f => `- ${f.name} (${f.size} bytes)`).join('\n')}` });

            } catch (error) {
                this.logger.error('AgentCore: Error processing ZIP file:', error);
                this.currentZipFile = null;
                this.emit('agentNotification', { message: `Error processing ZIP file ${file.name}: ${error.message}`, type: 'error' });
            }
        }

        /**
         * تهيئة الوكيل الذكي
         */
        async initialize() {
            try {
                this.logger.info('🚀 Initializing Agent Core...');

                // Load saved settings
                await this.loadSettings();

                // Initialize API Manager
                // await this.apiManager.initialize(); // Assuming this method exists in your APIManager

                // Initialize Command Processor
                // await this.commandProcessor.initialize(); // Assuming this method exists

                // Initialize Error Handler
                // await this.errorHandler.initialize(); // Assuming this method exists

                // Register capabilities
                this.registerCapabilities();

                // Load context from storage
                await this.loadContext();

                this.isInitialized = true;
                this.logger.info('✅ Agent Core initialized successfully'); // Changed from success to info for placeholder logger

                // Emit initialization event
                this.emit('initialized');

                return true;

            } catch (error) {
                this.logger.error('❌ Failed to initialize Agent Core:', error);
                await this.errorHandler.handleError(error, 'initialization');
                throw error;
            }
        }

        /**
         * تفعيل الوكيل
         */
        async activate(apiKey) {
            try {
                if (!this.isInitialized) {
                    throw new Error('Agent must be initialized before activation');
                }

                this.logger.info('🔄 Activating agent...');

                // Validate and set API key
                const isValid = await this.apiManager.validateApiKey(apiKey);
                if (!isValid) {
                    throw new Error('Invalid API key provided');
                }

                await this.apiManager.setApiKey(apiKey);

                // Test API connection
                await this.testApiConnection();

                this.isActive = true;
                this.logger.info('✅ Agent activated successfully'); // Changed from success to info

                // Emit activation event
                this.emit('activated');

                // Send welcome message
                await this.sendWelcomeMessage();

                return true;

            } catch (error) {
                this.logger.error('❌ Failed to activate agent:', error);
                await this.errorHandler.handleError(error, 'activation');
                throw error;
            }
        }

        /**
         * إلغاء تفعيل الوكيل
         */
        async deactivate() {
            try {
                this.logger.info('🔄 Deactivating agent...');

                // Cancel current task
                if (this.currentTask) {
                    await this.cancelCurrentTask();
                }

                // Clear task queue
                this.taskQueue = [];

                // Save context
                await this.saveContext();

                this.isActive = false;
                this.logger.info('✅ Agent deactivated');

                // Emit deactivation event
                this.emit('deactivated');

            } catch (error) {
                this.logger.error('❌ Error during deactivation:', error);
                await this.errorHandler.handleError(error, 'deactivation');
            }
        }

        /**
         * معالجة أمر من المستخدم
         */
        async processCommand(userInput, options = {}) {
            try {
                if (!this.isActive) {
                    throw new Error('Agent is not active. Please activate first.');
                }

                this.logger.info('📝 Processing user command:', userInput);

                // Create task object
                const task = {
                    id: this.generateTaskId(),
                    input: userInput,
                    options: options,
                    timestamp: new Date(),
                    status: 'pending',
                    steps: [],
                    result: null
                };

                // Add to queue
                this.taskQueue.push(task);
                this.currentTask = task;

                // Emit task started event
                this.emit('taskStarted', task);

                // Update task status
                task.status = 'processing';
                this.emit('taskUpdated', task);

                // Process the command
                const result = await this.executeTask(task);

                // Update task with result
                task.result = result;
                task.status = 'completed';
                task.completedAt = new Date();

                this.logger.info('✅ Command processed successfully'); // Changed from success to info

                // Emit task completed event
                this.emit('taskCompleted', task);

                // Clear current task
                this.currentTask = null;

                return result;

            } catch (error) {
                this.logger.error('❌ Error processing command:', error);

                // Update task status
                if (this.currentTask) {
                    this.currentTask.status = 'failed';
                    this.currentTask.error = error.message;
                    this.emit('taskFailed', this.currentTask);
                }

                // Handle error
                // const recovery = await this.errorHandler.handleError(error, 'command_processing', { // Placeholder ErrorHandler might not return this
                //     command: userInput,
                //     task: this.currentTask
                // });
                await this.errorHandler.handleError(error, 'command_processing', { command: userInput, task: this.currentTask });


                // if (recovery && recovery.retry) { // Simplified for placeholder
                //     this.logger.info('🔄 Retrying command...');
                //     return await this.processCommand(userInput, { ...options, retry: true });
                // }

                throw error;
            }
        }

        /**
         * تنفيذ مهمة
         */
        async executeTask(task) {
            try {
                // Step 1: Analyze the command
                this.addTaskStep(task, 'تحليل الأمر...', 'analyzing');
                const analysis = await this.commandProcessor.analyzeCommand(task.input);
                this.addTaskStep(task, 'تم تحليل الأمر بنجاح', 'completed');

                // Step 2: Generate execution plan
                this.addTaskStep(task, 'إنشاء خطة التنفيذ...', 'planning');
                const plan = await this.commandProcessor.generateExecutionPlan(analysis);
                this.addTaskStep(task, 'تم إنشاء خطة التنفيذ', 'completed');

                // Step 3: Execute the plan
                this.addTaskStep(task, 'تنفيذ الخطة...', 'executing');
                const result = await this.commandProcessor.executePlan(plan, task);
                this.addTaskStep(task, 'تم تنفيذ الخطة بنجاح', 'completed');

                // Step 4: Process and format result
                this.addTaskStep(task, 'معالجة النتائج...', 'processing');
                const formattedResult = await this.formatResult(result, analysis.type);
                this.addTaskStep(task, 'تم معالجة النتائج', 'completed');

                // Update context
                this.updateContext(task, analysis, result);

                return formattedResult;

            } catch (error) {
                this.addTaskStep(task, `خطأ: ${error.message}`, 'failed');
                throw error;
            }
        }

        /**
         * إضافة خطوة لمهمة
         */
        addTaskStep(task, description, status) {
            const step = {
                id: this.generateStepId(),
                description,
                status,
                timestamp: new Date()
            };

            task.steps.push(step);
            this.emit('taskStepAdded', { task, step });

            this.logger.info(`📋 Task step: ${description} [${status}]`);
        }

        /**
         * تحديث السياق
         */
        updateContext(task, analysis, result) {
            // Store task in context
            this.context.set(`task_${task.id}`, {
                input: task.input,
                analysis: analysis,
                result: result,
                timestamp: task.timestamp
            });

            // Store recent commands for context awareness
            const recentCommands = this.context.get('recent_commands') || [];
            recentCommands.push({
                input: task.input,
                type: analysis.type,
                timestamp: task.timestamp
            });

            // Keep only last 10 commands
            if (recentCommands.length > 10) {
                recentCommands.splice(0, recentCommands.length - 10);
            }

            this.context.set('recent_commands', recentCommands);

            // Update user preferences based on usage
            this.updateUserPreferences(analysis);
        }

        /**
         * تحديث تفضيلات المستخدم
         */
        updateUserPreferences(analysis) {
            const preferences = this.context.get('user_preferences') || {};

            // Track command types
            if (!preferences.commandTypes) {
                preferences.commandTypes = {};
            }

            const commandType = analysis.type;
            preferences.commandTypes[commandType] = (preferences.commandTypes[commandType] || 0) + 1;

            // Track preferred language
            if (analysis.language) {
                preferences.preferredLanguage = analysis.language;
            }

            this.context.set('user_preferences', preferences);
        }

        /**
         * تنسيق النتيجة
         */
        async formatResult(result, resultType) {
            try {
                switch (resultType) {
                    case 'code_generation':
                        return this.formatCodeResult(result);
                    case 'web_search':
                        return this.formatSearchResult(result);
                    case 'data_analysis':
                        return this.formatAnalysisResult(result);
                    case 'general_query':
                        return this.formatGeneralResult(result);
                    case 'zip_operation': // Added for zip operations
                        return this.formatZipOperationResult(result);
                    default:
                        return result;
                }
            } catch (error) {
                this.logger.error('Error formatting result:', error);
                return result; // Return raw result if formatting fails
            }
        }

        formatCodeResult(result) {
            return {
                type: 'code',
                content: result.code || result.content,
                language: result.language || 'javascript',
                explanation: result.explanation,
                preview: result.preview,
                files: result.files || []
            };
        }

        formatSearchResult(result) {
            return {
                type: 'search',
                query: result.query,
                results: result.results || [],
                summary: result.summary,
                sources: result.sources || []
            };
        }

        formatAnalysisResult(result) {
            return {
                type: 'analysis',
                data: result.data,
                insights: result.insights || [],
                charts: result.charts || [],
                summary: result.summary
            };
        }

        formatGeneralResult(result) {
            return {
                type: 'general',
                content: result.content || result,
                suggestions: result.suggestions || []
            };
        }

        formatZipOperationResult(result) {
            // Assuming 'result' is the 'data' part from executeZipOperation
            if (result.error) {
                return { type: 'error', content: result.error };
            }
            if (result.fileList) { // For list_files
                return { type: 'text', content: `${result.message}\n${result.fileList}` };
            }
            if (result.content) { // For read_file
                return { type: 'code', language: 'plaintext', content: result.content, explanation: `Content of ${result.fileName}` };
            }
            if (result.analysis_summary) { // For analyze_content
                 return { type: 'text', content: `ZIP Analysis Summary:\n${result.analysis_summary}\nFiles checked: ${result.files_checked.join(', ')}`};
            }
            return { type: 'text', content: JSON.stringify(result, null, 2) }; // Fallback for other zip ops
        }


        /**
         * اختبار اتصال API
         */
        async testApiConnection() {
            try {
                this.logger.info('🔍 Testing API connection...');

                const testResponse = await this.apiManager.sendRequest({ // Assuming sendRequest exists and is structured for this
                    message: 'مرحبا، هذا اختبار للاتصال',
                    maxTokens: 50
                });

                if (testResponse && testResponse.content) {
                    this.logger.info('✅ API connection test successful'); // Changed from success
                    return true;
                } else {
                    throw new Error('Invalid API response');
                }

            } catch (error) {
                this.logger.error('❌ API connection test failed:', error);
                throw new Error(`API connection failed: ${error.message}`);
            }
        }

        /**
         * إرسال رسالة ترحيب
         */
        async sendWelcomeMessage() {
            const welcomeMessage = {
                type: 'agent',
                content: `مرحباً! أنا CodeMind AI وأنا جاهز لمساعدتك. 🤖

    يمكنني مساعدتك في:
    • 💻 إنشاء مواقع وتطبيقات ويب
    • 🔍 البحث وتحليل المعلومات
    • 📊 معالجة وتحليل البيانات
    • 🛠️ كتابة وتحليل الكود البرمجي
    • 📁 تحليل ملفات ZIP

    ما الذي تريد أن نعمل عليه اليوم؟`,
                timestamp: new Date()
            };

            this.emit('message', welcomeMessage);
        }

        /**
         * تسجيل القدرات
         */
        registerCapabilities() {
            const capabilities = [
                'code_generation',
                'web_search',
                'data_analysis',
                'text_processing',
                'image_analysis',
                'file_processing',
                'zip_file_processing', // Added
                'web_browsing', // Added
                'api_integration',
                'automation'
            ];

            capabilities.forEach(capability => {
                this.capabilities.add(capability);
            });

            this.logger.info(`📋 Registered ${capabilities.length} capabilities`);
        }

        // In AgentCore class
        async fetchWebsiteContent(url) {
            this.logger.info(`AgentCore attempting to fetch content for URL: ${url}`);
            // IMPORTANT: The PROXY_URL will be provided by the worker in a subsequent step.
            // For now, we'll use a placeholder.
            const PROXY_URL = this.settings?.PROXY_URL || CONFIG.AGENT_SERVICES?.PROXY_URL || 'http://localhost:3001/fetch-url'; // Get from settings or default

            if (!PROXY_URL || (PROXY_URL === 'http://localhost:3001/fetch-url' && !this.settings?.PROXY_URL && !CONFIG.AGENT_SERVICES?.PROXY_URL)) {
                this.logger.warn('Fetch Proxy URL not configured in settings or CONFIG. Using default placeholder which might not work.');
            }
            
            try {
                // The agent's fetch call goes to its own backend proxy, not directly to the target URL from the browser.
                const response = await fetch(`${PROXY_URL}?url=${encodeURIComponent(url)}`);
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Proxy request failed with status ${response.status}: ${errorText}`);
                }
                const data = await response.json(); // Expecting JSON: { success: true/false, textContent: "...", htmlContent: "...", error: "..." }
                if (!data.success) {
                    throw new Error(data.error || 'Proxy returned failure but no specific error message.');
                }
                this.logger.info(`Successfully fetched content via proxy for ${url}. Text length: ${data.textContent?.length}`);
                return { success: true, textContent: data.textContent, htmlContent: data.htmlContent };
            } catch (error) {
                this.logger.error(`Error fetching website content for ${url} via proxy:`, error);
                return { success: false, error: error.message, textContent: null, htmlContent: null };
            }
        }

        hasCapability(capability) {
            return this.capabilities.has(capability);
        }

        async cancelCurrentTask() {
            if (this.currentTask) {
                this.logger.info('🚫 Cancelling current task...');
                this.currentTask.status = 'cancelled';
                this.currentTask.cancelledAt = new Date();
                this.emit('taskCancelled', this.currentTask);
                this.currentTask = null;
            }
        }

        async loadSettings() {
            try {
                const savedSettings = await this.storage.get(CONFIG.STORAGE.KEYS.SETTINGS);
                if (savedSettings) {
                    this.settings = { ...CONFIG, ...savedSettings }; // Merging with default CONFIG
                     if (savedSettings.PROXY_URL) this.settings.PROXY_URL = savedSettings.PROXY_URL; // Explicitly ensure PROXY_URL from storage is kept
                    this.logger.info('📥 Settings loaded from storage');
                } else {
                    this.settings = { ...CONFIG }; // Use a copy of CONFIG
                    this.logger.info('📋 Using default settings');
                }
                 // Ensure AGENT_SERVICES.PROXY_URL from CONFIG is used if not in savedSettings
                if (!this.settings.PROXY_URL && CONFIG.AGENT_SERVICES?.PROXY_URL) {
                   this.settings.PROXY_URL = CONFIG.AGENT_SERVICES.PROXY_URL;
                }
            } catch (error) {
                this.logger.error('Error loading settings:', error);
                this.settings = { ...CONFIG }; // Fallback to a copy of default CONFIG
                 if (!this.settings.PROXY_URL && CONFIG.AGENT_SERVICES?.PROXY_URL) { // Ensure default even on error
                   this.settings.PROXY_URL = CONFIG.AGENT_SERVICES.PROXY_URL;
                }
            }
        }

        async saveSettings() {
            try {
                await this.storage.set(CONFIG.STORAGE.KEYS.SETTINGS, this.settings);
                this.logger.info('💾 Settings saved to storage');
            } catch (error) {
                this.logger.error('Error saving settings:', error);
            }
        }

        async loadContext() {
            try {
                const savedContext = await this.storage.get('agent_context');
                if (savedContext) {
                    this.context = new Map(Object.entries(savedContext));
                    this.logger.info('📥 Context loaded from storage');
                }
            } catch (error) {
                this.logger.error('Error loading context:', error);
            }
        }

        async saveContext() {
            try {
                const contextObj = Object.fromEntries(this.context);
                await this.storage.set('agent_context', contextObj);
                this.logger.info('💾 Context saved to storage');
            } catch (error) {
                this.logger.error('Error saving context:', error);
            }
        }

        setupEventListeners() {
            // this.apiManager.on('error', this.handleError); // Assuming APIManager has an 'on' method
            // this.commandProcessor.on('error', this.handleError); // Assuming CommandProcessor has an 'on' method

            // In AgentCore's setupEventListeners
            window.addEventListener('ui:zipFileUploaded', async (event) => {
                if (event.detail && event.detail.file) {
                    await this.handleZipFile(event.detail.file);
                }
            });


            setInterval(() => {
                this.saveContext();
            }, 60000);

            this.on('settingsChanged', () => {
                this.saveSettings();
            });
        }

        async handleError(error, context = {}) {
            this.logger.error('🚨 Agent error:', error, context); // Added context to log
            await this.errorHandler.handleError(error, 'agent_core', context);
        }

        generateTaskId() {
            return `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        }

        generateStepId() {
            return `step_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        }

        emit(eventName, data) {
            const event = new CustomEvent(`agent:${eventName}`, {
                detail: data
            });
            if (typeof window !== 'undefined') {
                window.dispatchEvent(event);
            }
            this.logger.debug(`📡 Event emitted: ${eventName}`, data); // Use debug for this
        }

        on(eventName, callback) {
            if (typeof window !== 'undefined') {
                window.addEventListener(`agent:${eventName}`, (event) => {
                    callback(event.detail);
                });
            }
        }

        getStatus() {
            return {
                isInitialized: this.isInitialized,
                isActive: this.isActive,
                currentTask: this.currentTask,
                queueLength: this.taskQueue.length,
                capabilities: Array.from(this.capabilities),
                uptime: (Date.now() - this.startTime) / 1000, // uptime in seconds
                currentZipFile: this.currentZipFile ? this.currentZipFile.name : null
            };
        }

        async cleanup() {
            try {
                this.logger.info('🧹 Cleaning up Agent Core...');
                await this.cancelCurrentTask();
                await this.saveContext();
                await this.saveSettings();
                // await this.apiManager.cleanup(); // Assuming method exists
                // await this.commandProcessor.cleanup(); // Assuming method exists
                // await this.errorHandler.cleanup(); // Assuming method exists
                this.logger.info('✅ Agent Core cleanup completed');
            } catch (error) {
                this.logger.error('Error during cleanup:', error);
            }
        }
    }

    // Export singleton instance
    // export const agentCore = new AgentCore(); // Commented out for now, might be better to instantiate in main.js
    // export default agentCore; // Default export class instead of instance
    export default AgentCore;
