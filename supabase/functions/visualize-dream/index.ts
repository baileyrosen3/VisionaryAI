// @deno-types="npm:@supabase/functions-js@2.4.1/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.41.0";
import Replicate from "npm:replicate@^0.29.1";

// --- Constants & Interfaces ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Replicate model constants
const FACE_SWAP_MODEL = "cdingram/face-swap:d1d6ea8c8be89d664a07a457526f7128109dee7030fdac424788d762c71ed111";

// Types
type GenerationType = 'image' | 'video';
type ReplicateModelId = string;

// Image generation models
const IMAGE_MODELS: Record<string, string> = {
  "flux-1.1-pro": "black-forest-labs/flux-1.1-pro",
  "flux-schnell": "black-forest-labs/flux-schnell",
  "flux-dev": "black-forest-labs/flux-dev",
  "ideogram-v2": "ideogram-ai/ideogram-v2-turbo",
  "recraft-v3": "recraft-ai/recraft-v3",
  "stable-diffusion-xl": "stability-ai/stable-diffusion-xl-base-1.0"
};

// Video generation models
const VIDEO_MODELS: Record<string, string> = {
  "minimax-video-01": "minimax/video-01",
  "zeroscope-v2-xl": "anotherjesse/zeroscope-v2-xl",
  "stable-video-diffusion": "stability-ai/stable-video-diffusion",
  "tencent-hunyuan-video": "tencent/hunyuan-video",
  "wan-2.1-t2v": "wavespeedai/wan-2.1-t2v-480p"
};

// --- Initialize clients ---
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

// --- Helper Functions ---

/**
 * Enhances a user prompt using Gemini AI
 */
async function enhancePrompt(originalPrompt: string, params: {
  targetGeneration: GenerationType;
  style?: string;
  mood?: string;
}): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn("Gemini API key missing, returning original prompt");
    return originalPrompt;
  }

  const { targetGeneration, style, mood } = params;

  try {
    const systemPrompt = `You are an expert prompt engineer for AI image and video generation models.
Enhance this ${targetGeneration} generation prompt: "${originalPrompt}"

Consider these aspects:
- Add visual details like colors, lighting, textures, camera angles
- Incorporate artistic style${style ? ` (primarily ${style})` : ''}
- Set the mood/atmosphere${mood ? ` (primarily ${mood})` : ''}
- Add technical quality terms like "8k", "high resolution", "detailed"
- Keep the essence of the original prompt
- For face images, ensure terms like "clear face", "detailed face"

Return ONLY the enhanced prompt with no explanations or formatting.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
        })
     });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text.trim();
    } else {
      throw new Error("Unexpected Gemini response format");
    }
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    return originalPrompt; // Fall back to original prompt
  }
}

/**
 * Prepares a user portrait image for face swapping
 * Creates a signed URL that is accessible to Replicate
 */
async function preparePortraitImage(imageUrl: string): Promise<string> {
  console.log(`Preparing portrait image: ${imageUrl}`);
  
  try {
    // If it's a Supabase URL, we need to make sure it's accessible
    if (imageUrl.includes('supabase.co/storage/v1/object/public/')) {
      console.log("Image is from Supabase storage, creating signed URL");
      
      // Extract bucket and path from URL
      const urlParts = imageUrl.split('/storage/v1/object/public/');
      if (urlParts.length !== 2) {
        throw new Error("Invalid Supabase storage URL format");
      }
      
      const parts = urlParts[1].split('/');
      const bucket = parts[0];
      const path = parts.slice(1).join('/');
      
      console.log(`Bucket: ${bucket}, Path: ${path}`);
      
      // Create a signed URL with a 1-hour expiration
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600); // 1 hour expiration
        
      if (signedUrlError) {
        console.error("Error creating signed URL:", signedUrlError);
        // Fall back to adding download parameter
        const accessibleUrl = `${imageUrl}?download=true`;
        console.log(`Couldn't create signed URL, using download parameter instead: ${accessibleUrl}`);
        return accessibleUrl;
      }
      
      if (!signedUrlData?.signedUrl) {
        console.error("No signed URL returned");
        // Fall back to adding download parameter
        const accessibleUrl = `${imageUrl}?download=true`;
        console.log(`No signed URL returned, using download parameter instead: ${accessibleUrl}`);
        return accessibleUrl;
      }
      
      console.log(`Created signed URL: ${signedUrlData.signedUrl}`);
      return signedUrlData.signedUrl;
    }
    
    // For non-Supabase URLs, test accessibility
    try {
      console.log(`Testing accessibility of external URL: ${imageUrl}`);
      const response = await fetch(imageUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'VisionaryAI-Service/1.0'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        console.log(`External URL is accessible: ${imageUrl}`);
        return imageUrl;
      } else {
        console.warn(`External URL returned ${response.status} ${response.statusText}, but will try using it anyway`);
        return imageUrl;
      }
    } catch (testError) {
      console.warn(`Failed to test URL accessibility: ${testError}. Will try using it anyway.`);
      return imageUrl;
    }
  } catch (error) {
    console.error("Error preparing portrait URL:", error);
    // Return original URL as fallback
    return imageUrl;
  }
}

/**
 * Creates a new visualization history record
 */
async function createHistoryRecord(params: {
  userId: string | null;
  originalPrompt: string;
  enhancedPrompt: string;
  modelId: string;
  modelVersion?: string;
  mediaType: GenerationType;
  predictionId: string;
  needsFaceSwap: boolean;
  faceSwapInputImage?: string;
  parameters?: Record<string, any>;
}): Promise<string> {
  try {
    console.log("Creating history record with params:", JSON.stringify({
      ...params,
      faceSwapInputImage: params.faceSwapInputImage ? '[URL TRUNCATED]' : undefined
    }, null, 2));

    // First get table columns to see what's available
    console.log("Getting table schema...");
    const { data: columnData, error: columnError } = await supabase.from('creation_history')
      .select('*')
      .limit(1);

    if (columnError) {
      console.error("Error fetching table schema:", columnError);
      throw new Error(`Failed to fetch table schema: ${columnError.message}`);
    }

    // If we got data, we can inspect the columns
    let validColumns: string[] = [];
    if (columnData && columnData.length > 0) {
      validColumns = Object.keys(columnData[0]);
      console.log("Available columns:", validColumns);
    } else {
      console.log("No existing data in table. Using minimal record.");
      
      // Create minimal record with required fields
      const minimalRecord = {
        user_id: params.userId,
        original_prompt: params.originalPrompt,
        enhanced_prompt: params.enhancedPrompt,
        model_id: params.modelId,
        media_type: params.mediaType,
        // Add placeholder URLs that will be updated later
        media_url: 'pending',
        original_url: 'pending'
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('creation_history')
        .insert(minimalRecord)
        .select('id')
        .single();
      
      if (insertError) {
        throw insertError;
      }
      
      console.log(`Created minimal history record ${insertData.id}`);
      return insertData.id;
    }

    // Create object with all possible fields to match the database schema
    // Use a placeholder for required URL fields that will be updated when available
    const recordData: Record<string, any> = {
      user_id: params.userId,
      original_prompt: params.originalPrompt,
      enhanced_prompt: params.enhancedPrompt,
      model_id: params.modelId,
      media_type: params.mediaType,
      // Add these fields if they exist in the schema
      ...(validColumns.includes('media_url') ? { media_url: 'pending' } : {}),
      ...(validColumns.includes('original_url') ? { original_url: 'pending' } : {}),
      ...(validColumns.includes('face_swap_id') && params.needsFaceSwap ? { face_swap_id: params.faceSwapInputImage } : {}),
      ...(validColumns.includes('stored_in_supabase') ? { stored_in_supabase: false } : {})
    };

    // Add other optional fields if they exist in the schema
    if (validColumns.includes('model_version') && params.modelVersion) {
      recordData.model_version = params.modelVersion;
    }
    
    if (validColumns.includes('status')) {
      recordData.status = 'processing';
    }
    
    if (validColumns.includes('status_message')) {
      recordData.status_message = 'Started base image generation';
    }
    
    if (validColumns.includes('progress')) {
      recordData.progress = 10;
    }
    
    if (validColumns.includes('replicate_prediction_id')) {
      recordData.replicate_prediction_id = params.predictionId;
    }
    
    if (validColumns.includes('needs_face_swap')) {
      recordData.needs_face_swap = params.needsFaceSwap;
    }
    
    if (validColumns.includes('face_swap_input_image')) {
      recordData.face_swap_input_image = params.faceSwapInputImage;
    }
    
    if (validColumns.includes('parameters_used') && params.parameters) {
      recordData.parameters_used = JSON.stringify(params.parameters);
    }

    // Filter our record data to only include valid columns
    const filteredData: Record<string, any> = {};
    Object.keys(recordData).forEach(key => {
      if (validColumns.includes(key)) {
        filteredData[key] = recordData[key];
      } else {
        console.warn(`Removing field '${key}' as it doesn't exist in schema`);
      }
    });

    console.log("Inserting filtered record data");
    const { data: insertData, error: insertError } = await supabase
      .from('creation_history')
      .insert(filteredData)
      .select('id')
      .single();

    if (insertError) {
      console.error("Insert error details:", insertError);
      
      // Try with absolute minimum required fields
      console.log("Attempting with minimum required fields");
      const minimalData = {
        user_id: params.userId,
        original_prompt: params.originalPrompt,
        enhanced_prompt: params.enhancedPrompt || params.originalPrompt,
        model_id: params.modelId,
        media_type: params.mediaType,
        media_url: 'pending',
        original_url: 'pending'
      };
      
      const { data: minimalInsertData, error: minimalInsertError } = await supabase
        .from('creation_history')
        .insert(minimalData)
        .select('id')
        .single();
        
      if (minimalInsertError) {
        throw minimalInsertError;
      }
      
      console.log(`Created history record (minimal) ${minimalInsertData.id} for prediction ${params.predictionId}`);
      return minimalInsertData.id;
    }

    console.log(`Created history record ${insertData.id} for prediction ${params.predictionId}`);
    return insertData.id;
  } catch (error) {
    console.error("Error creating history record:", error);
    throw new Error(`Failed to create history record: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Main request handler
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Handle GET request for available models
  if (req.method === "GET") {
    try {
      const models = {
        image: Object.keys(IMAGE_MODELS),
        video: Object.keys(VIDEO_MODELS)
      };
      
        return new Response(
        JSON.stringify({ success: true, models }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
      console.error("Error fetching models:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch models" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }
  
  // Handle POST request to start visualization
  if (req.method === "POST") {
    // Verify API keys
    if (!REPLICATE_API_TOKEN) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error: Replicate API token missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    try {
      // 1. Parse request body
      const requestBody = await req.json();
      console.log("Received visualization request:", JSON.stringify(requestBody));

      const {
        generationType = 'image',
        modelId,
        imagePath,
        enableFaceSwap = false,
        prompt,
        parameters = {},
        style,
        mood
      } = requestBody;

      // 2. Validate required fields
      if (!['image', 'video'].includes(generationType)) {
        throw new Error("Invalid 'generationType'. Must be 'image' or 'video'.");
      }
      
      if (!modelId) throw new Error("Missing 'modelId'.");
      if (!prompt) throw new Error("Missing 'prompt'.");
      
      if (enableFaceSwap && !imagePath) {
        throw new Error("'imagePath' is required when face swap is enabled.");
      }
      
      // 3. Get user ID from auth header (optional)
      let userId: string | null = null;
      try {
        const authHeader = req.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.substring(7);
          const { data } = await supabase.auth.getUser(token);
          userId = data.user?.id || null;
        }
      } catch (authError) {
        console.warn("Auth error:", authError);
      }
      
      // 4. Prepare user portrait if face swap is enabled
      let processedPortraitUrl: string | null = null;
      if (enableFaceSwap && imagePath) {
        try {
          processedPortraitUrl = await preparePortraitImage(imagePath);
        } catch (portraitError) {
          console.error("Portrait processing error:", portraitError);
          throw new Error(`Failed to process portrait image: ${portraitError instanceof Error ? portraitError.message : String(portraitError)}`);
        }
      }
      
      // 5. Enhance the prompt
      console.log("Enhancing prompt with AI...");
      const enhancedPrompt = await enhancePrompt(prompt, {
        targetGeneration: generationType as GenerationType,
        style,
        mood
      });
      console.log("Original prompt:", prompt);
      console.log("Enhanced prompt:", enhancedPrompt);
      
      // 6. Select the appropriate model
      const modelMap = generationType === 'image' ? IMAGE_MODELS : VIDEO_MODELS;
      const modelString = modelMap[modelId];
      
      if (!modelString) {
        throw new Error(`Unsupported model ID '${modelId}' for ${generationType} generation.`);
      }

      // Parse model identifier and version
      const modelParts = modelString.split(':');
      const modelVersion = modelParts.length > 1 ? modelParts[1] : undefined;
      
      console.log(`Selected model: ${modelId}, version: ${modelVersion || 'latest'}`);
      
      // 7. Build prediction input parameters
      const predictionInput: Record<string, any> = {
        prompt: enhancedPrompt,
        ...parameters
      };
      
      // If face swap is enabled, optimize the prompt for a clear facial image
          if (enableFaceSwap) {
        predictionInput.prompt = `${enhancedPrompt}, 4k, high resolution, detailed face, clear face, headshot, front-facing portrait, looking directly at camera`;
        predictionInput.negative_prompt = `${parameters.negative_prompt || ''}, blurry face, sunglasses, mask, covered face, profile view, looking away, low quality, multiple people`;
      }
      
      console.log("Starting base generation with input:", JSON.stringify(predictionInput));
      
      // 8. Start the base generation with Replicate
      const prediction = await replicate.predictions.create({
        model: modelParts[0],
        version: modelVersion,
        input: predictionInput
      });

      console.log(`Started Replicate prediction: ${prediction.id}`);
      
      // 9. Create history record
      const historyId = await createHistoryRecord({
        userId,
        originalPrompt: prompt,
        enhancedPrompt,
        modelId,
        modelVersion,
        mediaType: generationType as GenerationType,
        predictionId: prediction.id,
        needsFaceSwap: enableFaceSwap,
        faceSwapInputImage: processedPortraitUrl || undefined,
        parameters: predictionInput
      });
      
      // 10. Return response to client
      return new Response(
        JSON.stringify({
          success: true,
          message: "Visualization process initiated",
          predictionId: prediction.id,
          historyId,
          needsFaceSwap: enableFaceSwap,
          faceSwapInputImage: processedPortraitUrl,
          enhancedPrompt,
          status: {
            stage: "base_generation",
            progress: 10,
            message: "Dream generation started"
          }
        }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error in visualize-dream handler:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      const status = errorMessage.includes("required") || errorMessage.includes("Invalid") ? 400 : 500;
      
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Fallback for unsupported methods
  return new Response(
    JSON.stringify({ success: false, error: `Method Not Allowed: ${req.method}` }),
    { 
    status: 405,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json", 
        "Allow": "GET, POST, OPTIONS" 
      } 
    }
  );
}); 