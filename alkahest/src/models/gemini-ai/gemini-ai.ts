import { window } from 'vscode';
const { GoogleGenerativeAI } = require("@google/generative-ai");

export default class GeminiAI {
    private ggenai;
    private ggenmodel;

    constructor(modelName: string = "gemini-pro") {
        try {
            this.ggenai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.ggenmodel = this.ggenai.getGenerativeModel({ model: modelName });
        } catch (error: any) {
            console.error("Error initializing GeminiAI:", error.message);
            window.showInformationMessage("Error initializing GeminiAI");
        }
    }

    async request(prompt: string, ...args: any[]): Promise<string | undefined> {
        try {
            let requestText = `${prompt}${args.join('')}`;
            const response = await this.ggenmodel.generateContent(requestText);
            return response?.response?.text();
        } catch (error: any) {
            console.error("Error generating content:", error.message);
            window.showInformationMessage("Error generating content via GeminiAI");
        }
    }
}
