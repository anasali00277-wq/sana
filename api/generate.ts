import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { documents, prompt, mode, studentInfo } = req.body as {
    documents: any[];
    prompt: string;
    mode: 'assignment' | 'quiz' | 'chat';
    studentInfo?: any;
  };

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server not configured with GEMINI_API_KEY' });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const combinedContent = (documents || []).map(d => d.content).join(' ');
    const isUrduDetected = /[\u0600-\u06FF]/.test(combinedContent) || /[\u0600-\u06FF]/.test(prompt || '');

    const targetPages = studentInfo?.targetPageCount || 5;
    const selectedAssignmentNo = studentInfo?.assignmentNo || '1';

    let systemInstruction = '';
    if (mode === 'assignment') {
      systemInstruction = `You are a professional academic writer.\nLANGUAGE RULE: If the book/prompt is URDU, reply in formal Pakistani Urdu (Nastaliq). \nVOLUME: Target ~${targetPages} pages; adapt depth accordingly.\nSTRICT: Start directly with the title. Use uploaded book as primary source. Use clear headings.`;
    } else if (mode === 'quiz') {
      systemInstruction = `You are an expert exam solver. If input is URDU, reply in URDU. Provide concise, precise answers.`;
    } else {
      systemInstruction = `You are a helpful study buddy. Use uploaded book content to answer clearly.`;
    }

    const textContent = (documents || [])
      .filter(d => d.type === 'text')
      .map(d => `[BOOK CONTENT]\n${d.content}`)
      .join('\n\n');

    const promptContext = `\nTASK: ${mode.toUpperCase()}\nLANGUAGE: ${isUrduDetected ? 'URDU' : 'ENGLISH'}\nAssignment No: ${selectedAssignmentNo}\nTarget Pages: ${targetPages}\nInstructions: ${prompt || ''}\nCONTEXT:\n${textContent.slice(0, 40000)}\n`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ parts: [{ text: promptContext }] }],
      config: {
        systemInstruction,
        temperature: 0.35,
        thinkingConfig: { thinkingBudget: 8000 },
      },
    });

    const out = response.text ?? '';
    res.status(200).json({ text: out });
  } catch (err) {
    console.error('Server GenAI error:', err);
    res.status(500).json({ error: 'Generation failed', details: String(err) });
  }
}
