// Processes user commands and orchestrates actions
// import { AgentCore } from './agent-core.js'; // If needed for circular dependency or specific tasks

export class CommandProcessor {
    constructor(apiManager) {
        this.apiManager = apiManager;
        console.log('CommandProcessor initialized');
    }

    async execute(command) {
        console.log(`CommandProcessor executing: ${command}`);
        // Basic command parsing and execution logic will go here
        // Example:
        if (command.toLowerCase().startsWith("search ")) {
            const searchTerm = command.substring(7);
            return this.apiManager.callGemini(`Search for: ${searchTerm}`);
        }
        return this.apiManager.callGemini(`Process command: ${command}`);
    }
}
export default CommandProcessor;
