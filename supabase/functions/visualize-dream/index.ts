// @deno-types="npm:@supabase/functions-js@2.4.1/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"
// Import the Replicate client library
import Replicate from "replicate";

// Helper function for delays (might not be needed anymore, but keep for now)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize Supabase client
const supabase = createClient(
  // @ts-ignore - Deno.env is available
  Deno.env.get("SUPABASE_URL")!,
  // @ts-ignore - Deno.env is available
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");

// Instantiate the Replicate client
const replicate = new Replicate({
  auth: REPLICATE_API_TOKEN,
});

// Define the specific type expected by replicate.run
type ReplicateModelId = `${string}/${string}`;

// Define model category types for better type safety
type ImageModelKey = 'flux-1.1-pro' | 'flux-schnell' | 'flux-dev' | 'ideogram-v2' | 'recraft-v3' | 'stable-diffusion-xl';
type VideoModelKey = 'minimax-video-01' | 'zeroscope-v2-xl' | 'stable-video-diffusion' | 'tencent-hunyuan-video' | 'wan-2.1-t2v';
type FaceSwapModelKey = 'face-swap'; // Keep for reference, but not a primary type
type GenerationCategory = 'IMAGE' | 'VIDEO'; // Removed FACE_SWAP as primary category
type GenerationType = 'image' | 'video'; // Removed 'face-swap'
type TargetType = 'image' | 'video'; // For face swap target

// Model information with descriptions for better UX
interface ModelInfo {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  commonParams: string[];
}

// Type-safe model mapping
const SUPPORTED_MODELS = {
  IMAGE: {
    "flux-1.1-pro": "black-forest-labs/flux-1.1-pro",
    "flux-schnell": "black-forest-labs/flux-schnell",
    "flux-dev": "black-forest-labs/flux-dev",
    "ideogram-v2": "ideogram-ai/ideogram-v2",
    "recraft-v3": "recraft-ai/recraft-v3",
    "stable-diffusion-xl": "stability-ai/stable-diffusion-xl-base-1.0"
  } as Record<ImageModelKey, string>,
  VIDEO: {
    "minimax-video-01": "minimax/video-01",
    "zeroscope-v2-xl": "anotherjesse/zeroscope-v2-xl",
    "stable-video-diffusion": "stability-ai/stable-video-diffusion",
    "tencent-hunyuan-video": "tencent/hunyuan-video",
    "wan-2.1-t2v": "wavespeedai/wan-2.1-t2v-480p"
  } as Record<VideoModelKey, string>,
  // Keep face swap model definition separate for internal use
  FACE_SWAP_INTERNAL: {
    "face-swap": "cdingram/face-swap:d1d6ea8c8be89d664a07a457526f7128109dee7030fdac424788d762c71ed111"
  } as Record<FaceSwapModelKey, string>
};

// Detailed model information for UI display
const MODEL_DETAILS: Record<string, ModelInfo> = {
  // Image models
  "flux-1.1-pro": {
    id: "flux-1.1-pro",
    name: "FLUX 1.1 Pro",
    description: "State-of-the-art image generation with excellent quality, prompt adherence, and output diversity.",
    capabilities: ["High quality images", "Strong prompt adherence", "Diverse outputs", "Various aspect ratios"],
    commonParams: ["prompt", "aspect_ratio", "negative_prompt", "prompt_upsampling", "output_format"]
  },
  "flux-schnell": {
    id: "flux-schnell",
    name: "FLUX Schnell",
    description: "Fast image generation with good quality, capable of generating images in roughly 1 second.",
    capabilities: ["Fast generation", "Good quality", "Various aspect ratios"],
    commonParams: ["prompt", "aspect_ratio", "output_format"]
  },
  "flux-dev": {
    id: "flux-dev",
    name: "FLUX Dev",
    description: "Developer version of FLUX with open weights, offering high-quality image generation.",
    capabilities: ["High quality images", "Open weights", "Research applications"],
    commonParams: ["prompt", "aspect_ratio", "negative_prompt"]
  },
  "ideogram-v2": {
    id: "ideogram-v2",
    name: "Ideogram v2",
    description: "Specialized in generating images with realistic, legible text. Great for creating mock-ups and designs.",
    capabilities: ["Text rendering", "Realistic images", "Design applications"],
    commonParams: ["prompt", "negative_prompt", "width", "height"]
  },
  "recraft-v3": {
    id: "recraft-v3",
    name: "Recraft v3",
    description: "Generate high-quality SVG images including logos and icons in various styles.",
    capabilities: ["SVG generation", "Vector graphics", "Logos and icons"],
    commonParams: ["prompt", "style", "negative_prompt"]
  },
  "stable-diffusion-xl": {
    id: "stable-diffusion-xl",
    name: "Stable Diffusion XL",
    description: "Versatile image generation model with strong capabilities for a wide range of use cases.",
    capabilities: ["Versatile", "High resolution", "Style variety"],
    commonParams: ["prompt", "negative_prompt", "width", "height", "num_outputs"]
  },

  // Video models
  "minimax-video-01": {
    id: "minimax-video-01",
    name: "Minimax Video-01 (Hailuo)",
    description: "High-definition video generation at 720p/25fps with cinematic camera movements.",
    capabilities: ["HD video", "Cinematic quality", "Camera movements"],
    commonParams: ["prompt", "negative_prompt", "first_frame_image"]
  },
  "zeroscope-v2-xl": {
    id: "zeroscope-v2-xl",
    name: "Zeroscope v2 XL",
    description: "High-quality video model optimized for 16:9 compositions and smooth video output.",
    capabilities: ["Smooth motion", "16:9 optimized", "High quality"],
    commonParams: ["prompt", "negative_prompt", "num_frames", "fps"]
  },
  "stable-video-diffusion": {
    id: "stable-video-diffusion",
    name: "Stable Video Diffusion",
    description: "Text-to-video generation from Stability AI with consistent motion and quality.",
    capabilities: ["Consistent motion", "Strong visual quality", "Broad style range"],
    commonParams: ["prompt", "num_frames", "fps", "motion_bucket_id"]
  },
  "tencent-hunyuan-video": {
    id: "tencent-hunyuan-video",
    name: "Tencent Hunyuan Video",
    description: "Open-source video model competitive with proprietary options, offering strong quality.",
    capabilities: ["Open source", "High quality", "Customizable parameters"],
    commonParams: ["prompt", "negative_prompt", "num_inference_steps"]
  },
  "wan-2.1-t2v": {
    id: "wan-2.1-t2v",
    name: "WAN 2.1 Text-to-Video",
    description: "Advanced video generation with accelerated inference for text-to-video at 480p.",
    capabilities: ["Fast inference", "Good quality", "Text-to-video"],
    commonParams: ["prompt", "negative_prompt", "num_frames", "guidance_scale"]
  },

  // Face swap models (kept for reference, not primary selection)
  "face-swap": {
    id: "face-swap",
    name: "Face Swap",
    description: "Advanced face swapping that maintains identity while blending seamlessly with generated scenes. Used internally when face swap is enabled.",
    capabilities: ["Identity preservation", "High-quality blending", "Realistic blending"],
    commonParams: ["swap_image", "input_image"]
  }
};

// Model parameters schemas (simplified version for common parameters)
interface BaseModelParams {
  prompt: string;
  [key: string]: any;
}

interface ImageModelParams extends BaseModelParams {
  aspect_ratio?: string;
  negative_prompt?: string;
  num_outputs?: number;
  prompt_upsampling?: boolean;
  output_format?: string;
  output_quality?: number;
  seed?: number;
}

interface VideoModelParams extends BaseModelParams {
  negative_prompt?: string;
  guidance_scale?: number;
  num_frames?: number;
  fps?: number;
  width?: number;
  height?: number;
  seed?: number;
}

interface FaceSwapParams extends BaseModelParams {
  swap_image: string; // User's face image URL
  input_image: string; // Base generated image/video URL
}

// Helper function refactored to use replicate.run()
async function runReplicatePrediction(modelVersionId: ReplicateModelId, input: object, stepName: string): Promise<any> {
  console.log(`Starting Replicate prediction (${stepName}) with model: ${modelVersionId}...`);

  try {
    // Use replicate.run() which handles polling internally
    const output = await replicate.run(modelVersionId, { input });

    console.log(`Replicate prediction succeeded (${stepName}). Output:`, output);

    // Handle both array and single string outputs
    let resultUrl: string;
    if (Array.isArray(output)) {
      if (output.length === 0 || typeof output[0] !== 'string') {
        console.error(`Replicate output array is empty or invalid (${stepName}):`, output);
        throw new Error(`Replicate prediction succeeded but output array was invalid (${stepName}). Expected at least one URL string.`);
      }
      resultUrl = output[0];
    } else if (typeof output === 'string') {
      resultUrl = output;
    } else {
      console.error(`Replicate output is not a string or array of strings (${stepName}):`, output);
      throw new Error(`Replicate prediction succeeded but output format was invalid (${stepName}). Expected a URL string or array of URL strings.`);
    }

    // Return the URL
    return resultUrl;

  } catch (error) {
    console.error(`Replicate run failed (${stepName}) for model ${modelVersionId}:`, error);
    // Safely access error message after type check
    let errorMessage = "Unknown error during Replicate prediction";
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    // Rethrow the error with a more informative message
    throw new Error(`Replicate prediction failed (${stepName}) for model ${modelVersionId}: ${errorMessage}`);
  }
}

// @ts-ignore - Deno.serve is available
Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Check for Replicate token early
  if (!REPLICATE_API_TOKEN) {
    console.error("REPLICATE_API_TOKEN is not set.");
    return new Response(JSON.stringify({ success: false, error: "Server configuration error: Replicate API token missing." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // New endpoint to get supported models (excluding internal face swap model)
  if (req.method === "GET") {
    // Extract model information for the response
    const modelInfoByCategory = {
      image: Object.keys(SUPPORTED_MODELS.IMAGE).map(id => MODEL_DETAILS[id]),
      video: Object.keys(SUPPORTED_MODELS.VIDEO).map(id => MODEL_DETAILS[id]),
      // We don't expose the face swap model directly for selection anymore
      // faceSwap: Object.keys(SUPPORTED_MODELS.FACE_SWAP_INTERNAL).map(id => MODEL_DETAILS[id])
    };

    return new Response(
      JSON.stringify({
        success: true,
        models: modelInfoByCategory
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }

  try {
    // Parse request body
    const body = await req.json();
    console.log("Received request with body:", body);

    // Extract request parameters
    let { // Use let for generationType as it might be overridden
      generationType, // "image" or "video"
      modelId, // Model identifier from supported models
      imagePath, // Required if enableFaceSwap is true
      enableFaceSwap = false, // New flag to control face swap
      faceSwapTargetType = 'image', // 'image' or 'video', defaults to image if swapping
      prompt, // Required text prompt
      parameters = {} // Optional additional parameters for the model (e.g., parameters.imageGeneration, parameters.videoGeneration, parameters.faceSwap)
    } = body;

    // Validate essential parameters
    if (!generationType) {
      throw new Error("generationType is required in the request body. Must be 'image' or 'video'.");
    }
    // Validate generationType is 'image' or 'video'
    if (!['image', 'video'].includes(generationType)) {
      throw new Error("generationType must be 'image' or 'video'.");
    }

    if (!modelId) {
      throw new Error("modelId is required in the request body.");
    }

    if (!prompt) {
      throw new Error("prompt is required in the request body.");
    }

    if (enableFaceSwap && !imagePath) {
        throw new Error("imagePath (URL to user's face image) is required when enableFaceSwap is true.");
    }

    // Prepare the model selection based on generationType
    let modelCategory: GenerationCategory;
    let selectedModelMap: Record<string, string>;
    switch (generationType as GenerationType) {
      case "image":
        modelCategory = "IMAGE";
        selectedModelMap = SUPPORTED_MODELS.IMAGE;
        break;
      case "video":
        modelCategory = "VIDEO";
        selectedModelMap = SUPPORTED_MODELS.VIDEO;
        break;
      default:
        // This case should not be reachable due to earlier validation
        throw new Error(`Internal error: Unexpected generation type: ${generationType}`);
    }

    // Validate the selected model ID for the chosen generation type
    if (!selectedModelMap[modelId as keyof typeof selectedModelMap]) {
      throw new Error(`Unsupported model ID '${modelId}' for ${generationType} generation. Available models: ${Object.keys(selectedModelMap).join(", ")}`);
    }

    const selectedBaseModelId = selectedModelMap[modelId as keyof typeof selectedModelMap] as ReplicateModelId;
    const faceSwapModelId = SUPPORTED_MODELS.FACE_SWAP_INTERNAL["face-swap"] as ReplicateModelId; // Internal face swap model

    // --- Main Workflow ---
    let resultUrl: string;
    let finalGenerationType = generationType; // Track the actual output type

    // Check if face swap is enabled
    if (enableFaceSwap) {
      console.log("Face swap enabled. Starting face swap workflow...");
      // 1. Validate and get signed URL for user's face image
      console.log(`Validating imagePath: "${imagePath}" (Type: ${typeof imagePath})`);
      try {
        new URL(imagePath);
      } catch (_) {
        throw new Error("Invalid imagePath provided for face swap. It must be a valid URL.");
      }

      const bucketName = 'user-uploads';
      const url = new URL(imagePath);
      const pathParts = url.pathname.split('/');
      const filePathIndex = pathParts.indexOf('user-uploads');
      if (filePathIndex === -1) {
        throw new Error("Invalid Supabase storage path for face swap image: bucket not found in URL");
      }
      const filePath = pathParts.slice(filePathIndex + 1).join('/');
      if (!filePath) {
        throw new Error("Invalid Supabase storage path for face swap image: no file path found");
      }

      console.log(`Attempting to get signed URL for face swap image: bucket=${bucketName}, file=${filePath}`);
      const { data: signedUrlData, error: signedUrlError } = await supabase
        .storage
        .from(bucketName)
        .createSignedUrl(filePath, 60); // 60 seconds expiry

      if (signedUrlError || !signedUrlData?.signedUrl) {
        console.error("Failed to generate signed URL for face swap image:", signedUrlError);
        throw new Error(`Failed to generate signed URL for face swap image access: ${signedUrlError?.message || 'Unknown error'}`);
      }
      const signedImageUrl = signedUrlData.signedUrl;
      console.log("Generated signed URL for face swap image access:", signedImageUrl);

      // 2. Generate base media (image or video) based on faceSwapTargetType
      let baseMediaUrl: string;
      let baseMediaType: TargetType = faceSwapTargetType === 'video' ? 'video' : 'image'; // Determine base type
      console.log(`Generating base ${baseMediaType} for face swap using model ${selectedBaseModelId}...`);

      let baseModelToUse: ReplicateModelId = selectedBaseModelId; // Use the user-selected model for the base
      let baseInput: BaseModelParams;
      let baseStepName: string;

      if (baseMediaType === 'image') {
        // Ensure the selected model is actually an image model (redundant check, but safe)
        if (modelCategory !== 'IMAGE') {
            console.warn(`Warning: Selected model ${modelId} is not an image model, but faceSwapTargetType is 'image'. Using default image model.`);
            baseModelToUse = SUPPORTED_MODELS.IMAGE["flux-1.1-pro"] as ReplicateModelId;
        }
        baseInput = {
          prompt: `${prompt}, front facing portrait, face completely visible and unobstructed, no eyewear, no sunglasses, no glasses, clear eyes visible, natural lighting on face, professional photography, 4k, highly detailed`,
          negative_prompt: "sunglasses, glasses, eyewear, dark glasses, shades, obscured eyes, covered eyes, hidden eyes",
          ...parameters.imageGeneration // User overrides for image gen
        };
        baseStepName = "Base Text-to-Image for Face Swap";
      } else { // baseMediaType === 'video'
         // Ensure the selected model is actually a video model (redundant check, but safe)
         if (modelCategory !== 'VIDEO') {
            console.warn(`Warning: Selected model ${modelId} is not a video model, but faceSwapTargetType is 'video'. Using default video model.`);
            baseModelToUse = SUPPORTED_MODELS.VIDEO["zeroscope-v2-xl"] as ReplicateModelId;
        }
        baseInput = {
          prompt: `${prompt}, cinematic video, high quality, face visible`,
          ...parameters.videoGeneration // User overrides for video gen
        };
        baseStepName = "Base Text-to-Video for Face Swap";
      }

      console.log(`Replicate Input (${baseStepName}):`, baseInput);
      baseMediaUrl = await runReplicatePrediction(baseModelToUse, baseInput, baseStepName);
      console.log(`Base ${baseMediaType} generation succeeded. Base Media URL: ${baseMediaUrl}`);

      // 3. Perform Face Swap
      console.log("Performing face swap...");
      
      const faceSwapInput: FaceSwapParams = { 
        swap_image: signedImageUrl, // User's face
        input_image: baseMediaUrl, // Generated base image/video
        ...parameters.faceSwap // User overrides for face swap
      };

      console.log("Replicate Input (face-swap):", faceSwapInput);
      resultUrl = await runReplicatePrediction(faceSwapModelId, faceSwapInput, "Face-Swap");
      console.log(`Face-swap succeeded. Final Image URL: ${resultUrl}`);

      // Important Note: The result is currently always an image due to Photomaker.
      // Update the finalGenerationType to reflect this.
      finalGenerationType = 'image';
      console.log("Face swap complete. Final output type is image.");

    }
    // Standard image or video generation (no face swap)
    else {
      console.log(`Standard ${generationType} generation requested with model ${modelId}.`);
      const modelInput = {
        prompt,
        ...parameters // Include any additional parameters provided (e.g., parameters.imageGeneration or parameters.videoGeneration)
      };

      console.log(`Replicate Input (standard ${generationType} generation):`, modelInput);
      resultUrl = await runReplicatePrediction(selectedBaseModelId, modelInput, `Standard ${generationType} Generation`);
      console.log(`Standard ${generationType} generation succeeded. Result URL: ${resultUrl}`);
      // finalGenerationType remains the originally requested 'image' or 'video'
    }

    // Return result
    return new Response(
      JSON.stringify({
        success: true,
        resultUrl,
        message: `${finalGenerationType} generation successful ${enableFaceSwap ? '(with face swap applied, output is image)' : ''}`,
        generationType: finalGenerationType, // Return the type of the *actual* result
        modelId // Return the originally selected base model ID
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );

  } catch (error) {
    console.error("Error in visualize-dream function:", error);
    // Safely access error message after type check
    let errorMessage = "An unknown error occurred";
    let errorDetails = "";
    
    if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || "";
    } else if (typeof error === 'string') {
        errorMessage = error;
    }

    // Determine response status based on error type
    const status = errorMessage.includes("required") ||
                  errorMessage.includes("Invalid") ||
                  errorMessage.includes("Unsupported") ? 400 : 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorDetails: errorDetails,
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }),
      {
        status: status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});

// Helper function to get information about supported models (for frontend selection)
export function getSupportedModels() {
  return {
    image: Object.keys(SUPPORTED_MODELS.IMAGE).map(id => MODEL_DETAILS[id]),
    video: Object.keys(SUPPORTED_MODELS.VIDEO).map(id => MODEL_DETAILS[id]),
    // Do not expose face swap model for direct selection
  };
}

/* Invocation Example changes:
   Standard Image: { "generationType": "image", "modelId": "flux-1.1-pro", "prompt": "A cat astronaut", "parameters": { ... } }
   Standard Video: { "generationType": "video", "modelId": "zeroscope-v2-xl", "prompt": "A cat astronaut flying", "parameters": { ... } }
   Image with Face Swap: { "generationType": "image", "modelId": "flux-1.1-pro", "prompt": "Me as a cat astronaut", "enableFaceSwap": true, "imagePath": "supabase_url_to_face.jpg", "faceSwapTargetType": "image", "parameters": { ... } }
   Video Prompt with Face Swap (Result is Image): { "generationType": "video", "modelId": "zeroscope-v2-xl", "prompt": "Me as a cat astronaut flying", "enableFaceSwap": true, "imagePath": "supabase_url_to_face.jpg", "faceSwapTargetType": "video", "parameters": { ... } }
*/
