import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './VisionFlow.css';

import ImageUpload from './ImageUpload';
import GoalInput from './GoalInput';
import PromptEnhancer from './PromptEnhancer';

import { supabase } from '../supabaseClient'; // Import supabase client

// Step indicators/progress component
function ProgressTracker({ currentStep, totalSteps, completedSteps, onClick }) {
  return (
    <motion.div
      className="progress-tracker"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="steps-container">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`step-indicator ${index + 1 === currentStep ? 'active' : ''} ${completedSteps.includes(index + 1) ? 'completed' : ''}`}
            onClick={() => completedSteps.includes(index + 1) && onClick(index + 1)}
          >
            <div className="step-circle">
              {completedSteps.includes(index + 1) ? (
                <motion.div
                  className="check-icon"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </motion.div>
              ) : (
                <span className="step-number">{index + 1}</span>
              )}
            </div>
            <div className="step-label-container">
              <span className="step-label">{getStepNameByIndex(index + 1)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(completedSteps.length / totalSteps) * 100}%` }}
        ></div>
      </div>
    </motion.div>
  );
}

// Helper function to get step name
function getStepNameByIndex(stepIndex) {
  const stepNames = [
    "Your Portrait",
    "Dream Scene",
    "Visualization",
    "Creative Style"
  ];
  return stepNames[stepIndex - 1] || `Step ${stepIndex}`;
}

// Motivational quotes for different steps
const motivationalQuotes = {
  1: [
    "Let your future self shine! Adding your photo makes the journey more personal.",
    "Seeing yourself in your dream environment helps your brain believe it's possible!",
    "A personalized vision creates a stronger emotional connection to your goals."
  ],
  2: [
    "The clearer your vision, the closer your reality.",
    "Dream big, describe in detail, and watch it materialize.",
    "Your words create worlds — what amazing place are you stepping into?"
  ],
  3: [
    "Movement creates motivation. See yourself in action!",
    "Static or dynamic - how do you best visualize success?",
    "The right format helps your brain process your vision as achievable."
  ],
  4: [
    "The right tool for the right job makes all the difference.",
    "Different styles activate different parts of your motivation centers.",
    "The final touch that brings your vision to life!"
  ]
};

// Function to get a random quote for a step
function getRandomQuote(step) {
  const quotesForStep = motivationalQuotes[step] || [];
  return quotesForStep[Math.floor(Math.random() * quotesForStep.length)] ||
    "Visualize your success, and you're halfway there.";
}

// Animations and variants for steps
const stepVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.4, 0, 0.2, 1],
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  },
  exit: {
    opacity: 0,
    y: -30,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  }
};

// New component to display visualization status
function VisualizationStatus({ status, enhancedPrompt }) {
  const [dots, setDots] = useState('');
  
  // Add animation for waiting indicators
  useEffect(() => {
    let animationTimer;
    // Only animate if we have status and if we're between 70-99% (face swap range)
    if (status && status.progress >= 70 && status.progress < 99) {
      animationTimer = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
    }
    
    return () => {
      if (animationTimer) clearInterval(animationTimer);
    };
  }, [status]);
  
  if (!status) return null;

  const { stage, progress, message, details } = status;
  
  // Modify message if in face swap range
  const displayMessage = (progress >= 70 && progress < 99) 
    ? `${message}${dots}` // Add animated dots
    : message;

  return (
    <div className="visualization-status">
      <div className="status-message">
        <span className="status-icon">
          {progress >= 100 ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <div className="spinner"></div>
          )}
        </span>
        {displayMessage}
      </div>
      
      {progress > 0 && (
        <div className="status-progress">
          <div className="progress-bar">
            <div
              className={`progress-fill ${progress >= 70 && progress < 99 ? 'face-swap-progress' : ''}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
      )}
      
      {details && <p className="status-details">{details}</p>}
      
      {/* Add special warning for face swap stage */}
      {progress >= 70 && progress < 99 && (
        <p className="face-swap-notice">
          Face swapping can take up to a minute. Please be patient while we process your image.
        </p>
      )}
      
      {enhancedPrompt && (
        <div className="enhanced-prompt">
          <h4>Creating with enhanced prompt:</h4>
          <p>{enhancedPrompt}</p>
        </div>
      )}
    </div>
  );
}

// Prompt template component
function PromptTemplates({ onSelectTemplate }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const templates = [
    {
      id: 1,
      category: "Everyday",
      title: "Professional Success",
      prompt: "A modern office with panoramic city views, me at an elegant desk, confidently leading a meeting with engaged colleagues, sunlight streaming through floor-to-ceiling windows."
    },
    {
      id: 2,
      category: "Everyday",
      title: "Peaceful Retreat",
      prompt: "A serene lakeside cabin surrounded by pine trees, me relaxing on a wooden deck with a hot beverage, watching the sunset reflect on calm waters, feeling completely at peace."
    },
    {
      id: 3,
      category: "Moderate",
      title: "Dream Vacation",
      prompt: "Me walking along a pristine white sand beach in Bali, crystal-clear turquoise waters beside me, palm trees swaying in the gentle breeze, with a luxurious beachfront villa visible in the background."
    },
    {
      id: 4,
      category: "Moderate",
      title: "Athletic Achievement",
      prompt: "Me crossing the finish line of a marathon, arms raised in triumph, surrounded by cheering crowds, with a look of determination and accomplishment on my face, official race clock showing a personal best time."
    },
    {
      id: 5,
      category: "Moderate",
      title: "Public Speaking Success",
      prompt: "Me on stage at a TEDx event, confidently delivering a presentation to an attentive audience, large screens displaying impactful visuals, spotlight highlighting my composed and authoritative presence."
    },
    {
      id: 6,
      category: "Ambitious",
      title: "Award Recognition",
      prompt: "Me accepting a prestigious industry award on stage, spotlight illuminating my proud smile, applauding audience of professionals and celebrities, photographers capturing the moment, name displayed on a giant screen."
    },
    {
      id: 7,
      category: "Ambitious",
      title: "Extraordinary Wealth",
      prompt: "Me stepping out of a private jet onto a red carpet, luxury sports cars in the background, walking toward my coastal mansion with infinity pool overlooking the ocean, dressed in impeccable designer attire."
    },
    {
      id: 8,
      category: "Grandiose",
      title: "Celebrity Lifestyle",
      prompt: "Me at an exclusive Hollywood after-party, famous actors and directors engaged in conversation with me, paparazzi taking photos, my name on movie posters visible in the background."
    },
    {
      id: 9,
      category: "Grandiose",
      title: "World Impact",
      prompt: "Me shaking hands with world leaders at a global summit, my innovative solution to climate change being implemented, news cameras broadcasting worldwide, dignified applause from international delegates."
    },
    {
      id: 10,
      category: "Grandiose",
      title: "Superhuman Achievement",
      prompt: "Me setting a world record that defies human limitations, stadium filled with awestruck spectators, slow-motion cameras capturing the impossible feat, expressions of disbelief from expert commentators, front page headlines visible."
    }
  ];

  return (
    <div className="prompt-templates-accordion">
      <div
        className={`accordion-header ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="accordion-title">
          <span className="inspiration-icon">✨</span>
          Need inspiration? View dream scene templates
        </div>
        <span className="accordion-icon">
          {isExpanded ?
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 15l-6-6-6 6"/>
            </svg>
            :
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          }
        </span>
      </div>

      <motion.div
        className="accordion-content"
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0
        }}
        transition={{
          height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
          opacity: { duration: 0.2 }
        }}
      >
        {isExpanded && (
          <div className="prompt-templates-container">
            <div className="template-intro">From everyday dreams to grand visions - select a template to get started:</div>

            <div className="template-categories">
              <div className="category-scale">
                <span className="scale-label everyday">Everyday</span>
                <span className="scale-label moderate">Moderate</span>
                <span className="scale-label ambitious">Ambitious</span>
                <span className="scale-label grandiose">Grandiose</span>
                <div className="scale-bar"></div>
              </div>
            </div>

            <div className="template-grid">
              {templates.map(template => (
                <div
                  key={template.id}
                  className={`template-card ${template.category.toLowerCase()}`}
                  onClick={() => {
                    onSelectTemplate(template.prompt);
                    setIsExpanded(false);
                  }}
                >
                  <div className="template-header">
                    <span className="template-category">{template.category}</span>
                    <h4 className="template-title">{template.title}</h4>
                  </div>
                  <p className="template-prompt">{template.prompt}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function VisionFlow({
  onVisualize, // Keep this prop for potential future use or different logic paths
  userImageFile,
  setUserImageFile,
  goalText,
  setGoalText,
  generationType,
  setGenerationType,
  selectedModel,
  setSelectedModel,
  isLoading,
  setIsLoading,
  visualizationStatus,
  setVisualizationStatus,
  enhancedPrompt,
  setEnhancedPrompt,
  onVisualizationComplete // Add a new prop to pass the final result up
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [quote, setQuote] = useState(getRandomQuote(1));
  const confettiRef = useRef(null);
  const [originalText, setOriginalText] = useState('');
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [userOriginalInput, setUserOriginalInput] = useState('');

  // State for polling
  const [pollingIntervalId, setPollingIntervalId] = useState(null);
  // State for polling
  const pollingIntervalRef = useRef(null); // <<<< ADD THIS LINE HERE
  const [currentPredictionId, setCurrentPredictionId] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [initialStartData, setInitialStartData] = useState(null); // Store response from /visualize-dream

  // Moods and styles options
  const styleOptions = [
    { id: 'professional', label: 'Professional' },
    { id: 'creative', label: 'Creative' },
    { id: 'luxurious', label: 'Luxurious' },
    { id: 'modern', label: 'Modern' },
    { id: 'elegant', label: 'Elegant' },
    { id: 'technical', label: 'Technical' },
    { id: 'minimalist', label: 'Minimalist' },
    { id: 'futuristic', label: 'Futuristic' },
    { id: 'vintage', label: 'Vintage' },
    { id: 'abstract', label: 'Abstract' },
    { id: 'natural', label: 'Natural' },
    { id: 'industrial', label: 'Industrial' },
  ];

  // Mood options
  const moodOptions = [
    { id: 'peaceful', label: 'Peaceful' },
    { id: 'energetic', label: 'Energetic' },
    { id: 'joyful', label: 'Joyful' },
    { id: 'confident', label: 'Confident' },
    { id: 'serene', label: 'Serene' },
    { id: 'vibrant', label: 'Vibrant' },
    { id: 'ambitious', label: 'Ambitious' },
    { id: 'inspirational', label: 'Inspirational' },
    { id: 'nostalgic', label: 'Nostalgic' },
    { id: 'mysterious', label: 'Mysterious' },
    { id: 'hopeful', label: 'Hopeful' },
    { id: 'dramatic', label: 'Dramatic' },
  ];

  const [selectedStyles, setSelectedStyles] = useState([]);
  const [customStyles, setCustomStyles] = useState([]);
  const [customMoods, setCustomMoods] = useState([]);
  const [newStyleInput, setNewStyleInput] = useState('');
  const [newMoodInput, setNewMoodInput] = useState('');

  // Add state for tracking face swap active status
  const [isFaceSwapActive, setIsFaceSwapActive] = useState(false);
  // Track progress for smoother updates
  const currentProgressRef = useRef(0);
  
  // Detect when face swap becomes active
  useEffect(() => {
    if (initialStartData?.needsFaceSwap && 
        currentPredictionId && 
        initialStartData.predictionId !== currentPredictionId) {
      // We're now polling a face swap prediction
      console.log("Face swap phase detected - enabling smooth progress updates");
      setIsFaceSwapActive(true);
    } else if (!isPolling) {
      // Reset when polling stops
      setIsFaceSwapActive(false);
    }
  }, [currentPredictionId, initialStartData, isPolling]);
  
  // Add micro progress updates for face swap phase
  useEffect(() => {
    // Only activate during face swap polling
    if (!isPolling || !isFaceSwapActive) return;
    
    console.log("Starting face swap micro-progress timer");
    
    // Get current progress
    if (visualizationStatus?.progress) {
      currentProgressRef.current = visualizationStatus.progress;
    }
    
    // Update progress slightly every 1 second for smoother appearance
    const timer = setInterval(() => {
      // Only update if in the face swap range
      if (currentProgressRef.current >= 70 && currentProgressRef.current < 98) {
        // Smaller increments as we get closer to completion
        const increment = currentProgressRef.current < 85 ? 0.12 : 0.05;
        const newProgress = Math.min(currentProgressRef.current + increment, 98);
        currentProgressRef.current = newProgress;
        
        // Update visual status with tiny increment
        setVisualizationStatus(prev => ({
          ...prev,
          progress: newProgress
        }));
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isPolling, isFaceSwapActive, visualizationStatus]);

  useEffect(() => {
    // Update quote when step changes
    setQuote(getRandomQuote(currentStep));
  }, [currentStep]);

  // Function to toggle style selection
  const toggleStyle = (styleId) => {
    if (selectedStyles.includes(styleId)) {
      setSelectedStyles(selectedStyles.filter(id => id !== styleId));
    } else {
      setSelectedStyles([...selectedStyles, styleId]);
    }
  };

  // Function to toggle mood selection
  const toggleMood = (moodId) => {
    if (selectedMoods.includes(moodId)) {
      setSelectedMoods(selectedMoods.filter(id => id !== moodId));
    } else {
      setSelectedMoods([...selectedMoods, moodId]);
    }
  };

  // Function to add custom style
  const addCustomStyle = () => {
    if (newStyleInput.trim() !== '') {
      const styleId = `custom-style-${Date.now()}`;
      const newStyle = { id: styleId, label: newStyleInput.trim(), isCustom: true };
      setCustomStyles([...customStyles, newStyle]);
      setSelectedStyles([...selectedStyles, styleId]);
      setNewStyleInput('');
    }
  };

  // Function to add custom mood
  const addCustomMood = () => {
    if (newMoodInput.trim() !== '') {
      const moodId = `custom-mood-${Date.now()}`;
      const newMood = { id: moodId, label: newMoodInput.trim(), isCustom: true };
      setCustomMoods([...customMoods, newMood]);
      setSelectedMoods([...selectedMoods, moodId]);
      setNewMoodInput('');
    }
  };

  // Function to remove custom style
  const removeCustomStyle = (styleId) => {
    setCustomStyles(customStyles.filter(style => style.id !== styleId));
    setSelectedStyles(selectedStyles.filter(id => id !== styleId));
  };

  // Function to remove custom mood
  const removeCustomMood = (moodId) => {
    setCustomMoods(customMoods.filter(mood => mood.id !== moodId));
    setSelectedMoods(selectedMoods.filter(id => id !== moodId));
  };

  // Prepare style and mood parameters for the visualization API
  const getStyleAndMoodParams = () => {
    // Get all styles (predefined and custom)
    const allStyleOptions = [...styleOptions, ...customStyles];

    // Get all moods (predefined and custom)
    const allMoodOptions = [...moodOptions, ...customMoods];

    // Generate style context based on selections
    const selectedStyleLabels = selectedStyles.length > 0
      ? selectedStyles.map(id => allStyleOptions.find(o => o.id === id)?.label).filter(Boolean).join(', ')
      : '';

    // Generate mood context based on selections
    const selectedMoodLabels = selectedMoods.length > 0
      ? selectedMoods.map(id => allMoodOptions.find(o => o.id === id)?.label).filter(Boolean).join(', ')
      : '';

    return {
      style: selectedStyleLabels,
      mood: selectedMoodLabels
    };
  };

  const handleNext = async () => {
    // Mark step as complete before moving
    if (!completedSteps.includes(currentStep)) {
        let canComplete = false;
        switch (currentStep) {
            case 1: canComplete = true; break;
            case 2: canComplete = goalText && goalText.trim().length > 10; break;
            case 3: canComplete = true; break;
        }
        if (canComplete) {
            setCompletedSteps(prev => [...prev, currentStep]);
            // Trigger confetti only when newly completing a step (except step 1)
            if (currentStep > 1) {
                const canvas = confettiRef.current;
                if (canvas) {
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                }
            }
        }
    }

    if (currentStep < 4) {
      // Just go to next step
      setCurrentStep(currentStep + 1);
    } else {
      // We're in the final step (step 4), so start visualization
      await visualizeWithParams(); // Assuming this function exists or needs replacement
    }
  };

  // Refactored function to START visualization and initiate polling
  const startVisualization = async () => {
   // *** ADD VALIDATION HERE ***
   if (!generationType || (generationType !== 'image' && generationType !== 'video')) {
       console.error("Invalid generationType before starting visualization:", generationType);
       setVisualizationStatus({
           stage: "error",
           message: "Invalid Configuration",
           progress: 0,
           details: "Please select 'Image' or 'Video' format in Step 3 before proceeding."
       });
       setIsLoading(false); // Ensure loading state is reset
       return; // Stop execution
   }
   // *** END VALIDATION ***

    // Store the original text if it's the first time
    if (!userOriginalInput) {
      setUserOriginalInput(goalText);
    }

    // Reset status and set loading
    try {
       let uploadedImagePath = null; // Variable to store the uploaded image path
       setIsPolling(false); // Reset polling state
       setCurrentPredictionId(null); // Reset prediction ID
       setInitialStartData(null); // Reset initial data
      setIsLoading(true);
      setVisualizationStatus({
        stage: "preparing",
        message: "Preparing your vision",
        progress: 0,
        details: "Getting everything ready"
      });
      setEnhancedPrompt(''); // Clear previous enhanced prompt

       // --- Upload User Image if provided ---
       if (userImageFile instanceof File) { // Check if it's a File object
         setVisualizationStatus({ stage: "uploading_portrait", message: "Uploading your portrait...", progress: 5 });

         const { data: { session }, error: sessionError } = await supabase.auth.getSession();
         if (sessionError || !session?.user?.id) {
           throw new Error("User not authenticated or user ID missing.");
         }
         const userId = session.user.id;
         const fileExt = userImageFile.name.split('.').pop();
         const uniqueFileName = `${crypto.randomUUID()}.${fileExt}`;
         const filePath = `public/${userId}/${uniqueFileName}`; // Path within the bucket

         console.log(`Uploading user image to: user-uploads/${filePath}`);

         const { data: uploadData, error: uploadError } = await supabase.storage
           .from('user-uploads')
           .upload(filePath, userImageFile);

         if (uploadError) {
           console.error("Error uploading user image:", uploadError);
           throw new Error(`Failed to upload portrait: ${uploadError.message}`);
         }

         // Get the public URL after successful upload
         const { data: urlData } = supabase.storage.from('user-uploads').getPublicUrl(filePath);
         uploadedImagePath = urlData?.publicUrl;
         console.log("User image uploaded successfully. Public URL:", uploadedImagePath);
         setVisualizationStatus({ stage: "upload_complete", message: "Portrait uploaded", progress: 10 });
       }
       // --- End Upload User Image ---

      // Get style and mood parameters
      const { style, mood } = getStyleAndMoodParams();

      // Prepare request body
      const requestBody = {
        generationType,
        modelId: selectedModel[generationType],
        imagePath: uploadedImagePath, // Use the URL obtained after upload
        enableFaceSwap: !!uploadedImagePath, // Enable swap only if upload was successful
        faceSwapTargetType: generationType, // Use selected generation type as target
        prompt: goalText, // Send original prompt
        style,
        mood,
        parameters: {}, // Add any specific model params if needed
        detailedPromptFeedback: true // Request enhanced prompt in status updates
      };

      console.log("Sending request to visualize-dream:", requestBody);

      // Get Supabase token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("User not authenticated");
      }
      const token = session.access_token;

      // Call the function to START the process
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/visualize-dream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = `Failed to start visualization (HTTP ${response.status})`;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || JSON.stringify(errorData);
        } catch (parseError) {
            console.error("Failed to parse error response:", parseError);
            // errorMsg already set
        }
        throw new Error(errorMsg);
      }

      // Get prediction ID and other info from response
      const startDataResponse = await response.json();

      if (!startDataResponse.success || !startDataResponse.predictionId) {
        throw new Error(startDataResponse.error || "Failed to get prediction ID from server.");
      }

      console.log(`Visualization started. Initial Prediction ID: ${startDataResponse.predictionId}`);

      // Store prediction ID and start polling
      setInitialStartData(startDataResponse); // Store the whole initial response
      setCurrentPredictionId(startDataResponse.predictionId);
      setIsPolling(true); // Trigger the useEffect hook for polling

      // Update status to show processing has started
      setVisualizationStatus({
        stage: "processing_started",
        message: "Your vision is being generated...",
        progress: 15, // Or derive from backend if possible
        details: "Checking progress periodically."
      });

    } catch (error) {
      console.error("Error starting visualization:", error);
      const errorStatus = {
        stage: "error",
        message: "Failed to start visualization",
        progress: 0,
        details: error.message || "An unexpected error occurred"
      };
      setVisualizationStatus(errorStatus);
      setIsLoading(false);
      setIsPolling(false); // Ensure polling doesn't start on error
      if (onVisualizationComplete) {
          onVisualizationComplete(null, { status: errorStatus, error: error.message });
      }
    }
  };

  const pollStatus = useCallback(async (predictionIdToCheck) => {
    // Use a local variable to access initialStartData to avoid potential stale closure issues
    const currentInitialData = initialStartData;
    if (!predictionIdToCheck || !currentInitialData) {
        console.warn("Polling attempted without predictionId or initialStartData.");
        setIsPolling(false); // Stop if data is missing
        return;
    }

    // Determine if we are checking the base image when face swap is needed
    const isCheckingBaseImageForFaceSwap = predictionIdToCheck === currentInitialData.predictionId && currentInitialData.needsFaceSwap;
    // Identify if this is a face swap prediction (not the base image)
    const isFaceSwapPrediction = currentInitialData.needsFaceSwap && predictionIdToCheck !== currentInitialData.predictionId;

    console.log(`Polling status for ID: ${predictionIdToCheck}, isCheckingBase: ${isCheckingBaseImageForFaceSwap}, isFaceSwap: ${isFaceSwapPrediction}`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated for polling.");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-visualization-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({
          predictionId: predictionIdToCheck,
          // --- CORRECTIONS APPLIED HERE ---
          needsFaceSwap: currentInitialData.needsFaceSwap, // Use original value from initial response
          faceSwapInputImage: currentInitialData.needsFaceSwap ? currentInitialData.faceSwapInputImage : null, // Send if originally needed
          // --- END CORRECTIONS ---
          isFaceSwapPrediction: isFaceSwapPrediction
        }),
      });

      if (!response.ok) {
        let errorMsg = `Polling failed (HTTP ${response.status})`;
        try { errorMsg = (await response.json()).error || errorMsg; } catch (_) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log("Polling response:", data);
      if (!data.success) throw new Error(data.error || "Polling check failed.");

      // Use functional updates for state setters to ensure we use the latest state
      setVisualizationStatus(prevStatus => {
          let currentProgress = prevStatus?.progress || 15;
          let statusMessage = prevStatus?.message || "Processing...";
          let statusDetails = prevStatus?.details || "";
          let shouldStopPolling = false;
          let nextPredictionIdToSet = null; // Track if we need to update prediction ID

          if (data.status === 'processing' || data.status === 'starting') {
            // Special handling for face swap processing
            if (isFaceSwapPrediction) {
              console.log(`Face swap processing update received`);
              
              // For face swap, progress more granularly from 70-95%
              if (currentProgress < 75) {
                currentProgress = 75; // Jump to 75% when face swap processing starts
              } else if (currentProgress < 95) {
                // Smaller increments for face swap to show progress without hitting 100% too soon
                // The slower the increment, the longer before we hit 95%
                const increment = currentProgress < 85 ? 1.5 : 0.8; // Slow down as we get closer
                currentProgress = Math.min(currentProgress + increment, 95);
              }
              
              // Detailed messages based on progress
              statusMessage = "Processing face swap... (this may take up to a minute)";
              
              if (currentProgress >= 90) {
                statusDetails = "Finalizing face integration and refining details...";
              } else if (currentProgress >= 85) {
                statusDetails = "Adjusting facial features to match scene lighting...";
              } else if (currentProgress >= 80) {
                statusDetails = "Integrating face structure with the generated scene...";
              } else {
                statusDetails = "Processing your face for integration with the scene...";
              }
            } else {
              // Regular base image generation processing
              statusMessage = data.message || "Still processing...";
              currentProgress = Math.min(currentProgress + 5, 95);
            }
          } else if (data.status === 'succeeded') {
            if (data.nextPredictionId) {
              // Face swap started, prepare to update ID
              console.log(`Face swap started. Stopping old interval (${pollingIntervalRef.current}), preparing to switch poll ID to: ${data.nextPredictionId}`);
              nextPredictionIdToSet = data.nextPredictionId; // Store ID to update state *after* this function returns
              statusMessage = data.message || "Starting face swap...";
              currentProgress = 70;
              
              // Explicitly clear the current interval *before* updating the ID state
              if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
              }
            } else if (isFaceSwapPrediction || data.finalResultUrl) {
              // Final success for face swap!
              console.log(`Polling detected final success!`);
              let resultUrl = null;
              
              // Look for the URL in various fields, prioritizing finalResultUrl for face swaps
              if (data.finalResultUrl) {
                resultUrl = data.finalResultUrl;
                console.log(`Using finalResultUrl: ${resultUrl}`);
              } else if (data.mediaUrl) {
                resultUrl = data.mediaUrl;
                console.log(`Using mediaUrl: ${resultUrl}`);
              } else if (data.outputUrl) {
                resultUrl = data.outputUrl;
                console.log(`Using outputUrl: ${resultUrl}`);
              }
              
              // Now we need to check if the URL is actually accessible
              if (resultUrl) {
                console.log(`Final result URL: ${resultUrl}`);
                
                // Create success object with all relevant URLs for debugging
                const successResult = {
                  success: true,
                  resultUrl: resultUrl,
                  originalUrl: data.originalUrl || data.outputUrl || null,
                  generationType: generationType,
                  message: data.message || "Face swap completed successfully",
                  allUrls: {
                    finalResultUrl: data.finalResultUrl || null,
                    mediaUrl: data.mediaUrl || null,
                    outputUrl: data.outputUrl || null
                  }
                };
                
                // Signal completion to parent component
                if (onVisualizationComplete) {
                  onVisualizationComplete(successResult, null);
                }
                
                // Clean up - note we let parent component handle view transition
                shouldStopPolling = true;
                setIsLoading(false);
                statusMessage = data.message || "Dream created successfully!";
                currentProgress = 100;
              } else {
                console.error("No valid result URL found in the completed prediction response:", data);
                if (onVisualizationComplete) {
                  onVisualizationComplete(null, { 
                    error: "Face swap completed but no valid image URL was returned",
                    status: data
                  });
                }
                shouldStopPolling = true;
                statusMessage = "Face swap completed but image URL is missing";
                statusDetails = "Please try again or contact support if the issue persists";
              }
            } else {
              // Final success for regular image/video!
              console.log("Polling detected final success!");
              statusMessage = data.message || "Visualization complete!";
              currentProgress = 100;
              setIsLoading(false);
              if (onVisualizationComplete) {
                onVisualizationComplete({ 
                  success: true, 
                  resultUrl: data.finalResultUrl || data.mediaUrl || data.outputUrl, 
                  originalUrl: data.originalUrl || data.outputUrl,
                  message: statusMessage 
                }, null);
              }
              shouldStopPolling = true;
              const canvas = confettiRef.current; 
              if (canvas) {
                // Keep existing confetti code
              }
            }
          } else if (data.status === 'transitioning_to_face_swap') {
              // Backend explicitly signaled the start of face swap
              console.log(`Received 'transitioning_to_face_swap'. Stopping old interval (${pollingIntervalRef.current}), preparing to switch poll ID to: ${data.nextPredictionId}`);
              if (data.nextPredictionId) {
                  nextPredictionIdToSet = data.nextPredictionId;
                  statusMessage = data.message || "Starting face swap...";
                  currentProgress = 70; // Indicate progress towards face swap
                  // Explicitly clear the current interval *before* updating the ID state
                  if (pollingIntervalRef.current) {
                      clearInterval(pollingIntervalRef.current);
                      pollingIntervalRef.current = null;
                  }

                  // Set a flag to prevent immediate restarting of polling
                  // This gives time for the nextPredictionId to be properly set and the old state to clear
                  shouldStopPolling = true;

                  // Use a delayed state update to restart polling with the new ID
                  setTimeout(() => {
                    console.log(`Resuming polling with new prediction ID: ${nextPredictionIdToSet}`);
                    setCurrentPredictionId(nextPredictionIdToSet);
                    setIsPolling(true); // Will trigger useEffect to start polling with new ID
                  }, 2000); // 2 second delay
              } else {
                  console.error("Backend sent 'transitioning_to_face_swap' but missing nextPredictionId!");
                  // Treat as an error or fallback? For now, log and let it potentially fail later.
                  statusMessage = "Error during face swap transition.";
              }
          } else if (data.status === 'failed' || data.status === 'canceled') {
            console.error(`Polling detected failure: ${data.error}`);
            statusMessage = data.message || `Visualization ${data.status}.`;
            statusDetails = data.error || "An error occurred.";
            currentProgress = 100;
            setIsLoading(false);
            if (onVisualizationComplete) onVisualizationComplete(null, { error: statusDetails, status: data });
          }
          
          // Handle automatic restart for stuck face swaps
          if (data.isLikelyStuck && data.faceSwapRestarted && data.newPredictionId) {
            console.log(`Face swap was stuck and has been auto-restarted with new ID: ${data.newPredictionId}`);
            statusMessage = data.message || "Face swap is being restarted automatically...";
            nextPredictionIdToSet = data.newPredictionId;
            shouldStopPolling = true;
            currentProgress = 50; // Reset progress for the restart
            
            // Clear current interval before changing IDs
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            
            // Use a short delay before switching to the new ID
            setTimeout(() => {
              console.log(`Switching to auto-restarted face swap ID: ${data.newPredictionId}`);
              setCurrentPredictionId(data.newPredictionId);
              setIsPolling(true);
            }, 1000);
          }
          // Just show a warning for stuck face swaps without restart
          else if (data.isLikelyStuck) {
            console.warn(`Face swap appears to be stuck for ${data.elapsedMinutes?.toFixed(1) || '?'} minutes`);
            statusMessage = data.message || "Face swap appears to be stuck. Please wait or try again...";
            statusDetails = "This can happen if the server is busy or having difficulty processing your images.";
          }

          // If a new prediction ID was received, update the state *after* this poll cycle completes
          // Use a microtask (Promise.resolve().then()) to defer slightly
          if (nextPredictionIdToSet && !shouldStopPolling) {
              console.log(`Updating currentPredictionId state to: ${nextPredictionIdToSet}`);
              // Update state directly - React handles scheduling
              setCurrentPredictionId(nextPredictionIdToSet);
          }

          // If transitioning to face swap, we need to stop polling temporarily
          if (shouldStopPolling) {
            setIsPolling(false);
          }

          // Return the new status object for this update cycle
          return {
            stage: data.currentStep || data.status, message: statusMessage,
            progress: currentProgress, details: statusDetails
          };
      }); // End functional update for setVisualizationStatus

    } catch (error) {
      console.error("Error during polling:", error);
      setVisualizationStatus({ stage: "error", message: "Polling Error", progress: visualizationStatus?.progress || 0, details: error.message });
      setIsLoading(false);
      if (onVisualizationComplete) onVisualizationComplete(null, { error: error.message });
    }
    // Dependencies for useCallback
  }, [onVisualizationComplete, initialStartData, setIsLoading, setIsPolling, setVisualizationStatus, setCurrentPredictionId, confettiRef, visualizationStatus?.progress]); // Added dependencies

   // Effect to manage polling interval
  useEffect(() => {
    let intervalId = null; // Use local variable for interval ID within this effect's scope

    if (isPolling && currentPredictionId) {
      // Check if the process is actually finished before starting/continuing interval
      const isFinished = visualizationStatus?.stage === 'succeeded' || visualizationStatus?.stage === 'failed' || visualizationStatus?.stage === 'canceled' || visualizationStatus?.stage === 'error';
      if (isFinished) {
          console.log(`Polling effect detected finished status (${visualizationStatus?.stage}), ensuring polling stops.`);
          setIsPolling(false); // Ensure polling state is false if somehow still true
      } else {
        const pollAction = () => {
        // Check isPolling state *inside* the interval callback
        // Use a ref or check state if needed, but cleanup should handle most cases.
        // Relying on cleanup + dependency array is generally preferred.
        pollStatus(currentPredictionId);
      };

      // Initial immediate poll
      console.log(`Starting initial poll for ${currentPredictionId}`);
      pollAction();

      // Start interval polling
      intervalId = setInterval(pollAction, 4000); // Poll every 4 seconds
      console.log(`Set up new interval ${intervalId} for ${currentPredictionId}`);
      pollingIntervalRef.current = intervalId; // Store interval ID in ref
      }

    } else {
       // If isPolling becomes false or currentPredictionId becomes null, clear interval from ref if it exists
       if (pollingIntervalRef.current) {
           console.log(`isPolling is false or currentPredictionId is null. Clearing interval ${pollingIntervalRef.current}.`);
           clearInterval(pollingIntervalRef.current);
           pollingIntervalRef.current = null; // Clear the ref
       }
    }

    // Cleanup function: runs when component unmounts OR dependencies change
    return () => {
      // Use the intervalId stored in the ref *at the time the effect ran*
      const intervalIdToClear = pollingIntervalRef.current;
      if (intervalIdToClear) {
        console.log(`Clearing interval ${intervalIdToClear} in effect cleanup (ID was ${currentPredictionId}).`);
        clearInterval(intervalIdToClear);
        pollingIntervalRef.current = null; // Clear the ref on cleanup
      }
    };
    // Dependencies: effect re-runs if polling starts/stops OR the ID being polled changes.
  }, [isPolling, currentPredictionId, pollStatus, visualizationStatus?.stage, setIsPolling]); // Added visualizationStatus.stage and setIsPolling

  // Track step completion - Simplified: Mark as complete when moving *away* from a valid step
  useEffect(() => {
    // This effect now only handles quote updates
    setQuote(getRandomQuote(currentStep));
  }, [currentStep]);

  // Image models
  const imageModels = [
    { id: 'flux-schnell', name: 'FLUX Schnell (Fast)', description: 'Quick results with good quality', price: '$0.003 / image' },
    { id: 'flux-1.1-pro', name: 'FLUX 1.1 Pro (High Quality)', description: 'Premium quality with more detail', price: '$0.040 / image' },
    { id: 'flux-dev', name: 'FLUX Dev', description: 'Experimental model with creative results', price: '$0.025 / image' },
    { id: 'ideogram-v2', name: 'Ideogram v2', description: 'Artistic style with vibrant colors', price: '$0.080 / image' },
    { id: 'recraft-v3', name: 'Recraft v3', description: 'Professional, polished output', price: '$0.040 / image' },
    { id: 'stable-diffusion-xl', name: 'Stable Diffusion 3.5-Medium', description: 'Balanced quality and creativity', price: '$0.035 / image' },
  ];

  // Video models
  const videoModels = [
    { id: 'tencent-hunyuan-video', name: 'Tencent Hunyuan Video', description: 'Smooth video transitions', price: '$0.200 / video' },
    { id: 'minimax-video-01', name: 'Minimax Video-01 (Hailuo)', description: 'Cinematic quality videos', price: '$0.150 / video' },
    { id: 'zeroscope-v2-xl', name: 'Zeroscope v2 XL', description: 'Dynamic movement and flow', price: '$0.100 / video' },
    { id: 'stable-video-diffusion', name: 'Stable Video Diffusion', description: 'Realistic motion and detail', price: '$0.125 / video' },
    { id: 'wan-2.1-t2v', name: 'WAN 2.1 Text-to-Video', description: 'Vibrant, creative sequences', price: '$0.100 / video' },
  ];

  // Handle model selection
  const handleModelChange = (modelId) => {
    setSelectedModel({
      ...selectedModel,
      [generationType]: modelId
    });
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepNumber) => {
    if (completedSteps.includes(stepNumber)) {
      setCurrentStep(stepNumber);
    }
  };

  // Determine if next button should be disabled
  const isNextDisabled = () => {
    switch (currentStep) {
      case 2: // Vision description
        return !goalText || goalText.trim().length < 10;
      case 4: // Model selection
        return !selectedModel[generationType];
      default:
        return false;
    }
  };

  // Render the current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            key="step1"
            className="step-content face-upload-step"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.h2 variants={contentVariants}>Add Your Portrait</motion.h2>
            <motion.p variants={contentVariants} className="step-description">
              Let's start by adding a photo of you to place in your dream scenario.
              <span className="optional-tag">Optional</span>
            </motion.p>

            <motion.div variants={contentVariants}>
              <ImageUpload
                onFileSelect={setUserImageFile}
                selectedImage={userImageFile}
              />
            </motion.div>

            <motion.div variants={contentVariants} className="vision-quote">
              <span className="quote-icon">💫</span>
              <p>{quote}</p>
            </motion.div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            className="step-content"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div variants={contentVariants} className="step-header">
              <h2>Describe Your Dream Scene</h2>
              <p className="step-description">Paint a vivid picture of the environment where you want to see yourself.</p>
              <div className="quote-bubble">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>{quote}</p>
              </div>
            </motion.div>

            <motion.div variants={contentVariants} className="step-body">
              <GoalInput
                goal={goalText}
                onGoalChange={(text) => {
                  setGoalText(text);
                  // Don't set userOriginalInput here, set it when visualize starts
                }}
                generationType={generationType}
              />

              <PromptTemplates
                onSelectTemplate={(template) => {
                  setGoalText(template);
                  // Don't set userOriginalInput here
                }}
              />

              <motion.div variants={contentVariants} className="style-selector">
                <h3>Choose Style</h3>
                <p className="selector-description">Select styles to enhance your vision (optional)</p>

                <div className="selector-pills">
                  {[...styleOptions, ...customStyles].map(style => (
                    <div
                      key={style.id}
                      className={`selector-pill ${selectedStyles.includes(style.id) ? 'selected' : ''} ${style.isCustom ? 'custom' : ''}`}
                      onClick={() => toggleStyle(style.id)}
                    >
                      {style.label}
                      {style.isCustom && (
                        <span
                          className="remove-custom"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCustomStyle(style.id);
                          }}
                        >
                          ×
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="custom-input">
                  <input
                    type="text"
                    value={newStyleInput}
                    onChange={(e) => setNewStyleInput(e.target.value)}
                    placeholder="Add your own style..."
                    onKeyDown={(e) => e.key === 'Enter' && addCustomStyle()}
                    maxLength={40}
                  />
                  <button
                    className="add-custom-button"
                    onClick={addCustomStyle}
                    disabled={!newStyleInput.trim()}
                  >
                    Add
                  </button>
                </div>
              </motion.div>

              <motion.div variants={contentVariants} className="mood-selector">
                <h3>Choose Mood</h3>
                <p className="selector-description">Select moods to enhance your vision (optional)</p>

                <div className="selector-pills">
                  {[...moodOptions, ...customMoods].map(mood => (
                    <div
                      key={mood.id}
                      className={`selector-pill ${selectedMoods.includes(mood.id) ? 'selected' : ''} ${mood.isCustom ? 'custom' : ''}`}
                      onClick={() => toggleMood(mood.id)}
                    >
                      {mood.label}
                      {mood.isCustom && (
                        <span
                          className="remove-custom"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCustomMood(mood.id);
                          }}
                        >
                          ×
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="custom-input">
                  <input
                    type="text"
                    value={newMoodInput}
                    onChange={(e) => setNewMoodInput(e.target.value)}
                    placeholder="Add your own mood..."
                    onKeyDown={(e) => e.key === 'Enter' && addCustomMood()}
                    maxLength={40}
                  />
                  <button
                    className="add-custom-button"
                    onClick={addCustomMood}
                    disabled={!newMoodInput.trim()}
                  >
                    Add
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            className="step-content format-step"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.h2 variants={contentVariants}>How Do You See Your Success?</motion.h2>
            <motion.p variants={contentVariants} className="step-description">
              Would you prefer to capture a moment of achievement or visualize your journey in motion?
            </motion.p>

            <motion.div variants={contentVariants} className="format-options">
              <div
                className={`format-option ${generationType === 'image' ? 'selected' : ''}`}
                onClick={() => setGenerationType('image')}
              >
                <div className="format-icon">🖼️</div>
                <h3>Image</h3>
                <p>A detailed snapshot of your achievement moment</p>
                {generationType === 'image' && (
                  <motion.div
                    className="selected-indicator"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>

              <div
                className={`format-option ${generationType === 'video' ? 'selected' : ''}`}
                onClick={() => setGenerationType('video')}
              >
                <div className="format-icon">🎬</div>
                <h3>Video</h3>
                <p>A dynamic vision of your success in motion</p>
                {generationType === 'video' && (
                  <motion.div
                    className="selected-indicator"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
            </motion.div>

            <motion.div variants={contentVariants} className="vision-quote">
              <span className="quote-icon">🔮</span>
              <p>{quote}</p>
            </motion.div>
          </motion.div>
        );

      case 4:
        const models = generationType === 'image' ? imageModels : videoModels;

        return (
          <motion.div
            key="step4"
            className="step-content model-step"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.h2 variants={contentVariants}>Pick Your Creative Style</motion.h2>
            <motion.p variants={contentVariants} className="step-description">
              Choose an artistic style that best captures the feeling of your vision.
            </motion.p>

            <motion.div variants={contentVariants} className="models-grid">
              {models.map(model => (
                <motion.div
                  key={model.id}
                  className={`model-card ${selectedModel[generationType] === model.id ? 'selected' : ''}`}
                  onClick={() => handleModelChange(model.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <h3>{model.name}</h3>
                  <p>{model.description}</p>
                  <div className="model-price">{model.price}</div>
                  {selectedModel[generationType] === model.id && (
                    <motion.div
                      className="selected-badge"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17L4 12"></path>
                      </svg>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={contentVariants} className="vision-quote">
              <span className="quote-icon">🎨</span>
              <p>{quote}</p>
            </motion.div>
          </motion.div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  // Update the button for the final step to ensure it shows the right text
  const renderNavigation = () => {
    return (
      <div className="step-navigation">
        <button
          className="back-button"
          onClick={handleBack}
          disabled={currentStep === 1 || isLoading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"></path>
          </svg>
          Back
        </button>

        {currentStep === 4 ? (
          <motion.button
            className="next-button"
            onClick={startVisualization} // Use the new start function
            disabled={isLoading || isNextDisabled()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Creating...
              </>
            ) : (
              <>
                Bring My Vision to Life!
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13"></path>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                </svg>
              </>
            )}
          </motion.button>
        ) : (
          <motion.button
            className="next-button"
            onClick={handleNext}
            disabled={isNextDisabled() || isLoading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Continue
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </motion.button>
        )}
      </div>
    );
  };

  return (
    <div className="vision-flow">
      <canvas
        ref={confettiRef}
        className="confetti-canvas"
        style={{ position: 'fixed', pointerEvents: 'none', width: '100%', height: '100%', top: 0, left: 0, zIndex: 100 }}
      />

      <ProgressTracker
        currentStep={currentStep}
        totalSteps={4}
        completedSteps={completedSteps}
        onClick={handleStepClick}
      />

      <div className="step-content-container">
        <AnimatePresence mode="wait" initial={false}>
          <div key={`step-${currentStep}`} className="step-wrapper">
            {renderStepContent()}
          </div>
        </AnimatePresence>
      </div>

      {renderNavigation()}

      {/* Show loading status when loading */}
      {isLoading && visualizationStatus && (
        <VisualizationStatus
          status={visualizationStatus}
          enhancedPrompt={enhancedPrompt}
        />
      )}
    </div>
  );
}

export default VisionFlow;