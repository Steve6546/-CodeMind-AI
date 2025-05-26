// Manages the status indicator UI
export class StatusIndicator {
    constructor(indicatorId) {
        this.indicator = document.getElementById(indicatorId);
        console.log('StatusIndicator initialized');
    }

    setStatus(status) { // 'online', 'offline', 'busy'
        console.log(`StatusIndicator: Setting status to ${status}`);
    }
}
export default StatusIndicator;
