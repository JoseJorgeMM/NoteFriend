import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

// IMPORTANT: Replace with your actual Gemini API Key in a .env file for production.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_SIMULATED_GEMINI_API_KEY';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Set a reasonable size limit for audio files
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { audioData } = req.body; // audioData is expected to be a base64 string

      if (!audioData) {
        return res.status(400).json({ error: 'No audio data provided.' });
      }

      // The audioData is a base64 string, typically representing a WebM or WAV audio file.
      // We need to convert it to a suitable format for the Gemini API.
      // For multimodal input, Gemini expects an object with inlineData.
      const audioBuffer = Buffer.from(audioData.split(',')[1], 'base64');
      const mimeType = audioData.split(',')[0].split(':')[1].split(';')[0];


      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Using 1.5-flash as it supports audio

      const result = await model.generateContent([
        {
          inlineData: {
            data: audioBuffer.toString('base64'),
            mimeType: mimeType,
          },
        },
        "Generate professional meeting minutes from this audio recording. Include attendees (if deducible), key discussion points, decisions made, and action items with assigned persons and deadlines.",
      ]);

      const response = await result.response;
      const text = response.text();

      res.status(200).json({ minutes: text });

    } catch (error) {
      console.error('Error processing audio or generating minutes:', error);
      res.status(500).json({ error: 'Failed to generate meeting minutes.' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
