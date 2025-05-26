// Manages the chat interface elements and interactions
export class ChatInterface {
    constructor(chatContainerId, messageDisplayId, userInputId, sendBtnId) {
        this.chatContainer = document.getElementById(chatContainerId);
        this.messageDisplay = document.getElementById(messageDisplayId);
        this.userInput = document.getElementById(userInputId);
        this.sendBtn = document.getElementById(sendBtnId);
        console.log('ChatInterface initialized');
        // this.initEventListeners();
    }

    addMessage(sender, text, type = 'text') {
        // sender: 'user' or 'agent'
        // type: 'text', 'html', 'error'
        console.log(`ChatInterface: Adding ${sender} message - ${text.substring(0,50)}...`);
    }
}
export default ChatInterface;
