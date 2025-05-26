// Core agent logic
// import ApiManager from './api-manager.js';
// import CommandProcessor from './command-processor.js';

export class AgentCore {
    constructor() {
        // this.apiManager = new ApiManager();
        // this.commandProcessor = new CommandProcessor(this.apiManager);
        console.log('AgentCore initialized');
    }

    async processUserCommand(command) {
        console.log(`AgentCore received command: ${command}`);
        // return this.commandProcessor.execute(command);
        return `AgentCore processed: ${command}`; // Placeholder
    }
}

export default AgentCore;
