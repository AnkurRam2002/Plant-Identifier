'use client';

import { useState } from 'react';
import Image from 'next/image';
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY;

if (!API_KEY) {
  console.error('NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY is not set');
}

const genAI = new GoogleGenerativeAI(API_KEY || '');

interface PlantInfo {
  name: string;
  alternativeName: string | null;
  scientificName: string;
  description: string;
}

export default function PlantIdentifier() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [plantInfo, setPlantInfo] = useState<PlantInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      identifyPlant(file);
    }
  };

  const identifyPlant = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const imageData = await file.arrayBuffer();
      const image = {
        inlineData: {
          data: Buffer.from(imageData).toString('base64'),
          mimeType: file.type
        }
      };

      const prompt = `
        Identify the plant in this image and provide the following information:
        1. Common Name: [Primary name of the plant]
        2. Alternative Name: [Another common name, if applicable. If none, write "None"]
        3. Scientific Name: [Botanical name of the plant]
        4. Description: [A brief description of the plant's appearance, characteristics, and care requirements]

        Please format your response exactly as follows:
        Common Name: [Answer]
        Alternative Name: [Answer]
        Scientific Name: [Answer]
        Description: [Answer]
      `;

      const result = await model.generateContent([prompt, image]);

      const response = await result.response;
      const text = response.text();

      // Parse the response
      const parsedInfo = parseResponse(text);
      setPlantInfo(parsedInfo);
    } catch (error) {
      console.error('Error identifying plant:', error);
      setError(`Error identifying plant: ${error instanceof Error ? error.message : String(error)}`);
      setPlantInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const parseResponse = (text: string): PlantInfo => {
    const lines = text.split('\n');
    const info: Partial<PlantInfo> = {};

    lines.forEach(line => {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      switch (key.trim()) {
        case 'Common Name':
          info.name = value;
          break;
        case 'Alternative Name':
          info.alternativeName = value !== 'None' ? value : null;
          break;
        case 'Scientific Name':
          info.scientificName = value;
          break;
        case 'Description':
          info.description = value;
          break;
      }
    });

    return info as PlantInfo;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-3xl font-extrabold text-gray-900 text-center mb-6">Plant Sage</h1>
          <p className="text-center text-gray-600 mb-8">Upload a plant image and let AI identify it for you</p>
          
          <div className="mb-6">
            <label htmlFor="imageUpload" className="block text-sm font-medium text-gray-700 mb-2">
              Choose an image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="imageUpload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                    <span>Upload a file</span>
                    <input id="imageUpload" name="imageUpload" type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
          </div>

          {selectedImage && (
            <div className="mb-6">
              <Image
                src={URL.createObjectURL(selectedImage)}
                alt="Selected plant"
                width={300}
                height={300}
                className="rounded-lg object-cover w-full h-64"
              />
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center space-x-2 animate-pulse">
              <div className="w-8 h-8 bg-indigo-500 rounded-full"></div>
              <div className="w-8 h-8 bg-indigo-500 rounded-full"></div>
              <div className="w-8 h-8 bg-indigo-500 rounded-full"></div>
            </div>
          )}

          {error && <p className="text-center text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}

          {plantInfo && (
            <div className="bg-green-50 rounded-lg p-6 shadow-inner">
              <h2 className="text-2xl font-bold text-green-800 mb-2">{plantInfo.name}</h2>
              <p className="text-md italic text-gray-600 mb-4">{plantInfo.scientificName}</p>
              <p className="text-gray-700 leading-relaxed">{plantInfo.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}