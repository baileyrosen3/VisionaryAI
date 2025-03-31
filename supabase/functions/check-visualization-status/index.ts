// @deno-types="npm:@supabase/functions-js@2.4.1/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2.41.0";
import Replicate from "npm:replicate@^0.29.1";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// --- Constants & Interfaces ---
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Replicate model constants
const FACE_SWAP_MODEL = "cdingram/face-swap:d1d6ea8c8be89d664a07a457526f7128109dee7030fdac424788d762c71ed111";
const [_fsOwnerRepo, FACE_SWAP_MODEL_VERSION] = FACE_SWAP_MODEL.split(':');

// Initialize clients
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN") || "";
const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

// --- Helper Functions ---

/**
 * Extracts a URL from Replicate's output, which can be in various formats
 */
function extractOutputUrl(output: any): string | null {
  if (!output) return null;

  // If output is a string and looks like a URL, return it
  if (typeof output === 'string' && (output.startsWith('http://') || output.startsWith('https://'))) {
    return output;
  }
  
  // If output is an array, check the first element or find first URL
  if (Array.isArray(output)) {
    if (output.length === 0) return null;
    
    // Look for first string that's a URL
    const urlItem = output.find(item => 
      typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))
    );
    
    if (urlItem) return urlItem;
    
    // If first item is string, assume it's the URL
    if (typeof output[0] === 'string') return output[0];
    
    // Check inside objects in the array
    if (typeof output[0] === 'object' && output[0] !== null) {
      for (const key of Object.keys(output[0])) {
        const value = output[0][key];
        if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
          return value;
        }
      }
    }
    
    return null;
  }
  
  // If output is an object, check common keys
  if (typeof output === 'object' && output !== null) {
    if ('url' in output && typeof output.url === 'string') return output.url;
    if ('image' in output && typeof output.image === 'string') return output.image;
    if ('video' in output && typeof output.video === 'string') return output.video;
    
    // Check for nested 'output' key
    if ('output' in output) {
      return extractOutputUrl(output.output);
    }
    
    // Last resort: look for any value that looks like a URL
    for (const key of Object.keys(output)) {
      const value = output[key];
      if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
        return value;
      }
    }
  }
  
  console.warn("Could not extract URL from output:", JSON.stringify(output));
  return null;
}

// Helper function to save media files from URL to storage
async function saveMediaToStorage(
  supabaseClient: any,
  mediaUrl: string,
  bucketName: string,
  folderName: string,
  fileName: string
): Promise<string> {
  try {
    // Generate full path including folder
    const fullPath = `${folderName}/${fileName}`;

    // Fetch the media from URL
    console.log(`Fetching media from: ${mediaUrl}`);
    const mediaResponse = await fetch(mediaUrl);
    
    if (!mediaResponse.ok) {
      throw new Error(`Failed to fetch media, status: ${mediaResponse.status}`);
    }
    
    const mediaBuffer = await mediaResponse.arrayBuffer();
    
    // Upload to storage
    console.log(`Uploading to: ${bucketName}/${fullPath}`);
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from(bucketName)
      .upload(fullPath, mediaBuffer, {
        contentType: mediaResponse.headers.get('content-type') || 'image/jpeg',
        upsert: true,
      });
    
    if (uploadError) {
      console.error(`Upload error: ${uploadError.message}`);
      return mediaUrl; // Return original URL on error as fallback
    }
    
    console.log(`Successfully uploaded media to ${bucketName}/${fullPath}`);
    
    // Get the public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(fullPath);

    // Ensure the URL has the download parameter for direct access
    let accessibleUrl = publicUrl;
    if (!accessibleUrl.includes('?')) {
      accessibleUrl = `${accessibleUrl}?download=true`;
    } else if (!accessibleUrl.includes('download=true')) {
      accessibleUrl = `${accessibleUrl}&download=true`;
    }
    
    console.log(`Generated accessible URL: ${accessibleUrl}`);
    
    // Test that the URL is actually accessible
    try {
      // Simple HEAD request to check URL accessibility
      const testResponse = await fetch(accessibleUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        console.warn(`URL not directly accessible (status ${testResponse.status}), trying signed URL`);
        
        // Try creating a signed URL for better accessibility
        const { data: signedData, error: signedError } = await supabaseClient.storage
          .from(bucketName)
          .createSignedUrl(fullPath, 60 * 60 * 24); // 24 hour expiration
          
        if (signedError) {
          console.error(`Failed to create signed URL: ${signedError.message}`);
        } else if (signedData?.signedUrl) {
          console.log(`Using signed URL for better accessibility: ${signedData.signedUrl}`);
          return signedData.signedUrl;
        }
      } else {
        console.log(`URL accessibility check passed: ${accessibleUrl}`);
      }
    } catch (testError) {
      console.warn(`Error testing URL accessibility: ${testError instanceof Error ? testError.message : String(testError)}`);
      // Continue with the URL we have - we'll try to make it work client-side
    }
    
    return accessibleUrl;
  } catch (error: unknown) {
    console.error(`Error saving media to storage: ${error instanceof Error ? error.message : String(error)}`);
    // Return original media URL as fallback in case of any errors
    return mediaUrl;
  }
}

/**
 * Updates a history record with new status
 */
async function updateHistoryRecord(params: {
  id?: string;
  predictionId?: string;
  isFaceSwapPrediction?: boolean;
  status: string;
  statusMessage?: string;
  progress?: number;
  mediaUrl?: string;
  originalUrl?: string;
  errorMessage?: string;
  faceSwapPredictionId?: string;
  completedAt?: boolean;
}): Promise<void> {
  try {
    const {
      id,
      predictionId,
      isFaceSwapPrediction,
      status,
      statusMessage,
      progress,
      mediaUrl,
      originalUrl,
      errorMessage,
      faceSwapPredictionId,
      completedAt
    } = params;
    
    if (!id && !predictionId) {
      throw new Error('Either id or predictionId must be provided to update history');
    }
    
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (statusMessage) updateData.status_message = statusMessage;
    if (progress !== undefined) updateData.progress = progress;
    if (mediaUrl) updateData.media_url = mediaUrl;
    if (originalUrl) updateData.original_url = originalUrl;
    if (errorMessage) updateData.error_message = errorMessage;
    if (faceSwapPredictionId) updateData.face_swap_prediction_id = faceSwapPredictionId;
    if (completedAt) updateData.completed_at = new Date().toISOString();
    
    let query = supabase.from('creation_history').update(updateData);
    
    if (id) {
      query = query.eq('id', id);
    } else if (predictionId) {
      const idField = isFaceSwapPrediction ? 'face_swap_prediction_id' : 'replicate_prediction_id';
      query = query.eq(idField, predictionId);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Failed to update history record:', error);
      throw error;
    }
    
    console.log(`Updated history record with status '${status}'${id ? ` (id: ${id})` : ` (predictionId: ${predictionId})`}`);
  } catch (error) {
    console.error('Error updating history record:', error);
    // Don't throw, as this is non-critical
  }
}

/**
 * Prepares an image by ensuring it has public accessibility for Replicate
 * Creates signed URLs for Supabase storage URLs
 */
async function prepareImageForReplicate(imageUrl: string): Promise<string> {
  console.log(`🔍 Preparing image for Replicate: ${imageUrl}`);
  
  // If URL already has a signature or download parameter, use it as is
  if (imageUrl.includes('?token=') || imageUrl.includes('?download=true')) {
    console.log(`✅ URL already has access parameter, using as is`);
    return imageUrl;
  }
  
  // Special handling for user-uploads bucket which has different permissions
  if (imageUrl.includes('user-uploads')) {
    console.log(`🔑 Image is from user-uploads bucket, needs special handling`);
    
    try {
      // Extract bucket and path from URL
      const urlParts = imageUrl.split('/storage/v1/object/public/');
      if (urlParts.length !== 2) {
        console.warn(`Invalid Supabase URL format, adding download parameter instead`);
        const urlWithDownload = `${imageUrl}?download=true`;
        return urlWithDownload;
      }
      
      const parts = urlParts[1].split('/');
      const bucket = parts[0];
      const path = parts.slice(1).join('/');
      
      console.log(`Bucket: ${bucket}, Path: ${path}`);
      
      // Create a signed URL with a 10-hour expiration for user content
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 36000); // 10 hour expiration
        
      if (signedUrlError) {
        console.error(`Error creating signed URL for user image: ${signedUrlError.message}`);
        
        // Try with public URL + download flag first
        const urlWithDownload = `${imageUrl}?download=true`;
        
        // Test if the download URL is accessible
        try {
          const testResponse = await fetch(urlWithDownload, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000) 
          });
          
          if (testResponse.ok) {
            console.log(`✅ User image accessible with download parameter: ${urlWithDownload}`);
            return urlWithDownload;
          }
        } catch (e) {
          console.warn(`User image not accessible with download parameter: ${e}`);
        }
        
        // If that doesn't work, try to download and convert to data URL as last resort
        try {
          console.log(`⚠️ Attempting to download and convert to data URL as last resort`);
          const response = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
          
          if (!response.ok) {
            throw new Error(`Failed to fetch user image: ${response.status}`);
          }
          
          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          
          console.log(`✅ Created data URL for user image: ${dataUrl.substring(0, 50)}...`);
          return dataUrl;
        } catch (downloadError) {
          console.error(`Failed to create data URL: ${downloadError}`);
          // Fall back to original URL as last resort
          return imageUrl;
        }
      }
      
      if (!signedUrlData?.signedUrl) {
        console.error(`No signed URL returned for user image`);
        // Fall back to download parameter
        const urlWithDownload = `${imageUrl}?download=true`;
        return urlWithDownload;
      }
      
      console.log(`✅ Created signed URL for user image: ${signedUrlData.signedUrl}`);
      return signedUrlData.signedUrl;
    } catch (error) {
      console.error(`Error processing user image URL: ${error}`);
      // Fall back to original URL
      return imageUrl;
    }
  }
  // If it's a Supabase URL from other buckets, create a signed URL
  else if (imageUrl.includes('supabase.co/storage/v1/object/public/')) {
    console.log(`Creating signed URL for Supabase storage`);
    
    try {
      // Extract bucket and path from URL
      const urlParts = imageUrl.split('/storage/v1/object/public/');
      if (urlParts.length !== 2) {
        console.warn(`Invalid Supabase URL format, adding download parameter instead`);
        const urlWithDownload = `${imageUrl}?download=true`;
        return urlWithDownload;
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
        console.error(`Error creating signed URL: ${signedUrlError.message}`);
        // Fall back to download parameter
        const urlWithDownload = `${imageUrl}?download=true`;
        console.log(`✅ Falling back to download parameter: ${urlWithDownload}`);
        return urlWithDownload;
      }
      
      if (!signedUrlData?.signedUrl) {
        console.error(`No signed URL returned`);
        // Fall back to download parameter
        const urlWithDownload = `${imageUrl}?download=true`;
        console.log(`✅ Falling back to download parameter: ${urlWithDownload}`);
        return urlWithDownload;
      }
      
      console.log(`✅ Created signed URL: ${signedUrlData.signedUrl}`);
      return signedUrlData.signedUrl;
    } catch (error) {
      console.error(`Error processing Supabase URL: ${error}`);
      // Fall back to download parameter
      const urlWithDownload = `${imageUrl}?download=true`;
      console.log(`✅ Added download parameter to Supabase URL after error: ${urlWithDownload}`);
      return urlWithDownload;
    }
  }
  
  // For non-Supabase URLs, return as is
  console.log(`✅ Non-Supabase URL, using as is`);
  return imageUrl;
}

/**
 * Records that a face swap operation has started in the history record
 */
async function recordFaceSwapStarted(historyId: string, predictionId: string) {
  try {
    await updateHistoryRecord({
      id: historyId,
      status: 'face_swap_started',
      statusMessage: 'Base image generated, starting face swap process',
      progress: 50,
      faceSwapPredictionId: predictionId
    });
    console.log(`Updated history ${historyId} with face swap prediction ${predictionId}`);
  } catch (error) {
    console.error(`Failed to update history record for face swap start:`, error);
    // Non-critical error, don't throw
  }
}

// New interface for startFaceSwap parameters
interface FaceSwapParams {
  baseImageUrl: string;
  portraitUrl: string;
  upscale?: boolean;
}

/**
 * Starts the face swap process using the base image and user portrait
 */
async function startFaceSwap(params: FaceSwapParams): Promise<{ predictionId: string }> {
  const { baseImageUrl, portraitUrl } = params;
  
  try {
    console.log(`🚀 STARTING FACE SWAP PROCESS`);
    console.log(`📄 Original base image: ${baseImageUrl}`);
    console.log(`👤 Original portrait: ${portraitUrl}`);
    
    // Prepare both URLs for Replicate access (create signed URLs if needed)
    console.log(`🔄 Creating signed URLs for Replicate access...`);
    const accessibleBaseUrl = await prepareImageForReplicate(baseImageUrl);
    const accessiblePortraitUrl = await prepareImageForReplicate(portraitUrl);
    
    console.log(`🔗 Prepared base image URL: ${accessibleBaseUrl}`);
    console.log(`🔗 Prepared portrait URL: ${accessiblePortraitUrl}`);
    
    // Validate URLs are directly accessible with full content fetch (not just HEAD)
    console.log(`🧪 Testing URL full accessibility...`);
    let baseImageAccessible = false;
    let portraitImageAccessible = false;
    
    try {
      console.log(`Testing base image content...`);
      const baseResponse = await fetch(accessibleBaseUrl, { 
        headers: { 'User-Agent': 'VisionaryAI-Service/1.0' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (baseResponse.ok) {
        const blob = await baseResponse.blob();
        console.log(`📄 Base image accessibility: OK - ${baseResponse.status}, Size: ${blob.size} bytes, Type: ${blob.type}`);
        baseImageAccessible = blob.size > 0;
      } else {
        console.error(`❌ Base image not accessible: ${baseResponse.status} ${baseResponse.statusText}`);
      }
    } catch (baseError) {
      console.error(`❌ Error testing base image: ${baseError instanceof Error ? baseError.message : String(baseError)}`);
    }
    
    try {
      console.log(`Testing portrait image content...`);
      const portraitResponse = await fetch(accessiblePortraitUrl, { 
        headers: { 'User-Agent': 'VisionaryAI-Service/1.0' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (portraitResponse.ok) {
        const blob = await portraitResponse.blob();
        console.log(`👤 Portrait accessibility: OK - ${portraitResponse.status}, Size: ${blob.size} bytes, Type: ${blob.type}`);
        portraitImageAccessible = blob.size > 0;
      } else {
        console.error(`❌ Portrait not accessible: ${portraitResponse.status} ${portraitResponse.statusText}`);
      }
    } catch (portraitError) {
      console.error(`❌ Error testing portrait: ${portraitError instanceof Error ? portraitError.message : String(portraitError)}`);
    }
    
    if (!baseImageAccessible) {
      console.warn(`⚠️ Base image may not be accessible to Replicate`);
    }
    
    if (!portraitImageAccessible) {
      console.warn(`⚠️ Portrait image may not be accessible to Replicate`);
    }
    
    // Request face swap from Replicate
    console.log("📡 Submitting face swap request to Replicate...");
    console.log(`🔍 Final base image URL: ${accessibleBaseUrl}`);
    console.log(`🔍 Final portrait URL: ${accessiblePortraitUrl}`);
    
    // Direct logging of request payload
    const requestPayload = {
      version: FACE_SWAP_MODEL_VERSION,
      input: {
        input_image: accessibleBaseUrl,
        swap_image: accessiblePortraitUrl
      }
    };
    
    console.log(`📦 Replicate request payload: ${JSON.stringify(requestPayload)}`);
    
    const prediction = await replicate.predictions.create(requestPayload);
    
    console.log(`🔍 Raw prediction response: ${JSON.stringify(prediction)}`);
    console.log(`✅ Face swap prediction submitted successfully with ID: ${prediction.id}`);
    console.log(`⏳ Face swap is now processing at Replicate. Check the status with this ID: ${prediction.id}`);
    
    return { predictionId: prediction.id };
  } catch (error) {
    console.error(`❌ Error starting face swap:`, error);
    // Add more detailed error logging
    if (error instanceof Error) {
      console.error(`❌ Error name: ${error.name}`);
      console.error(`❌ Error message: ${error.message}`);
      console.error(`❌ Error stack: ${error.stack}`);
    }
    throw new Error(`Failed to start face swap: ${error instanceof Error ? error.message : String(error)}`);
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

  // Verify this is a POST request
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" } }
    );
  }
  
  // Verify API token
  if (!REPLICATE_API_TOKEN) {
    return new Response(
      JSON.stringify({ success: false, error: "Server configuration error: Replicate API token missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  try {
    // Parse request
    const requestBody = await req.json();
    console.log("Received status check request:", JSON.stringify(requestBody));
    
    const {
      predictionId,
      historyId,
      needsFaceSwap = false,
      faceSwapInputImage,
      isFaceSwapPrediction = false,
    } = requestBody;
    
    if (!predictionId) {
      throw new Error("Missing 'predictionId' in request");
    }
    
    console.log(`Checking status for prediction: ${predictionId} (${isFaceSwapPrediction ? 'Face Swap' : 'Base Generation'})`);
    
    // Get prediction status from Replicate
    const prediction = await replicate.predictions.get(predictionId);
    console.log(`Prediction status: ${prediction.status}`);
    
    // Prepare response
    const response: Record<string, any> = {
      success: true,
      predictionId,
      historyId,
      status: prediction.status,
      isFaceSwapPrediction,
      needsFaceSwap
    };
    
    // Check if face swap prediction has been stuck in 'starting' for too long (3+ minutes)
    const createdAtTime = prediction.created_at ? new Date(prediction.created_at) : null;
    
    // Get metadata to check if cancellation was already attempted
    let hasCancellationAttempted = false;
    try {
      const { data: metadataRecord } = await supabase
        .from('processing_metadata')
        .select('*')
        .eq('prediction_id', predictionId)
        .single();
      
      hasCancellationAttempted = metadataRecord?.cancellation_attempted || false;
    } catch (error) {
      console.warn(`Failed to retrieve metadata: ${error}`);
    }
    
    // Get history record to retrieve URLs if needed for restart
    let baseUrl = '';
    let faceUrl = '';
    try {
      const { data: historyRecord } = await supabase
        .from('creation_history')
        .select('*')
        .eq('id', historyId)
        .single();
      
      if (historyRecord) {
        baseUrl = historyRecord.media_url || historyRecord.original_url || '';
        faceUrl = historyRecord.face_swap_target_url || historyRecord.face_swap_input_image || '';
      }
    } catch (error) {
      console.warn(`Failed to retrieve history record: ${error}`);
    }
    
    if (
      prediction.status === 'starting' && 
      createdAtTime &&
      !hasCancellationAttempted &&
      (new Date().getTime() - createdAtTime.getTime()) > 3 * 60 * 1000 // 3 minutes
    ) {
      const elapsedMinutes = (new Date().getTime() - createdAtTime.getTime()) / (60 * 1000);
      console.warn(`Face swap prediction ${predictionId} has been in 'starting' state for ${elapsedMinutes.toFixed(1)} minutes. Attempting restart.`);
      
      try {
        // Try to cancel the stuck prediction
        console.log(`Attempting to cancel stuck prediction: ${predictionId}`);
        await replicate.predictions.cancel(predictionId);
        
        // Update history with cancellation attempt
        const { error: updateError } = await supabase
          .from('processing_metadata')
          .update({ 
            cancellation_attempted: true 
          })
          .eq('prediction_id', predictionId);
        
        if (updateError) {
          console.error(`Error updating history with cancellation flag: ${updateError.message}`);
        }
        
        // Try to restart the face swap with proper parameters
        if (baseUrl && faceUrl) {
          // Call startFaceSwap with correct parameters based on function signature
          const retryStartResult = await startFaceSwap({
            baseImageUrl: baseUrl,
            portraitUrl: faceUrl
          });
          
          if (retryStartResult && retryStartResult.predictionId) {
            console.log(`Successfully restarted face swap with new prediction ID: ${retryStartResult.predictionId}`);
            
            // Update history with the new prediction ID
            const { error: retryUpdateError } = await supabase
              .from('creation_history')
              .update({ 
                face_swap_prediction_id: retryStartResult.predictionId,
                face_swap_restarted: true,
                message: 'Face swap was stuck and has been automatically restarted.',
                progress: 50, // Reset progress for the new attempt
              })
              .eq('id', historyId);
            
            if (retryUpdateError) {
              console.error(`Error updating history with new face swap ID: ${retryUpdateError.message}`);
            }
            
            // Return response with flag and new prediction ID
            response.status = 'transitioning_to_face_swap';
            response.nextPredictionId = retryStartResult.predictionId;
            response.message = 'Face swap was stuck in starting state and has been automatically restarted.';
            response.faceSwapRestarted = true;
            response.newPredictionId = retryStartResult.predictionId;
            response.isLikelyStuck = true;
            response.elapsedMinutes = elapsedMinutes;
            
            return new Response(JSON.stringify(response), {
              status: 200,
              headers: corsHeaders,
            });
          } else {
            console.error('Failed to restart face swap after cancellation.');
          }
        } else {
          console.error('Missing base URL or face URL for restart');
        }
      } catch (error) {
        console.error(`Error during face swap restart: ${error}`);
      }
      
      // Even if restart fails, add indicators to the response
      response.isLikelyStuck = true;
      response.elapsedMinutes = elapsedMinutes;
      response.message = 'Face swap appears to be stuck in the starting phase. This may indicate image access issues.';
    }
    
    // Handle different statuses
    switch (prediction.status) {
      case "starting": {
        response.message = isFaceSwapPrediction ? "Starting face swap..." : "Starting dream generation...";
        response.progress = isFaceSwapPrediction ? 50 : 15;
        
        // Update history
        if (historyId) {
          await updateHistoryRecord({
            id: historyId,
            status: isFaceSwapPrediction ? 'face_swap_starting' : 'processing',
            statusMessage: response.message,
            progress: response.progress
          });
        }
        break;
      }
        
      case "processing": {
        response.message = isFaceSwapPrediction ? "Processing face swap..." : "Generating your dream...";
        response.progress = isFaceSwapPrediction ? 60 : 30;
        
        // Update history
        if (historyId) {
          await updateHistoryRecord({
            id: historyId,
            status: isFaceSwapPrediction ? 'face_swap_processing' : 'processing',
            statusMessage: response.message,
            progress: response.progress
          });
        }
        break;
      }
        
      case "succeeded": {
        console.log(`Prediction ${predictionId} succeeded. Output:`, JSON.stringify(prediction.output));
        
        // Extract output URL
        const outputUrl = extractOutputUrl(prediction.output);
        if (!outputUrl) {
          throw new Error(`Prediction succeeded but no output URL found. Output: ${JSON.stringify(prediction.output)}`);
        }
        
        response.outputUrl = outputUrl;
        
        // --- For Face Swap Completion ---
        if (isFaceSwapPrediction) {
          console.log(`📸 FACE SWAP COMPLETE - REPLICATE RETURNED URL: ${outputUrl}`);
          console.log(`Face swap prediction ID: ${predictionId}, raw output: ${JSON.stringify(prediction.output)}`);
          
          response.message = "Face swap completed successfully";
          response.progress = 100;
          
          try {
            // First check if this prediction has already been saved
            const { data: existingRecord } = await supabase
              .from('creation_history')
              .select('media_url, face_swap_saved_to_storage')
              .eq('face_swap_prediction_id', predictionId)
              .single();
            
            let publicUrl = outputUrl;
            
            // Only save if we haven't saved it before (checking the face_swap_saved_to_storage flag)
            if (!existingRecord?.face_swap_saved_to_storage || existingRecord.media_url === 'pending') {
              console.log(`🔄 Now saving the final face swap result from Replicate URL: ${outputUrl}`);
              publicUrl = await saveMediaToStorage(supabase, outputUrl, 'ai-generated', 'final', `final_result_${crypto.randomUUID().substring(0, 8)}.jpg`);
              console.log(`✅ Successfully saved face swap to Supabase at: ${publicUrl}`);
              
              // Update the flag to indicate we've saved this result
              await supabase
                .from('creation_history')
                .update({ face_swap_saved_to_storage: true })
                .eq('id', historyId);
            } else {
              console.log(`⏩ Face swap result already saved for prediction ${predictionId}, using existing URL: ${existingRecord.media_url}`);
              publicUrl = existingRecord.media_url;
            }
            
            response.finalResultUrl = publicUrl;
            
            // Update history
            if (historyId) {
              await updateHistoryRecord({
                id: historyId,
                status: 'completed',
                statusMessage: 'Dream created successfully with face swap',
                progress: 100,
                mediaUrl: publicUrl,
                originalUrl: outputUrl,
                completedAt: true
              });
            }
          } catch (saveError) {
            console.error("Error saving face swap result:", saveError);
            response.message = "Face swap completed but failed to save result";
            response.error = `Failed to save face swap result: ${saveError instanceof Error ? saveError.message : String(saveError)}`;
            response.finalResultUrl = outputUrl; // Use original URL as fallback
            
            // Update history with error
            if (historyId) {
              await updateHistoryRecord({
                id: historyId,
                status: 'completed_with_error',
                statusMessage: 'Face swap completed but failed to save result',
                progress: 100,
                originalUrl: outputUrl,
                errorMessage: `Error saving face swap result: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
                completedAt: true
              });
            }
          }
        }
        // --- For Base Generation -> Start Face Swap ---
        else if (needsFaceSwap && faceSwapInputImage) {
          response.message = "Base image generated, starting face swap...";
          response.progress = 50;
          
          try {
            // DON'T save base image to storage - just use the URL directly
            const baseImageUrl = outputUrl; // Use original URL without saving
            response.baseImageUrl = baseImageUrl;
            
            try {
              console.log("Starting face swap with:", { 
                baseImageUrl: baseImageUrl,
                portraitUrl: faceSwapInputImage 
              });
              
              const faceSwapResult = await startFaceSwap({
                baseImageUrl: baseImageUrl,
                portraitUrl: faceSwapInputImage
              });
              
              response.faceSwapUrl = null; // Will be populated in next status check
              response.nextPredictionId = faceSwapResult.predictionId;
              response.status = 'transitioning_to_face_swap';
              
              if (historyId) {
                await updateHistoryRecord({
                  id: historyId,
                  status: 'face_swap_started',
                  statusMessage: "Face swap process started",
                  progress: 70,
                  faceSwapPredictionId: faceSwapResult.predictionId
                });
              }
            } catch (error) {
              console.error("Error starting face swap:", error);
              const errorMsg = error instanceof Error ? error.message : String(error);
              
              response.message = "Base image generated but face swap failed to start";
              response.error = `Failed to start face swap: ${errorMsg}`;
              response.finalResultUrl = baseImageUrl; // Use base image as fallback
              
              // Update history with error
              if (historyId) {
                await updateHistoryRecord({
                  id: historyId,
                  status: 'face_swap_failed',
                  statusMessage: response.message,
                  progress: 50,
                  mediaUrl: baseImageUrl,
                  originalUrl: outputUrl || '',
                  errorMessage: `Failed to start face swap: ${errorMsg}`,
                  completedAt: true
                });
              }
            }
          } catch (baseImageError) {
            console.error("Error preparing base image:", baseImageError);
            response.message = "Failed to prepare base image";
            response.error = baseImageError instanceof Error ? baseImageError.message : String(baseImageError);
            
            // Update history with error
            if (historyId) {
              await updateHistoryRecord({
                id: historyId,
                status: 'base_generation_completed_with_error',
                statusMessage: response.message,
                progress: 40,
                mediaUrl: outputUrl || '',
                errorMessage: response.error,
                completedAt: true
              });
            }
          }
        } 
        // --- Standard Completion (No Face Swap) ---
        else {
          response.message = "Dream generated successfully";
          response.progress = 100;
          
          try {
            // First check if this prediction has already been saved
            const { data: existingRecord } = await supabase
              .from('creation_history')
              .select('media_url, result_saved_to_storage')
              .eq('replicate_prediction_id', predictionId)
              .single();
            
            let publicUrl = outputUrl;
            
            // Only save if we haven't saved it before
            if (!existingRecord?.result_saved_to_storage || existingRecord.media_url === 'pending') {
              console.log(`🔄 Saving the final result from Replicate URL: ${outputUrl}`);
              publicUrl = await saveMediaToStorage(supabase, outputUrl, 'ai-generated', 'final', `final_result_${crypto.randomUUID().substring(0, 8)}.jpg`);
              console.log(`✅ Successfully saved result to Supabase at: ${publicUrl}`);
              
              // Update the flag to indicate we've saved this result
              await supabase
                .from('creation_history')
                .update({ result_saved_to_storage: true })
                .eq('id', historyId);
            } else {
              console.log(`⏩ Result already saved for prediction ${predictionId}, using existing URL: ${existingRecord.media_url}`);
              publicUrl = existingRecord.media_url;
            }
            
            response.finalResultUrl = publicUrl;
            
            // Update history
            if (historyId) {
              await updateHistoryRecord({
                id: historyId,
                status: 'completed',
                statusMessage: 'Dream created successfully',
                progress: 100,
                mediaUrl: publicUrl,
                originalUrl: outputUrl,
                completedAt: true
              });
            }
          } catch (saveError) {
            console.error("Error saving result:", saveError);
            response.message = "Dream generated but failed to save result";
            response.error = `Failed to save result: ${saveError instanceof Error ? saveError.message : String(saveError)}`;
            response.finalResultUrl = outputUrl; // Use original URL as fallback
            
            // Update history with error
            if (historyId) {
              await updateHistoryRecord({
                id: historyId,
                status: 'completed_with_error',
                statusMessage: 'Dream generated but failed to save result',
                progress: 100,
                originalUrl: outputUrl,
                errorMessage: `Error saving result: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
                completedAt: true
              });
            }
          }
        }
        break;
      }
        
      case "failed": {
        console.error(`Prediction ${predictionId} failed. Error:`, prediction.error);
        response.success = false;
        response.message = isFaceSwapPrediction ? "Face swap failed" : "Dream generation failed";
        response.error = prediction.error || "Unknown error";
        
        // Update history
        if (historyId) {
          await updateHistoryRecord({
            id: historyId,
            status: 'failed',
            statusMessage: response.message,
            progress: isFaceSwapPrediction ? 50 : 30,
            errorMessage: prediction.error || "Unknown error",
            completedAt: true
          });
        }
        break;
      }
        
      case "canceled": {
        console.warn(`Prediction ${predictionId} was canceled`);
        response.success = false;
        response.message = isFaceSwapPrediction ? "Face swap was canceled" : "Dream generation was canceled";
        
        // Update history
        if (historyId) {
          await updateHistoryRecord({
            id: historyId,
            status: 'canceled',
            statusMessage: response.message,
            progress: isFaceSwapPrediction ? 50 : 30,
            completedAt: true
          });
        }
        break;
      }
        
      default: {
        console.warn(`Prediction ${predictionId} has unexpected status: ${prediction.status}`);
        response.message = `Unexpected status: ${prediction.status}`;
        break;
      }
    }
    
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-visualization-status handler:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});