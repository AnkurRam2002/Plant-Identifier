'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { GoogleGenerativeAI } from '@google/generative-ai';
import CameraCapture from './CameraCapture';

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
  const [showCamera, setShowCamera] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      identifyPlant(file);
    }
  };

  const handleCameraCapture = (imageBlob: Blob) => {
    const file = new File([imageBlob], "camera_capture.jpg", { type: "image/jpeg" });
    setSelectedImage(file);
    identifyPlant(file);
    setShowCamera(false);
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
          <p className="text-center text-gray-600 mb-8">Upload or capture a plant image and let AI identify it for you</p>
          
          <div className="mb-6">
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Upload Image
              </button>
              <button
                onClick={() => setShowCamera(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Take Photo
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {showCamera && (
            <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
          )}

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