// src/utils/zip-processor.js
// const Logger = console; // Assuming Logger placeholder if not fully implemented

export class ZipProcessor {
    constructor() {
        // Using global console as Logger placeholder for now
        this.logger = console;
        if (typeof JSZip === 'undefined') {
            this.logger.error('JSZip library is not loaded!');
            throw new Error('JSZip library not found. Please ensure it is included.');
        }
        this.zip = null;
        this.fileData = new Map(); // To store file content string
        this.fileList = [];
    }

    async loadZip(file) {
        this.logger.info(`Loading ZIP file: ${file.name}`);
        try {
            this.zip = await JSZip.loadAsync(file);
            this.fileList = [];
            this.fileData.clear(); // Clear previous zip data

            const promises = [];
            this.zip.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir) {
                    this.fileList.push({
                        name: zipEntry.name,
                        size: zipEntry._data?.uncompressedSize || 0, // Approximate size
                        // type: 'file' // Could add more details later
                    });
                    // Only try to read text for known text-based extensions initially
                    if (this.isTextBased(zipEntry.name)) {
                        promises.push(
                            zipEntry.async('string').then(content => {
                                this.fileData.set(zipEntry.name, content);
                            }).catch(err => {
                                this.logger.warn(`Could not read ${zipEntry.name} as text:`, err.message);
                                // Store a placeholder or error for non-text or problematic files
                                this.fileData.set(zipEntry.name, `[Error reading file: ${err.message}]`);
                            })
                        );
                    } else {
                        // For non-text files, just list them, don't try to read content as string
                        this.fileData.set(zipEntry.name, '[Binary or non-text file]');
                    }
                }
            });
            await Promise.all(promises);
            this.logger.info(`ZIP file loaded and ${this.fileList.length} files cataloged.`);
            return { success: true, fileName: file.name, fileCount: this.fileList.length };
        } catch (error) {
            this.logger.error('Error loading ZIP file:', error);
            this.zip = null;
            this.fileList = [];
            this.fileData.clear();
            throw error; // Re-throw for AgentCore to handle
        }
    }

    isTextBased(fileName) {
        const textExtensions = ['.txt', '.js', '.json', '.html', '.css', '.md', '.xml', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.rb', '.php', '.sh', '.yaml', '.yml', '.log'];
        return textExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
    }

    listFiles() {
        if (!this.zip) {
            this.logger.warn('No ZIP file loaded to list files from.');
            return [];
        }
        return this.fileList; // Return the pre-processed list
    }

    async getFileContent(filePath) {
        if (!this.zip) {
            this.logger.warn('No ZIP file loaded to get file content from.');
            return null;
        }
        if (this.fileData.has(filePath)) {
            const content = this.fileData.get(filePath);
            if (content.startsWith('[Error reading file:') || content === '[Binary or non-text file]') {
                this.logger.warn(`Cannot provide text content for ${filePath}: ${content}`);
                return content; // Return the placeholder/error string
            }
            return content;
        }
        this.logger.warn(`File not found in ZIP or not pre-read as text: ${filePath}`);
        return null;
    }

    getZipInstance() {
        return this.zip;
    }
}

export default ZipProcessor;
