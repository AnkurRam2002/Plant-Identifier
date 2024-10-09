'use client';

import { useState, useRef, useCallback } from 'react';
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [plantInfo, setPlantInfo] = useState<PlantInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
      identifyPlant(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please make sure you've granted the necessary permissions.");
    }
  };

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageDataUrl = canvasRef.current.toDataURL('image/jpeg');
        setSelectedImage(imageDataUrl);
        setShowCamera(false);

        // Stop all video streams
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());

        // Convert data URL to File object
        fetch(imageDataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], "captured_image.jpg", { type: "image/jpeg" });
            identifyPlant(file);
          });
      }
    }
  }, []);

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
          <p className="text-center text-gray-600 mb-8">Upload a plant image or use your camera to identify plants</p>
          
          {!showCamera && (
            <div className="mb-6 space-y-4">
              <button
                onClick={startCamera}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Use Camera
              </button>
              <div className="relative">
                <label htmlFor="imageUpload" className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
                  Upload Image
                </label>
                <input 
                  id="imageUpload" 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="sr-only"
                />
              </div>
            </div>
          )}

          {showCamera && (
            <div className="mb-6">
              <video ref={videoRef} autoPlay className="w-full rounded-lg" />
              <button
                onClick={capturePhoto}
                className="mt-2 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Capture Photo
              </button>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {selectedImage && !showCamera && (
            <div className="mb-6">
              <Image
                src={selectedImage}
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
              {plantInfo.alternativeName && (
                <p className="text-lg text-green-600 mb-2">Also known as: {plantInfo.alternativeName}</p>
              )}
              <p className="text-md italic text-gray-600 mb-4">{plantInfo.scientificName}</p>
              <p className="text-gray-700 leading-relaxed">{plantInfo.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}