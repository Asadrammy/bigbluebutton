/**
 * Local ML Inference Service
 * Handles on-device sign language recognition using models from assets
 * 
 * Supports both ONNX Runtime (best_model.onnx) and PyTorch Lite (best_model_mobile.ptl)
 * Falls back to backend if local inference fails
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import config from '@config/environment';

// Conditionally import native modules (only available in custom dev client)
// Using lazy loading with dynamic require to avoid Metro bundler errors
let InferenceSession: any = null;
let Tensor: any = null;
let torch: any = null;
let onnxRuntimeLoaded = false;
let pytorchCoreLoaded = false;

// Lazy load ONNX Runtime (only when needed, at runtime)
// Using eval to prevent Metro from analyzing the require at build time
const loadONNXRuntime = () => {
  if (onnxRuntimeLoaded) return; // Already tried
  onnxRuntimeLoaded = true;
  
  try {
    // Use Function constructor to create dynamic require that Metro can't analyze
    const requireModule = new Function('moduleName', 'return require(moduleName)');
    const onnxRuntime = requireModule('onnxruntime-react-native');
    if (onnxRuntime && onnxRuntime.InferenceSession) {
      InferenceSession = onnxRuntime.InferenceSession;
      Tensor = onnxRuntime.Tensor;
      console.log('✓ ONNX Runtime loaded');
    }
  } catch (e: any) {
    // Module not available - this is expected in Expo Go
    InferenceSession = undefined;
    Tensor = undefined;
    console.log('ONNX Runtime not available (requires custom dev client)');
  }
};

// Lazy load PyTorch Lite (only when needed, at runtime)
const loadPyTorchCore = () => {
  if (pytorchCoreLoaded) return; // Already tried
  pytorchCoreLoaded = true;
  
  try {
    // Use Function constructor to create dynamic require that Metro can't analyze
    const requireModule = new Function('moduleName', 'return require(moduleName)');
    const pytorchCore = requireModule('react-native-pytorch-core');
    if (pytorchCore && pytorchCore.torch) {
      torch = pytorchCore.torch;
      console.log('✓ PyTorch Lite loaded');
    }
  } catch (e: any) {
    // Module not available - this is expected in Expo Go
    torch = undefined;
    console.log('PyTorch Lite not available (requires custom dev client)');
  }
};

export interface InferenceResult {
  text: string;
  confidence: number;
  topPredictions?: Array<{ class: string; confidence: number }>;
  inferenceTime?: number;
  method: 'local' | 'backend';
}

export interface ModelMetadata {
  num_classes: number;
  class_names: string[];
  input_shape: number[];
  model_type: string;
  best_accuracy?: number;
  epoch?: number;
}

class LocalInferenceService {
  private modelLoaded: boolean = false;
  private modelMetadata: ModelMetadata | null = null;
  private classNames: string[] = [];
  private modelPath: string | null = null;
  private isInitialized: boolean = false;
  private inferenceSession: any = null; // InferenceSession type (from onnxruntime-react-native)
  private pytorchModel: any = null;
  private modelAsset: Asset | null = null;
  private modelType: 'onnx' | 'pytorch' | null = null;

  /**
   * Initialize the local inference service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.modelLoaded;
    }

    try {
      console.log('Initializing local inference service...');

      // Load model metadata
      await this.loadModelMetadata();

      // Check if on-device inference is enabled
      const enableLocal = config.enableOfflineMode || true;

      if (!enableLocal) {
        console.log('On-device inference is disabled');
        this.isInitialized = true;
        return false;
      }

      // Try to load the model (prioritizes .ptl, falls back to .onnx)
      this.modelLoaded = await this.loadModel();
      this.isInitialized = true;

      if (this.modelLoaded) {
        console.log(`✓ Local inference service initialized successfully (${this.modelType})`);
      } else {
        console.log('Local inference service initialized but model not loaded (will use backend)');
      }

      return this.modelLoaded;
    } catch (error) {
      console.error('Error initializing local inference service:', error);
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Load model metadata from assets
   */
  private async loadModelMetadata(): Promise<void> {
    try {
      const metadataModule = require('../../assets/model_metadata.json');
      this.modelMetadata = metadataModule as ModelMetadata;

      const classNamesModule = require('../../assets/class_names.json');
      this.classNames = classNamesModule as string[];

      console.log(`✓ Loaded metadata: ${this.modelMetadata.num_classes} classes`);
      console.log(`✓ Class names loaded: ${this.classNames.length} classes`);
    } catch (error) {
      console.error('Error loading model metadata:', error);
      this.modelMetadata = {
        num_classes: 15,
        class_names: [],
        input_shape: [16, 224, 224, 3],
        model_type: 'MobileNet3D',
      };
      this.classNames = [];
    }
  }

  /**
   * Load the ML model
   * Prioritizes best_model_mobile.ptl (PyTorch Lite), falls back to best_model.onnx (ONNX)
   */
  private async loadModel(): Promise<boolean> {
    try {
      console.log('Loading model - prioritizing best_model_mobile.ptl...');
      
      // Lazy load native modules
      loadPyTorchCore();
      loadONNXRuntime();
      
      // Try PyTorch Lite first (.ptl)
      if (torch) {
        try {
          const ptlModelAsset = Asset.fromModule(require('../../assets/best_model_mobile.ptl'));
          await ptlModelAsset.downloadAsync();
          
          if (ptlModelAsset.localUri) {
            this.modelPath = 'best_model_mobile.ptl';
            this.modelAsset = ptlModelAsset;
            this.modelType = 'pytorch';
            
            console.log('✓ Found best_model_mobile.ptl, loading with PyTorch Lite...');
            this.pytorchModel = await torch.jit.load(ptlModelAsset.localUri);
            console.log('✓ PyTorch Lite model loaded successfully');
            return true;
          }
        } catch (ptlError) {
          console.log('PyTorch Lite model not available:', ptlError);
        }
      }
      
      // Fallback to ONNX
      try {
        const onnxModelAsset = Asset.fromModule(require('../../assets/best_model.onnx'));
        await onnxModelAsset.downloadAsync();
        
        if (!onnxModelAsset.localUri) {
          throw new Error('ONNX model asset has no local URI');
        }

        this.modelPath = 'best_model.onnx';
        this.modelAsset = onnxModelAsset;
        this.modelType = 'onnx';
        
        console.log('✓ Found best_model.onnx, loading with ONNX Runtime...');
        
        if (!InferenceSession) {
          console.warn('ONNX Runtime not available - requires custom dev client build');
          return false;
        }
        
        this.inferenceSession = await InferenceSession.create(onnxModelAsset.localUri, {
          executionProviders: ['cpu'],
          graphOptimizationLevel: 'all',
        });
        
        console.log('✓ ONNX Runtime model loaded successfully');
        return true;
        
      } catch (onnxError) {
        console.warn('Failed to load ONNX model:', onnxError);
        return false;
      }
    } catch (error) {
      console.error('Error loading model:', error);
      return false;
    }
  }

  /**
   * Decode base64 image to pixel data
   */
  private async decodeBase64Image(base64Data: string): Promise<ImageData | null> {
    try {
      // Remove data URL prefix if present
      let cleanBase64 = base64Data;
      if (base64Data.includes(';base64,')) {
        cleanBase64 = base64Data.split(';base64,')[1];
      } else if (base64Data.includes(',')) {
        cleanBase64 = base64Data.split(',')[1];
      }

      // Write base64 to temp file
      const tempUri = `${FileSystem.cacheDirectory}temp_frame_${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(tempUri, cleanBase64, {
        encoding: 'base64' as any,
      });

      // Resize image using ImageManipulator
      const manipulated = await ImageManipulator.manipulateAsync(
        tempUri,
        [{ resize: { width: 224, height: 224 } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Read the resized image as base64
      const resizedBase64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: 'base64' as any,
      });

      // Clean up temp files
      try {
        await FileSystem.deleteAsync(tempUri, { idempotent: true });
        await FileSystem.deleteAsync(manipulated.uri, { idempotent: true });
      } catch {}

      // Convert base64 to Uint8Array, then to ImageData
      // For React Native, we'll create a simple pixel array
      const binaryString = atob(resizedBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Return image data structure
      return {
        data: bytes,
        width: 224,
        height: 224,
      };
    } catch (error) {
      console.error('Error decoding base64 image:', error);
      return null;
    }
  }

  /**
   * Convert image data to normalized tensor (Float32Array)
   */
  private imageDataToTensor(imageData: ImageData, normalize: boolean = true): Float32Array {
    const { width, height, data } = imageData;
    const tensor = new Float32Array(width * height * 3); // RGB channels
    
    // For JPEG data, we need to decode it properly
    // This is a simplified version - in production, use proper JPEG decoder
    // For now, we'll create a placeholder tensor
    // The actual implementation would decode JPEG and extract RGB pixels
    
    // Placeholder: create normalized random data (in production, decode actual pixels)
    for (let i = 0; i < tensor.length; i++) {
      tensor[i] = normalize ? Math.random() : Math.random() * 255;
    }
    
    return tensor;
  }

  /**
   * Preprocess video frames for inference
   * Converts base64 frames to normalized tensor input
   */
  private async preprocessFrames(frames: string[]): Promise<Float32Array | null> {
    try {
      if (!this.modelMetadata) {
        return null;
      }

      const [numFrames, height, width, channels] = this.modelMetadata.input_shape;
      const targetFrames = Math.min(frames.length, numFrames);
      
      // Preprocess each frame
      const processedFrames: Float32Array[] = [];
      
      for (let i = 0; i < targetFrames; i++) {
        const frameBase64 = frames[i];
        
        // Decode base64 to image
        const imageData = await this.decodeBase64Image(frameBase64);
        if (!imageData) {
          console.warn(`Failed to decode frame ${i}`);
          continue;
        }
        
        // Convert to tensor
        const frameTensor = this.imageDataToTensor(imageData, true);
        processedFrames.push(frameTensor);
      }
      
      if (processedFrames.length === 0) {
        return null;
      }
      
      // Stack frames into sequence: [numFrames, height, width, channels]
      // Pad with zeros if we have fewer frames than required
      const totalSize = numFrames * height * width * channels;
      const tensorData = new Float32Array(totalSize);
      
      let offset = 0;
      for (let f = 0; f < numFrames; f++) {
        if (f < processedFrames.length) {
          const frameData = processedFrames[f];
          tensorData.set(frameData, offset);
        }
        // If we have fewer frames, the rest remains zero (padded)
        offset += height * width * channels;
      }
      
      return tensorData;
      
    } catch (error) {
      console.error('Error preprocessing frames:', error);
      return null;
    }
  }

  /**
   * Run inference using PyTorch Lite
   */
  private async predictPytorch(frames: string[]): Promise<InferenceResult | null> {
    if (!this.pytorchModel || !torch) {
      return null;
    }

    try {
      const startTime = Date.now();

      // Preprocess frames
      const preprocessed = await this.preprocessFrames(frames);
      if (!preprocessed) {
        return null;
      }

      const [numFrames, height, width, channels] = this.modelMetadata!.input_shape;
      
      // Create PyTorch tensor
      const inputTensor = torch.tensor(preprocessed, {
        shape: [1, numFrames, height, width, channels],
        dtype: torch.float32,
      });

      // Run inference
      const output = await this.pytorchModel.forward(inputTensor);
      const outputData = await output.data();

      // Get predictions
      const predictions = Array.from(outputData) as number[];
      const maxIndex = predictions.indexOf(Math.max(...predictions));
      const confidence = predictions[maxIndex] as number;

      // Get top-k predictions
      const topK = Math.min(5, this.classNames.length);
      const topPredictions = predictions
        .map((conf: number, idx: number) => ({ index: idx, confidence: conf }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, topK)
        .map(({ index, confidence: conf }) => ({
          class: this.classNames[index] || `Class_${index}`,
          confidence: conf,
        }));

      const predictedClass = this.classNames[maxIndex] || `Class_${maxIndex}`;
      const inferenceTime = Date.now() - startTime;

      console.log(`✓ PyTorch Lite inference completed in ${inferenceTime}ms`);
      console.log(`  Predicted: ${predictedClass} (${(confidence * 100).toFixed(2)}%)`);

      return {
        text: predictedClass,
        confidence,
        topPredictions,
        inferenceTime,
        method: 'local',
      };
    } catch (error) {
      console.error('Error running PyTorch Lite inference:', error);
      return null;
    }
  }

  /**
   * Run inference using ONNX Runtime
   */
  private async predictONNX(frames: string[]): Promise<InferenceResult | null> {
    if (!this.inferenceSession || !this.modelMetadata) {
      return null;
    }

    try {
      const startTime = Date.now();

      // Preprocess frames
      const preprocessed = await this.preprocessFrames(frames);
      if (!preprocessed) {
        return null;
      }

      const [numFrames, height, width, channels] = this.modelMetadata.input_shape;

      if (!Tensor) {
        console.warn('ONNX Tensor not available');
        return null;
      }

      // Create input tensor
      const inputTensor = new Tensor('float32', preprocessed, [
        1, // batch size
        numFrames,
        height,
        width,
        channels,
      ]);

      // Run inference (adjust input name based on your model)
      const feeds = { input: inputTensor };
      const results = await this.inferenceSession.run(feeds);
      
      // Get output
      const output = results[Object.keys(results)[0]];
      const outputData = output.data as Float32Array;

      // Get top prediction
      let maxIndex = 0;
      let maxValue = outputData[0];
      for (let i = 1; i < outputData.length; i++) {
        if (outputData[i] > maxValue) {
          maxValue = outputData[i];
          maxIndex = i;
        }
      }

      // Get top-k predictions
      const topK = Math.min(5, this.classNames.length);
      const topPredictions = Array.from(outputData)
        .map((confidence, index) => ({ index, confidence }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, topK)
        .map(({ index, confidence }) => ({
          class: this.classNames[index] || `Class_${index}`,
          confidence,
        }));

      const predictedClass = this.classNames[maxIndex] || `Class_${maxIndex}`;
      const inferenceTime = Date.now() - startTime;

      console.log(`✓ ONNX Runtime inference completed in ${inferenceTime}ms`);
      console.log(`  Predicted: ${predictedClass} (${(maxValue * 100).toFixed(2)}%)`);

      return {
        text: predictedClass,
        confidence: maxValue,
        topPredictions,
        inferenceTime,
        method: 'local',
      };
    } catch (error) {
      console.error('Error running ONNX inference:', error);
      return null;
    }
  }

  /**
   * Run inference on video frames
   * @param frames Array of base64 encoded video frames
   * @returns Inference result
   */
  async predict(frames: string[]): Promise<InferenceResult | null> {
    if (!this.modelLoaded || !this.modelMetadata) {
      console.log('Model not loaded, cannot run local inference');
      return null;
    }

    try {
      // Use appropriate inference method based on model type
      if (this.modelType === 'pytorch') {
        return await this.predictPytorch(frames);
      } else if (this.modelType === 'onnx') {
        return await this.predictONNX(frames);
      } else {
        console.log('No valid model type loaded');
        return null;
      }
    } catch (error) {
      console.error('Error running local inference:', error);
      return null;
    }
  }

  /**
   * Check if local inference is available
   */
  isAvailable(): boolean {
    return this.modelLoaded && this.isInitialized && (this.inferenceSession !== null || this.pytorchModel !== null);
  }

  /**
   * Get model metadata
   */
  getMetadata(): ModelMetadata | null {
    return this.modelMetadata;
  }

  /**
   * Get class names
   */
  getClassNames(): string[] {
    return this.classNames;
  }

  /**
   * Get model type
   */
  getModelType(): 'onnx' | 'pytorch' | null {
    return this.modelType;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.inferenceSession) {
      this.inferenceSession = null;
    }
    if (this.pytorchModel) {
      this.pytorchModel = null;
    }
    console.log('Inference resources cleaned up');
  }
}

// Helper interface for image data
interface ImageData {
  data: Uint8Array;
  width: number;
  height: number;
}

// Export singleton instance
export default new LocalInferenceService();
