/**
     * معالج الأوامر الذكي
     * قادر على فهم وتحليل وتنفيذ الأوامر المعقدة
     */

    // import { Logger } from '../utils/logger.js';
    import { CONFIG } from '../utils/config.js';

    const Logger = console; // Placeholder
    const Storage = class { async get() {} async set() {} }; // Placeholder


    export class CommandProcessor {
        constructor(apiManager) { // Added apiManager from previous agent-core update
            this.logger = Logger; // Use placeholder Logger
            this.apiManager = apiManager; // Store apiManager
            this.commandHistory = [];
            this.commandPatterns = new Map();
            this.executionStrategies = new Map();
            this.contextMemory = new Map();
            this.storage = new Storage(); // Instantiate placeholder Storage


            // Initialize command patterns
            this.initializeCommandPatterns();

            // Initialize execution strategies
            this.initializeExecutionStrategies();

            this.logger.info('🧠 Command Processor initialized');
        }

        /**
         * تهيئة معالج الأوامر
         */
        async initialize() {
            try {
                this.logger.info('🚀 Initializing Command Processor...');

                // Load command history
                await this.loadCommandHistory();

                // Setup command learning
                this.setupCommandLearning();

                this.logger.info('✅ Command Processor initialized successfully'); // Changed from success

            } catch (error) {
                this.logger.error('❌ Failed to initialize Command Processor:', error);
                throw error;
            }
        }

        /**
         * تحليل الأمر
         */
        async analyzeCommand(userInput) {
            try {
                this.logger.info('🔍 Analyzing command:', userInput);

                // Clean and normalize input
                const normalizedInput = this.normalizeInput(userInput);

                // Detect language
                const language = this.detectLanguage(normalizedInput);

                // Extract intent and entities
                const intent = await this.extractIntent(normalizedInput);
                const entities = await this.extractEntities(normalizedInput);

                // Determine command type
                const commandType = this.determineCommandType(intent, entities);

                // Extract parameters
                const parameters = await this.extractParameters(normalizedInput, commandType);

                // Build analysis result
                const analysis = {
                    originalInput: userInput,
                    normalizedInput: normalizedInput,
                    language: language,
                    intent: intent,
                    entities: entities,
                    type: commandType,
                    parameters: parameters,
                    confidence: this.calculateConfidence(intent, entities, commandType),
                    timestamp: new Date()
                };

                // Store in history
                this.commandHistory.push(analysis);

                // Update context memory
                this.updateContextMemory(analysis);

                this.logger.info('✅ Command analysis completed'); // Changed from success

                return analysis;

            } catch (error) {
                this.logger.error('❌ Error analyzing command:', error);
                throw error;
            }
        }

        /**
         * توليد خطة التنفيذ
         */
        async generateExecutionPlan(analysis) {
            try {
                this.logger.info('📋 Generating execution plan for:', analysis.type);

                const strategy = this.executionStrategies.get(analysis.type);
                if (!strategy) {
                    // Fallback for general query if no specific strategy
                    if (analysis.type === 'general_query' && !this.executionStrategies.has('general_query')) {
                        this.executionStrategies.set('general_query', {
                            generateSteps: async (analysis) => [{
                                id: 'general_ai_query',
                                type: 'api_call', // Or a specific 'ai_query' type
                                description: 'معالجة الاستعلام العام بواسطة الذكاء الاصطناعي',
                                parameters: {
                                    message: analysis.originalInput, // Send original input to AI
                                    // model: analysis.parameters.model || CONFIG.API.GEMINI.DEFAULT_MODEL
                                },
                                critical: true
                            }]
                        });
                        const generalStrategy = this.executionStrategies.get('general_query');
                        const steps = await generalStrategy.generateSteps(analysis);
                        const plan = {
                            id: this.generatePlanId(),
                            commandAnalysis: analysis,
                            steps: steps,
                            estimatedDuration: this.estimateExecutionTime(steps),
                            dependencies: this.identifyDependencies(steps),
                            fallbackOptions: this.generateFallbackOptions(analysis),
                            createdAt: new Date()
                        };
                        this.logger.info(`✅ General query execution plan generated with ${plan.steps.length} steps`);
                        return plan;

                    } else {
                         throw new Error(`No execution strategy found for command type: ${analysis.type}`);
                    }
                }


                // Generate steps based on command type
                const steps = await strategy.generateSteps(analysis);

                // Add context from previous commands
                const contextualSteps = this.addContextualSteps(steps, analysis);

                // Optimize execution order
                const optimizedSteps = this.optimizeExecutionOrder(contextualSteps);

                // Build execution plan
                const plan = {
                    id: this.generatePlanId(),
                    commandAnalysis: analysis,
                    steps: optimizedSteps,
                    estimatedDuration: this.estimateExecutionTime(optimizedSteps),
                    dependencies: this.identifyDependencies(optimizedSteps),
                    fallbackOptions: this.generateFallbackOptions(analysis),
                    createdAt: new Date()
                };

                this.logger.info(`✅ Execution plan generated with ${plan.steps.length} steps`); // Changed from success

                return plan;

            } catch (error) {
                this.logger.error('❌ Error generating execution plan:', error);
                throw error;
            }
        }

        /**
         * تنفيذ الخطة
         */
        async executePlan(plan, task) {
            try {
                this.logger.info('⚡ Executing plan:', plan.id);

                const results = [];
                let currentContext = { ...(plan.commandAnalysis.parameters || {}) };


                for (let i = 0; i < plan.steps.length; i++) {
                    const step = plan.steps[i];

                    try {
                        this.logger.info(`📋 Executing step ${i + 1}/${plan.steps.length}: ${step.description}`);

                        // Update task step
                        if (task) {
                            task.steps = task.steps || [];
                            task.steps.push({
                                id: step.id || `step_${i}`, // Ensure step has an id
                                description: step.description,
                                status: 'executing',
                                timestamp: new Date()
                            });
                            this.emit('stepStarted', { task, step: task.steps[task.steps.length -1] });
                        }


                        // Execute step
                        const stepResult = await this.executeStep(step, currentContext);

                        // Update context with result
                        currentContext = { ...currentContext, ...(stepResult.context || {}) };


                        // Store result
                        results.push({
                            stepId: step.id || `step_${i}`,
                            result: stepResult.data,
                            context: stepResult.context,
                            executionTime: stepResult.executionTime
                        });

                        // Update task step status
                        if (task) {
                            const taskStep = task.steps.find(s => s.id === (step.id || `step_${i}`));
                            if (taskStep) {
                                taskStep.status = 'completed';
                                taskStep.result = stepResult.data;
                                taskStep.completedAt = new Date();
                            }
                            this.emit('stepCompleted', { task, step: taskStep, result: stepResult });
                        }


                        this.logger.info(`✅ Step ${i + 1} completed successfully`); // Changed from success

                    } catch (stepError) {
                        this.logger.error(`❌ Step ${i + 1} failed:`, stepError);

                        if (task) {
                            const taskStep = task.steps.find(s => s.id === (step.id || `step_${i}`));
                            if (taskStep) {
                                taskStep.status = 'failed';
                                taskStep.error = stepError.message;
                                taskStep.failedAt = new Date();
                            }
                            this.emit('stepFailed', { task, step: taskStep, error: stepError });
                        }


                        if (step.fallback) {
                            this.logger.info('🔄 Trying fallback option...');
                            try {
                                const fallbackResult = await this.executeStep(step.fallback, currentContext);
                                results.push({
                                    stepId: step.id || `step_${i}`,
                                    result: fallbackResult.data,
                                    context: fallbackResult.context,
                                    executionTime: fallbackResult.executionTime,
                                    usedFallback: true
                                });
                                continue;
                            } catch (fallbackError) {
                                this.logger.error('❌ Fallback also failed:', fallbackError);
                            }
                        }

                        if (step.critical) {
                            throw new Error(`Critical step failed: ${stepError.message}`);
                        }

                        results.push({
                            stepId: step.id || `step_${i}`,
                            error: stepError.message,
                            skipped: true
                        });
                    }
                }

                const finalResult = this.compileFinalResult(results, plan);
                this.logger.info('✅ Plan execution completed successfully'); // Changed from success
                return finalResult;

            } catch (error) {
                this.logger.error('❌ Error executing plan:', error);
                throw error;
            }
        }

        async executeStep(step, context) {
            const startTime = performance.now();
            try {
                let result;
                switch (step.type) {
                    case 'web_search': result = await this.executeWebSearch(step, context); break;
                    case 'code_generation': result = await this.executeCodeGeneration(step, context); break;
                    case 'data_analysis': result = await this.executeDataAnalysis(step, context); break;
                    case 'file_operation': result = await this.executeFileOperation(step, context); break;
                    case 'api_call': result = await this.executeApiCall(step, context); break;
                    case 'text_processing': result = await this.executeTextProcessing(step, context); break;
                    default: throw new Error(`Unknown step type: ${step.type}`);
                }
                const endTime = performance.now();
                return {
                    data: result.data,
                    context: result.context || {},
                    executionTime: endTime - startTime
                };
            } catch (error) {
                // const endTime = performance.now(); // endTime not used here
                throw new Error(`Step execution failed: ${error.message}`);
            }
        }

        async executeWebSearch(step, context) {
            try {
                const { query, maxResults = 5 } = step.parameters;
                const searchResults = await this.apiManager.sendRequest({ // Use ApiManager
                    message: `Search web for: ${query}. Provide up to ${maxResults} results.`,
                    model: CONFIG.API.GEMINI.FLASH // Use a fast model for search queries
                });
                // This assumes sendRequest returns a structured list of results.
                // You'll need to adapt this based on actual APIManager output.
                // For now, let's simulate based on the old simulateWebSearch.
                const simulatedResults = (await this.simulateWebSearch(query, maxResults)).map(r => ({
                    title: r.title, url: r.url, snippet: r.snippet, source: r.source
                }));


                return {
                    data: { query: query, results: simulatedResults, totalResults: simulatedResults.length },
                    context: { lastSearchQuery: query, searchResults: simulatedResults }
                };
            } catch (error) {
                throw new Error(`Web search failed: ${error.message}`);
            }
        }

        async executeCodeGeneration(step, context) {
            try {
                const { language = 'javascript', description, framework = 'vanilla' } = step.parameters;
                const codeResult = await this.generateCode(language, description, framework); // Uses local generateCode
                return {
                    data: { ...codeResult, language, framework },
                    context: { lastGeneratedCode: codeResult.code, codeLanguage: language }
                };
            } catch (error) {
                throw new Error(`Code generation failed: ${error.message}`);
            }
        }

        async executeDataAnalysis(step, context) {
             try {
                const { data, analysisType } = step.parameters;
                const analysisResult = await this.analyzeData(data, analysisType); // Uses local analyzeData
                return {
                    data: analysisResult, // analyzeData returns the full object
                    context: { lastAnalysis: analysisResult.analysis, dataType: typeof data }
                };
            } catch (error) {
                throw new Error(`Data analysis failed: ${error.message}`);
            }
        }

        async executeFileOperation(step, context) {
            try {
                const { operation, fileName, content } = step.parameters;
                let result;
                // Placeholder for file operations - these would interact with a FileSystem API or similar
                switch (operation) {
                    case 'create': result = `File ${fileName} created.`; break;
                    case 'read': result = `Content of ${fileName}.`; break;
                    case 'update': result = `File ${fileName} updated.`; break;
                    case 'delete': result = `File ${fileName} deleted.`; break;
                    default: throw new Error(`Unknown file operation: ${operation}`);
                }
                this.logger.info(`File operation "${operation}" on "${fileName}" simulated.`);
                return {
                    data: { status: 'success', message: result },
                    context: { lastFileOperation: operation, lastFileName: fileName }
                };
            } catch (error) {
                throw new Error(`File operation failed: ${error.message}`);
            }
        }

        async executeApiCall(step, context) {
            try {
                const { url, method = 'GET', headers = {}, body } = step.parameters;
                 // Use APIManager for external API calls if it's a general purpose one,
                 // or handle specific AI calls if this is an internal AI step.
                 // This example assumes it's a general external API call.
                const response = await fetch(url, {
                    method: method,
                    headers: headers,
                    body: body ? JSON.stringify(body) : undefined
                });
                if (!response.ok) throw new Error(`API call failed: ${response.status} ${response.statusText}`);
                const data = await response.json();
                return {
                    data: { response: data, status: response.status, headers: Object.fromEntries(response.headers.entries()) },
                    context: { lastApiCall: url, lastApiResponse: data }
                };
            } catch (error) {
                throw new Error(`API call failed: ${error.message}`);
            }
        }

        async executeTextProcessing(step, context) {
            try {
                const { text, operation } = step.parameters;
                let result;
                 // These would ideally use the AI via apiManager
                const promptBase = `Perform text operation "${operation}" on the following text: "${text}". `;
                let specificPrompt = promptBase;

                switch (operation) {
                    case 'summarize': specificPrompt += "Provide a concise summary."; break;
                    case 'translate': specificPrompt += `Translate to ${step.parameters.targetLanguage || 'English'}.`; break;
                    case 'analyze_sentiment': specificPrompt += "Analyze sentiment (positive, negative, neutral)."; break;
                    case 'extract_keywords': specificPrompt += "Extract key terms."; break;
                    default: throw new Error(`Unknown text operation: ${operation}`);
                }
                const aiResponse = await this.apiManager.sendRequest({ message: specificPrompt });
                result = aiResponse.content; // Assuming AI returns processed text directly

                return {
                    data: { result }, // Ensure data is an object
                    context: { lastTextOperation: operation, processedText: text.substring(0, 100) + '...' }
                };
            } catch (error) {
                throw new Error(`Text processing failed: ${error.message}`);
            }
        }


        initializeCommandPatterns() {
            this.commandPatterns.set('code_generation', [ /اكتب\s+(.*?)\s+ب(.*)/i, /اصنع\s+(.*?)\s+موقع/i, /create\s+(.*?)\s+website/i, /write\s+(.*?)\s+code/i, /build\s+(.*?)\s+app/i ]);
            this.commandPatterns.set('web_search', [ /ابحث\s+عن\s+(.*)/i, /search\s+for\s+(.*)/i, /find\s+(.*)/i, /lookup\s+(.*)/i ]);
            this.commandPatterns.set('data_analysis', [ /حلل\s+(.*)/i, /analyze\s+(.*)/i, /examine\s+(.*)/i, /study\s+(.*)/i ]);
            this.commandPatterns.set('file_operation', [ /اقرأ\s+ملف\s+(.*)/i, /read\s+file\s+(.*)/i, /create\s+file\s+(.*)/i, /اكتب\s+ملف\s+(.*)/i ]);
            this.logger.info('📋 Command patterns initialized');
        }

        initializeExecutionStrategies() {
            this.executionStrategies.set('code_generation', {
                generateSteps: async (analysis) => [
                    { id: 'analyze_req', type: 'text_processing', description: 'تحليل متطلبات المشروع', parameters: { text: analysis.originalInput, operation: 'analyze_requirements' }, critical: true },
                    { id: 'generate_code', type: 'code_generation', description: 'توليد الكود البرمجي', parameters: { language: analysis.parameters?.language || 'javascript', description: analysis.parameters?.description, framework: analysis.parameters?.framework }, critical: true },
                    { id: 'create_files', type: 'file_operation', description: 'إنشاء ملفات المشروع', parameters: { operation: 'create_project' }, critical: false }
                ]
            });
            this.executionStrategies.set('web_search', {
                generateSteps: async (analysis) => [
                    { id: 'perform_search', type: 'web_search', description: 'البحث في الإنترنت', parameters: { query: analysis.parameters?.query, maxResults: analysis.parameters?.maxResults || 5 }, critical: true },
                    { id: 'analyze_results', type: 'text_processing', description: 'تحليل نتائج البحث', parameters: { operation: 'summarize_search_results' }, critical: false }
                ]
            });
            this.logger.info('⚙️ Execution strategies initialized');
        }

        normalizeInput(input) { return input.trim().replace(/\s+/g, ' ').replace(/[^\w\s؀-ۿ]/g, ' ').toLowerCase(); }
        detectLanguage(text) { return /[؀-ۿ]/.test(text) ? 'arabic' : 'english'; }

        async extractIntent(text) {
            const intents = { create: ['اكتب', 'اصنع', 'انشئ', 'create', 'make', 'build', 'write'], search: ['ابحث', 'ابحث عن', 'search', 'find', 'lookup'], analyze: ['حلل', 'analyze', 'examine', 'study'], read: ['اقرأ', 'read', 'show', 'display'], help: ['مساعدة', 'help', 'assist'] };
            for (const [intent, keywords] of Object.entries(intents)) { if (keywords.some(keyword => text.includes(keyword))) return intent; }
            return 'general';
        }

        async extractEntities(text) {
            const entities = {};
            const languages = ['javascript', 'python', 'html', 'css', 'react', 'vue', 'angular'];
            for (const lang of languages) { if (text.includes(lang)) { entities.language = lang; break; } }
            const fileTypes = ['موقع', 'website', 'app', 'تطبيق', 'صفحة', 'page'];
            for (const type of fileTypes) { if (text.includes(type)) { entities.projectType = type; break; } }
            return entities;
        }

        determineCommandType(intent, entities) {
            if (intent === 'create' && (entities.language || entities.projectType)) return 'code_generation';
            if (intent === 'search') return 'web_search';
            if (intent === 'analyze') return 'data_analysis';
            if (intent === 'read') return 'file_operation';
            return 'general_query';
        }

        async extractParameters(text, commandType) {
            const parameters = {};
            switch (commandType) {
                case 'code_generation': parameters.description = text; parameters.language = this.extractLanguage(text); parameters.framework = this.extractFramework(text); break;
                case 'web_search': parameters.query = this.extractSearchQuery(text); parameters.maxResults = 5; break;
                case 'data_analysis': parameters.dataSource = this.extractDataSource(text); parameters.analysisType = this.extractAnalysisType(text); break;
            }
            return parameters;
        }
        extractLanguage(text) {
            const languages = { javascript: ['javascript', 'js', 'جافاسكريبت'], python: ['python', 'py', 'بايثون'], html: ['html', 'اتش تي ام ال'], css: ['css', 'سي اس اس'], react: ['react', 'ريأكت'], vue: ['vue', 'فيو'], angular: ['angular', 'انجولار'] };
            for (const [lang, keywords] of Object.entries(languages)) { if (keywords.some(keyword => text.toLowerCase().includes(keyword))) return lang; }
            return 'javascript';
        }
        extractFramework(text) {
            const frameworks = { react: ['react', 'ريأكت'], vue: ['vue', 'فيو'], angular: ['angular', 'انجولار'], vanilla: ['vanilla', 'عادي', 'بسيط'] };
            for (const [framework, keywords] of Object.entries(frameworks)) { if (keywords.some(keyword => text.toLowerCase().includes(keyword))) return framework; }
            return 'vanilla';
        }
        extractSearchQuery(text) {
            const searchKeywords = ['ابحث عن', 'ابحث', 'search for', 'search', 'find', 'lookup'];
            let query = text;
            for (const keyword of searchKeywords) { query = query.replace(new RegExp(keyword, 'gi'), '').trim(); }
            return query;
        }
        // Added placeholder for missing methods from extractParameters
        extractDataSource(text) { this.logger.warn("extractDataSource is a placeholder"); return "default_source"; }
        extractAnalysisType(text) { this.logger.warn("extractAnalysisType is a placeholder"); return "default_analysis"; }

        // Added placeholder for missing methods from executeStep
        async analyzeData(data, analysisType) { this.logger.warn("analyzeData is a placeholder"); return { analysis: "analysis_result", insights: [], summary: "summary" }; }
        async createFile(fileName, content) { this.logger.warn("createFile is a placeholder"); return { success: true, fileName }; }
        async readFile(fileName) { this.logger.warn("readFile is a placeholder"); return { success: true, content: "file_content" }; }
        async updateFile(fileName, content) { this.logger.warn("updateFile is a placeholder"); return { success: true, fileName }; }
        async deleteFile(fileName) { this.logger.warn("deleteFile is a placeholder"); return { success: true, fileName }; }
        async summarizeText(text) { this.logger.warn("summarizeText is a placeholder"); return "summary"; }
        async translateText(text, targetLanguage) { this.logger.warn("translateText is a placeholder"); return "translated_text"; }
        async analyzeSentiment(text) { this.logger.warn("analyzeSentiment is a placeholder"); return "neutral"; }
        async extractKeywords(text) { this.logger.warn("extractKeywords is a placeholder"); return ["keyword1", "keyword2"]; }


        async simulateWebSearch(query, maxResults) {
            return [{ title: `نتيجة البحث عن: ${query}`, url: `https://example.com/search?q=${encodeURIComponent(query)}`, snippet: `هذه نتيجة محاكاة للبحث عن "${query}".`, source: 'Example.com' }];
        }
        async generateCode(language, description, framework) {
            const templates = { javascript: { vanilla: `// ${description}
console.log('Hello, World!');`, react: `// ${description}
import React from 'react'; function App() { return (<h1>Hello, React!</h1>); } export default App;` }, html: `<!DOCTYPE html><html><head><title>${description}</title></head><body><h1>${description}</h1></body></html>` };
            const template = templates[language]?.[framework] || templates[language]?.vanilla || templates.javascript.vanilla;
            return { code: template, explanation: `تم إنشاء كود ${language} للمشروع: ${description}`, files: [{ name: language === 'html' ? 'index.html' : `main.${language === 'javascript' ? 'js' : language}`, content: template, type: language }] };
        }

        calculateConfidence(intent, entities, commandType) {
            let confidence = 0.5;
            if (intent !== 'general') confidence += 0.2;
            if (Object.keys(entities).length > 0) confidence += 0.2;
            if (commandType !== 'general_query') confidence += 0.1;
            return Math.min(confidence, 1.0);
        }
        updateContextMemory(analysis) {
            const key = `context_${Date.now()}`; this.contextMemory.set(key, { type: analysis.type, intent: analysis.intent, entities: analysis.entities, timestamp: analysis.timestamp });
            if (this.contextMemory.size > 50) { const firstKey = this.contextMemory.keys().next().value; this.contextMemory.delete(firstKey); }
        }
        addContextualSteps(steps, analysis) {
            const recentContexts = Array.from(this.contextMemory.values()).slice(-5).filter(ctx => ctx.type === analysis.type);
            if (recentContexts.length > 0) { steps.unshift({ id: 'context_opt', type: 'optimization', description: 'تحسين بناءً على الأوامر السابقة', parameters: { previousContexts: recentContexts }, critical: false }); }
            return steps;
        }
        optimizeExecutionOrder(steps) { return steps.sort((a, b) => { if (a.critical && !b.critical) return -1; if (!a.critical && b.critical) return 1; return 0; }); }
        estimateExecutionTime(steps) { const estimates = { 'text_processing': 2000, 'code_generation': 5000, 'web_search': 3000, 'file_operation': 1000, 'api_call': 2000, 'data_analysis': 4000 }; return steps.reduce((total, step) => total + (estimates[step.type] || 2000), 0); }
        identifyDependencies(steps) {
            const dependencies = [];
            for (let i = 0; i < steps.length; i++) {
                const step = steps[i]; const deps = [];
                for (let j = 0; j < i; j++) { const prevStep = steps[j]; if (this.stepDependsOn(step, prevStep)) deps.push(prevStep.id); }
                if (deps.length > 0) dependencies.push({ stepId: step.id, dependsOn: deps });
            }
            return dependencies;
        }
        stepDependsOn(step, prevStep) {
            if (step.type === 'file_operation' && prevStep.type === 'code_generation') return true;
            if (step.type === 'data_analysis' && prevStep.type === 'web_search') return true;
            return false;
        }
        generateFallbackOptions(analysis) {
            const fallbacks = [];
            switch (analysis.type) {
                case 'code_generation': fallbacks.push({ type: 'simplified_generation', description: 'توليد كود مبسط', parameters: { ...analysis.parameters, simplified: true } }); break;
                case 'web_search': fallbacks.push({ type: 'cached_search', description: 'البحث في النتائج المحفوظة', parameters: { ...analysis.parameters, useCache: true } }); break;
            }
            return fallbacks;
        }
        compileFinalResult(results, plan) {
            const successfulResults = results.filter(r => !r.error && !r.skipped); const failedResults = results.filter(r => r.error); const skippedResults = results.filter(r => r.skipped);
            return { planId: plan.id, commandType: plan.commandAnalysis.type, success: failedResults.length === 0, results: successfulResults, failures: failedResults, skipped: skippedResults, executionSummary: { totalSteps: results.length, successfulSteps: successfulResults.length, failedSteps: failedResults.length, skippedSteps: skippedResults.length, totalExecutionTime: successfulResults.reduce((total, r) => total + (r.executionTime || 0), 0) }, finalOutput: this.generateFinalOutput(successfulResults, plan.commandAnalysis.type) };
        }
        generateFinalOutput(results, commandType) {
            switch (commandType) {
                case 'code_generation': const codeResults = results.filter(r => r.result && r.result.code); if (codeResults.length > 0) return { type: 'code', ...codeResults[0].result }; break;
                case 'web_search': const searchResults = results.filter(r => r.result && r.result.results); if (searchResults.length > 0) return { type: 'search', ...searchResults[0].result }; break;
            }
            return { type: 'general', message: 'تم تنفيذ الأمر بنجاح', details: results };
        }
        generatePlanId() { return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`; }
        async loadCommandHistory() { try { const history = await this.storage?.get('command_history'); if (history) { this.commandHistory = history; this.logger.info(`📥 Loaded ${history.length} commands from history`); } } catch (error) { this.logger.error('Error loading command history:', error); } }
        async saveCommandHistory() { try { await this.storage?.set('command_history', this.commandHistory.slice(-100)); this.logger.debug('💾 Command history saved'); } catch (error) { this.logger.error('Error saving command history:', error); } }
        setupCommandLearning() { setInterval(() => { this.saveCommandHistory(); }, 300000); }
        emit(eventName, data) { const event = new CustomEvent(`command:${eventName}`, { detail: data }); if (typeof window !== 'undefined') window.dispatchEvent(event); this.logger.debug(`📡 Event emitted: ${eventName}`); }
        async cleanup() { try { this.logger.info('🧹 Cleaning up Command Processor...'); await this.saveCommandHistory(); this.commandHistory = []; this.contextMemory.clear(); this.logger.info('✅ Command Processor cleanup completed'); } catch (error) { this.logger.error('Error during cleanup:', error); } }
    }
    export default CommandProcessor;
