import { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

// Import existing components (will be used within new screen components)
import ImageUpload from './components/ImageUpload';
import GoalInput from './components/GoalInput';
import VisualizationDisplay from './components/VisualizationDisplay';

// --- New Screen Components (Basic structure) ---

function WelcomeScreen({ onStart }) {
  return (
    <div className="welcome-screen view-container">
      <h2>Welcome to VisionaryAI</h2>
      <p>Visualize your dreams by seeing yourself in the spot you want to be.</p>
      <p>Upload a clear photo of your face, describe your dream scene, choose image or video output, and let AI bring your vision to life!</p>
      <button onClick={onStart} className="start-button">Start Visualizing</button>
    </div>
  );
}

function WorkflowScreen({ 
  onVisualize, 
  userImageFile, 
  setUserImageFile,
  goalText,
  setGoalText,
  generationType, // 'image' or 'video'
  setGenerationType,
  selectedModel,
  setSelectedModel,
  isLoading // Pass loading state to disable button
}) {
  
  const handleFileSelected = (file) => {
    setUserImageFile(file);
    // Add any validation if needed
  };

  // Image models
  const imageModels = [
    { id: 'flux-schnell', name: 'FLUX Schnell (Fast)' },
    { id: 'flux-1.1-pro', name: 'FLUX 1.1 Pro (High Quality)' },
    { id: 'flux-dev', name: 'FLUX Dev' },
    { id: 'ideogram-v2', name: 'Ideogram v2' },
    { id: 'recraft-v3', name: 'Recraft v3' },
    { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL' },
  ];

  // Video models
  const videoModels = [
    { id: 'tencent-hunyuan-video', name: 'Tencent Hunyuan Video' },
    { id: 'minimax-video-01', name: 'Minimax Video-01 (Hailuo)' },
    { id: 'zeroscope-v2-xl', name: 'Zeroscope v2 XL' },
    { id: 'stable-video-diffusion', name: 'Stable Video Diffusion' },
    { id: 'wan-2.1-t2v', name: 'WAN 2.1 Text-to-Video' },
  ];

  // Handle model selection
  const handleModelChange = (e) => {
    setSelectedModel({
      ...selectedModel,
      [generationType]: e.target.value
    });
  };

  return (
    <div className="workflow-screen view-container">
      <h2>Create Your Vision</h2>
      
      <div className="workflow-step">
        <h3>1. Upload Your Photo (Optional)</h3>
        <p className="step-info">Upload a clear photo of your face if you want to see yourself in the scene (enables face swap).</p>
        {/* Assuming ImageUpload takes onFileSelect prop */}
        <ImageUpload onFileSelect={handleFileSelected} /> 
      </div>

      <div className="workflow-step">
        <h3>2. Describe Your Dream Scene</h3>
        {/* Assuming GoalInput takes goal, onGoalChange, generationType */}
        <GoalInput 
          goal={goalText} 
          onGoalChange={setGoalText} 
          generationType={generationType} 
        />
      </div>

      <div className="workflow-step">
        <h3>3. Choose Output Format</h3>
        <div className="generation-type-selector simple">
           <div>
             <input 
               type="radio" 
               id="type-image"
               name="generationType" 
               value="image" 
               checked={generationType === 'image'} 
               onChange={(e) => setGenerationType(e.target.value)}
               disabled={isLoading}
             />
             <label htmlFor="type-image">Image</label>
           </div>
           <div>
             <input 
               type="radio" 
               id="type-video"
               name="generationType" 
               value="video" 
               checked={generationType === 'video'} 
               onChange={(e) => setGenerationType(e.target.value)}
               disabled={isLoading}
             />
             <label htmlFor="type-video">Video</label>
           </div>
        </div>
      </div>

      <div className="workflow-step">
        <h3>4. Select AI Model</h3>
        <p className="step-info">Choose the AI model that will generate your dream.</p>
        <div className="model-selector">
          <select 
            value={selectedModel[generationType]} 
            onChange={handleModelChange}
            disabled={isLoading}
            className="model-select"
          >
            {generationType === 'image' ? (
              imageModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))
            ) : (
              videoModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
      
      <div className="workflow-step action-section">
         <button 
           onClick={onVisualize} 
           // Disable button if loading or no prompt text
           disabled={isLoading || !goalText.trim()} 
           className="visualize-button"
         >
           {isLoading ? 'Generating...' : 'Generate Dream'}
         </button>
      </div>
    </div>
  );
}

function LoadingScreen({ type, model }) {
   // Map model IDs to readable names
   const modelNames = {
     'flux-schnell': 'FLUX Schnell',
     'flux-1.1-pro': 'FLUX 1.1 Pro',
     'flux-dev': 'FLUX Dev',
     'ideogram-v2': 'Ideogram v2',
     'recraft-v3': 'Recraft v3',
     'stable-diffusion-xl': 'Stable Diffusion XL',
     'tencent-hunyuan-video': 'Tencent Hunyuan Video',
     'minimax-video-01': 'Minimax Video-01',
     'zeroscope-v2-xl': 'Zeroscope v2 XL',
     'stable-video-diffusion': 'Stable Video Diffusion',
     'wan-2.1-t2v': 'WAN 2.1'
   };

   const modelName = modelNames[model] || model;

   return (
     <div className="loading-screen view-container">
       <div className="loading">
         <p>Creating your {type || 'dream'}...</p>
         <div className="loading-spinner"></div>
         <p className="loading-hint">This might take a moment. AI generation can take up to a minute.</p>
         <p className="model-info">Using {modelName} model</p>
       </div>
     </div>
   );
}

function ResultScreen({ mediaUrl, mediaType, error, onStartOver }) {
  return (
    <div className="result-screen view-container">
       {/* Assuming VisualizationDisplay takes mediaUrl, mediaType, isLoading, error */}
       <VisualizationDisplay 
         mediaUrl={mediaUrl}
         mediaType={mediaType}
         isLoading={false} // Loading is handled by LoadingScreen view
         error={error} // Display error if it occurred before showing result (though unlikely with current flow)
       />
       <button onClick={onStartOver} className="start-over-button">Create Another Dream</button>
    </div>
  );
}

// --- Main App Component ---

function App() {
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('welcome'); // 'welcome', 'workflow', 'loading', 'result'
  
  // Workflow State
  const [userImageFile, setUserImageFile] = useState(null);
  const [goalText, setGoalText] = useState('');
  const [generationType, setGenerationType] = useState('image'); // Default to image
  
  // Model Selection
  const [selectedModel, setSelectedModel] = useState({
    image: 'flux-schnell',
    video: 'tencent-hunyuan-video'
  });
  
  // Result State
  const [resultMedia, setResultMedia] = useState(null); // URL of the result
  const [resultMediaType, setResultMediaType] = useState('image'); // Type of the result ('image' or 'video')
  
  // Status State
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState('');

  // --- Auth Effect ---
  useEffect(() => {
     supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // If not logged in, stay on welcome, otherwise maybe workflow? Let's stick to welcome.
      // setCurrentView(session ? 'workflow' : 'welcome'); 
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Reset state and view on logout
      if (_event === 'SIGNED_OUT') {
        setUserImageFile(null);
        setGoalText('');
        setResultMedia(null);
        setError('');
        setGenerationType('image');
        setCurrentView('welcome'); 
        setIsLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- Helper Functions ---
  const createStoragePath = (file) => {
    const fileExt = file.name.split('.').pop();
    const uniqueId = crypto.randomUUID();
    return `public/${uniqueId}.${fileExt}`;
  };

  // --- Event Handlers ---
  const handleStartWorkflow = () => {
    // Reset workflow/result state when starting a new one
    setUserImageFile(null); // Clear previous image
    setGoalText('');      // Clear previous prompt
    setGenerationType('image'); // Reset to default type
    setSelectedModel({
      image: 'flux-schnell',
      video: 'tencent-hunyuan-video'
    });
    setResultMedia(null);
    setError('');
    setIsLoading(false);
    setCurrentView('workflow');
  };

  const handleVisualizeClick = async () => {
    // Basic validation
    if (!goalText.trim()) {
      setError('Please describe your dream scene.');
      // Stay on workflow view, display error (error state is not currently shown in WorkflowScreen, might need adding)
      return; 
    }

    setCurrentView('loading');
    setIsLoading(true); 
    setError('');
    setResultMedia(null);

    try {
      const enableFaceSwap = !!userImageFile; // Enable face swap if an image is provided
      const currentModelId = selectedModel[generationType]; // Get the selected model for the current generation type

      // Prepare the request body
      const requestBody = {
        generationType, 
        prompt: goalText,
        enableFaceSwap,
        modelId: currentModelId, // Use the selected model
        faceSwapTargetType: generationType, // Target matches output type
        parameters: {} // Keep parameters object, can add advanced options later
      };

      // Upload image if face swap is enabled
      if (enableFaceSwap) {
        if (!userImageFile) throw new Error("Internal error: Face swap enabled but no image file."); 

        const filePath = createStoragePath(userImageFile);
        console.log(`Uploading image to: ${filePath}`);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(filePath, userImageFile, {
             cacheControl: '3600', // Optional: Add cache control
             upsert: false // Optional: Don't overwrite existing file with same name
          });
        if (uploadError) throw new Error(`Failed to upload image: ${uploadError.message}`);
        console.log("Upload successful:", uploadData);

        const { data: urlData } = supabase.storage.from('user-uploads').getPublicUrl(uploadData.path);
        if (!urlData?.publicUrl) throw new Error('Could not retrieve public URL for the uploaded image.');
        requestBody.imagePath = urlData.publicUrl;
        console.log("Public Image URL:", requestBody.imagePath);
      }

      // Invoke Supabase Edge Function
      console.log("Invoking visualize-dream with body:", requestBody); 
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'visualize-dream', { body: requestBody }
      );

      console.log("Function Response Data:", functionData); // Log response

      if (functionError) {
         // Try to get more specific error from context if available
         const detailedError = functionError.context?.errorMessage || functionError.message;
         throw new Error(`Generation failed: ${detailedError}`);
      }
      if (!functionData?.resultUrl) throw new Error('No result URL was returned from the generation service.');

      // Store result and update view
      setResultMedia(functionData.resultUrl);
      setResultMediaType(functionData.generationType || 'image'); // Use type from response
      setCurrentView('result');

    } catch (err) {
      console.error("Visualization Click Error:", err);
      setError(err.message || 'An unexpected error occurred.');
      setCurrentView('workflow'); // Go back to workflow on error
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Logic ---
  const renderCurrentView = () => {
    switch (currentView) {
      case 'workflow':
        return (
          <WorkflowScreen 
            onVisualize={handleVisualizeClick}
            userImageFile={userImageFile}
            setUserImageFile={setUserImageFile}
            goalText={goalText}
            setGoalText={setGoalText}
            generationType={generationType}
            setGenerationType={setGenerationType}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            isLoading={isLoading} // Pass loading state
          />
        );
      case 'loading':
        return <LoadingScreen type={generationType} model={selectedModel[generationType]} />; 
      case 'result':
        return (
          <ResultScreen 
            mediaUrl={resultMedia}
            mediaType={resultMediaType}
            error={error} // Pass error (though view changes, could show previous error briefly)
            onStartOver={handleStartWorkflow} 
          />
        );
      case 'welcome':
      default:
        // Pass handleStartWorkflow to the button
        return <WelcomeScreen onStart={handleStartWorkflow} />; 
    }
  };

  return (
    <div className="App">
      <header>
        <h1>VisionaryAI</h1>
        {/* Subtitle removed, handled in WelcomeScreen */}
      </header>

      {!session ? (
        // Auth UI
        <div className="auth-container view-container"> 
          <h2>Login or Sign Up</h2>
          <Auth
            supabaseClient={supabase}
            appearance={{ 
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'var(--primary-color)',
                      brandAccent: 'var(--primary-dark)',
                    },
                    radii: {
                      borderRadiusButton: 'var(--border-radius)',
                      inputBorderRadius: 'var(--border-radius)',
                    },
                  },
                },
             }}
            theme="light"
          />
        </div>
      ) : (
         // Render the current view based on state
         <div className="main-content">
           {error && currentView === 'workflow' && <p className="error-message main-error">{error}</p>} 
           {/* Show error prominently in workflow view */}
           {renderCurrentView()}
         </div>
      )}
      
      <footer>
        <p>VisionaryAI &copy; {new Date().getFullYear()} - Powered by AI</p>
      </footer>

      <div className="copyright">
        VisionaryAI &copy; {new Date().getFullYear()} - Powered by AI
      </div>
    </div>
  );
}

export default App;
