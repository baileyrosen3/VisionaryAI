# VisionaryAI

A powerful AI-powered image and video generation application with face swapping capabilities.

## Features

- Generate high-quality images and videos using various AI models
- Face swapping capabilities that integrate your face into the generated media
- Support for multiple state-of-the-art AI models including FLUX, Zeroscope, and more
- Detailed error reporting
- Expandable architecture

## Technology Stack

- Frontend: React 
- Backend: Supabase Edge Functions (Deno)
- AI Integration: Replicate API
- Storage: Supabase Storage

## Setup Instructions

### Prerequisites

- Supabase account
- Replicate API account
- Node.js (v16+)
- Supabase CLI

### Environment Variables

The following environment variables need to be set in your Supabase project:

```
SUPABASE_URL           # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY  # Your Supabase service role key (keep this secret!)
REPLICATE_API_TOKEN    # Your Replicate API token
```

**IMPORTANT: Never commit these values to your repository!**

### Deployment Steps

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd VisionaryAI
   ```

2. Install dependencies for the app
   ```bash
   cd visionary-ai-app
   npm install
   ```

3. Set up local Supabase development
   ```bash
   supabase init
   supabase start
   ```

4. Deploy the Edge Function
   ```bash
   supabase functions deploy visualize-dream
   ```

5. Start the frontend application
   ```bash
   npm run dev
   ```

## Usage

1. Select the generation type (image or video)
2. Choose an AI model
3. Enter a detailed prompt
4. Toggle face swap if desired and upload a face image
5. Click "Generate" and wait for the result

## API Reference

### Visualize Dream Function

The primary endpoint accepts POST requests with the following parameters:

```json
{
  "generationType": "image|video",
  "modelId": "flux-schnell|zeroscope-v2-xl|etc",
  "prompt": "Your detailed prompt here",
  "enableFaceSwap": true|false,
  "imagePath": "URL to face image (required if enableFaceSwap is true)",
  "faceSwapTargetType": "image|video",
  "parameters": {
    "imageGeneration": {},
    "videoGeneration": {},
    "faceSwap": {}
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE). 