// Manages the command terminal display
export class CommandTerminal {
    constructor(terminalId) {
        this.terminal = document.getElementById(terminalId);
        console.log('CommandTerminal initialized');
    }

    log(message, type = 'info') {
        // type: 'info', 'error', 'success', 'system'
        console.log(`CommandTerminal (${type}): ${message}`);
    }
}
export default CommandTerminal;
