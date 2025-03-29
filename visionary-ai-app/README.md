# VisionaryAI - AI-Generated Visualizations

VisionaryAI is a web application that lets you visualize your dreams and ideas using state-of-the-art AI models. The app can generate images, videos, and even put your face into generated scenes.

## Features

- **Multiple Generation Types**:
  - Image generation
  - Video generation
  - Face swapping (put yourself in generated scenes)

- **Model Selection**:
  - Choose from a variety of top-tier AI models
  - Each model has unique strengths and capabilities
  - View model descriptions and capabilities before generating

- **Advanced Parameters**:
  - Fine-tune your generations with model-specific parameters
  - Control aspect ratios, negative prompts, video frames, and more

- **Visualization Displays**:
  - View generated images and videos directly in the app
  - Download your creations
  - Open in a new tab for better viewing

## How to Use

### 1. Sign Up or Log In

First, create an account or log in with your existing credentials.

### 2. Upload Your Photo (Optional for Images, Required for Face Swap)

If you want to generate a face swap, you'll need to upload a photo of yourself.

### 3. Choose Generation Type

Select the type of content you want to generate:
- **Generate Image**: Create a static image based on your description
- **Generate Video**: Create a short video clip based on your description
- **Face Swap**: Put yourself into a generated scene

### 4. Select a Model

Choose from available models for your selected generation type. Each model has a description and list of capabilities to help you choose the best one for your needs.

### 5. Enter Your Vision

Describe what you want to visualize. Be as descriptive as possible for the best results.

### 6. Set Advanced Parameters (Optional)

Click "Show Advanced Options" to fine-tune your generation with model-specific parameters:
- **Negative Prompt**: Describe what you don't want to see in the generation
- **Aspect Ratio**: Control the dimensions of your generated media
- **Number of Frames/FPS**: For video generation, control length and smoothness
- **Guidance Scale**: Control how closely the AI follows your prompt

### 7. Generate Your Vision

Click the "Generate" button and wait for your creation to appear.

### 8. Save or Share Your Creation

Once your image or video is generated, you can download it or open it in a new tab.

## Tips for Better Results

- **Be Descriptive**: The more details you provide in your prompt, the better results you'll get
- **Try Different Models**: Each model has different strengths and styles
- **Experiment with Parameters**: Fine-tune your results with advanced parameters
- **For Face Swapping**: Use a clear photo of your face, preferably with good lighting and a neutral expression

## Technical Details

This application uses:
- Supabase for authentication and storage
- Replicate.ai for accessing state-of-the-art AI models
- React.js for the frontend interface

## Development

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd visionary-ai-app

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file in the project root with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For Supabase Edge Functions, make sure to set up your REPLICATE_API_TOKEN in the Supabase dashboard.

## Credits

- AI models provided by Replicate.ai
- Built with React and Vite
- Powered by Supabase
