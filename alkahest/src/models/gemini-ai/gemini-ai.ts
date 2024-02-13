const { GoogleGenerativeAI } = require("@google/generative-ai");

export default class GeminiAI {
    private ggenai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    private ggenmodel: any;

    constructor(modelName: string = "gemini-pro") {
        this.ggenmodel = this.ggenai.getGenerativeModel({ model: modelName });
    }

    async request(prompt: string, ...args: any[]): Promise<string> {
        args.forEach((arg) => prompt.concat(arg.toString().concat(" ")));
        const response = await this.ggenmodel.generateContent(prompt);

        return response.response.text();
    }
}