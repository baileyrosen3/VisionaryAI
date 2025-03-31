import { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

// Import components
import ImageUpload from './components/ImageUpload'; // Keep if used elsewhere, otherwise remove if VisionFlow handles it
import GoalInput from './components/GoalInput'; // Keep if used elsewhere, otherwise remove if VisionFlow handles it
import VisualizationDisplay from './components/VisualizationDisplay';
import PromptEnhancer from './components/PromptEnhancer'; // Keep if used elsewhere, otherwise remove if VisionFlow handles it
import VisionFlow from './components/VisionFlow'; // Import new VisionFlow component

// Import motion from framer-motion for welcome screen animations
import { motion } from 'framer-motion';

// --- Authentication Components ---

function LoginScreen() {
  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome to VisionaryAI</h2>
        <p>Sign in to start creating visual affirmations</p>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'var(--primary-color)', // Use CSS variable
                  brandAccent: 'var(--primary-dark)', // Use CSS variable
                }
              }
            }
          }}
          providers={['google', 'github']} // Example providers
          redirectTo={window.location.origin}
          theme="light" // Or "dark" based on your preference
        />
      </div>
    </div>
  );
}

// Replace the LogoutButton component with AccountMenu
function AccountMenu({ onLogout, session }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && !e.target.closest('.account-menu')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="account-menu">
      <button className="account-menu-button" onClick={toggleMenu}>
        <div className="account-avatar">
          {session?.user?.email?.charAt(0).toUpperCase() || '?'}
        </div>
      </button>

      {isOpen && (
        <div className="account-dropdown">
          <div className="account-info">
            <div className="account-email">{session?.user?.email}</div>
            {/* Add more account details if needed */}
          </div>

          <div className="account-menu-items">
            {/* Add other menu items like settings, subscription etc. */}
            <button className="account-menu-item" onClick={onLogout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- New Screen Components (Basic structure) ---

function WelcomeScreen({ onStart, session, onLogout }) {
  return (
    <motion.div
      className="welcome-screen view-container"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
    >
      {session && <AccountMenu session={session} onLogout={onLogout} />}

      <motion.div
        className="welcome-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Transform Your Dreams Into Reality
        </motion.h2>

        <motion.div
          className="welcome-tagline"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <span className="highlight">See it</span>. <span className="highlight">Believe it</span>. <span className="highlight">Become it</span>.
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          Visualization is the first step to achievement. Upload your photo, describe your dream environment, and watch as AI places you right where you want to be!
        </motion.p>

        <motion.div
          className="welcome-features"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <div className="feature">
            <div className="feature-icon">👤</div>
            <div className="feature-text">Use your actual face</div>
          </div>
          <div className="feature">
            <div className="feature-icon">✨</div>
            <div className="feature-text">Professional settings</div>
          </div>
          <div className="feature">
            <div className="feature-icon">🎬</div>
            <div className="feature-text">Images or videos</div>
          </div>
        </motion.div>
      </motion.div>

      <motion.button
        onClick={onStart}
        className="start-button"
        whileHover={{ scale: 1.05, boxShadow: "0 5px 15px rgba(255, 215, 0, 0.4)" }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
      >
        Begin Your Journey
      </motion.button>

      <motion.div
        className="welcome-motivation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.5 }}
      >
        "Vision is the art of seeing what is invisible to others."
        <span className="quote-author">— Jonathan Swift</span>
      </motion.div>
    </motion.div>
  );
}

// Update the LoadingScreen component to use visualization status and show error
function LoadingScreen({ status, enhancedPrompt, session, onLogout, error }) {
  return (
    <div className="loading-screen view-container">
      {session && <AccountMenu session={session} onLogout={onLogout} />}

      {error ? (
         <div className="loading error-state">
           <p className="error-message">{error}</p>
           {/* Optionally add a button to go back or retry */}
         </div>
      ) : !status ? (
        <div className="loading">
          <p>Preparing your vision...</p>
          <div className="loading-spinner"></div>
          <p className="loading-hint">Getting everything ready.</p>
        </div>
      ) : (
        <div className="loading">
          <p>{status.message}</p>
          <div className="loading-progress">
            <div className="loading-progress-bar">
              <div
                className="loading-progress-fill"
                style={{ width: `${status.progress}%` }}
              ></div>
            </div>
            <span className="loading-progress-text">{status.progress}%</span>
          </div>
          {status.details && <p className="loading-details">{status.details}</p>}

          {enhancedPrompt && status.progress > 20 && (
            <div className="loading-prompt">
              <h4>Creating your vision with this prompt:</h4>
              <p className="loading-prompt-text">{enhancedPrompt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function ResultScreen({ mediaUrl, mediaType, error, onStartOver, session, onLogout, originalPrompt, enhancedPrompt, onViewHistory }) {
  return (
    <motion.div
      className="result-screen view-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {session && <AccountMenu session={session} onLogout={onLogout} />}

      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Your Dream Result
      </motion.h2>

      <motion.div
        className="result-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <VisualizationDisplay
          mediaUrl={mediaUrl}
          mediaType={mediaType}
          isLoading={false} // Result screen means loading is done
          error={error} // Pass error if one occurred before reaching result
        />

        {/* Display error prominently if it exists */}
        {error && <p className="error-message result-error">{error}</p>}

        <div className="result-metadata">
          <div className="metadata-item">
            <span className="metadata-label">Type</span>
            <span className="metadata-value">{mediaType === 'video' ? 'Video Animation' : 'Image'}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Format</span>
            <span className="metadata-value">{mediaType === 'video' ? 'MP4' : 'JPEG'}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Created</span>
            <span className="metadata-value">{new Date().toLocaleString()}</span>
          </div>
        </div>

        {enhancedPrompt && originalPrompt && (
          <motion.div
            className="prompt-comparison"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <h3>AI Enhanced Prompt Details</h3>
            <div className="prompt-box">
              <span className="prompt-box-title">Your Original Prompt</span>
              <p className="prompt-text">{originalPrompt}</p>
            </div>
            <div className="prompt-box">
              <span className="prompt-box-title">Enhanced Prompt</span>
              <p className="prompt-text enhanced">{enhancedPrompt}</p>
            </div>
          </motion.div>
        )}

        {/* Only show download/share if no error */}
        {!error && mediaUrl && (
          <motion.div
            className="result-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="primary-actions">
              <button onClick={onStartOver} className="start-over-button primary-action">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 6v6l4 2M12 2a10 10 0 1 0 10 10h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Create Another Dream
              </button>

              <button onClick={onViewHistory} className="view-history-button primary-action">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8v4l3 3M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                View Your History
              </button>
            </div>

            <div className="secondary-actions">
              <a
                href={mediaUrl}
                download={`dream-${Date.now()}.${mediaType === 'video' ? 'mp4' : 'jpg'}`}
                className="action-button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Download
              </a>

              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="action-button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Open Full Size
              </a>

              <button className="action-button" onClick={() => {
                navigator.clipboard.writeText(mediaUrl);
                alert('Link copied to clipboard!');
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1M8 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M8 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 0h2a2 2 0 0 1 2 2v3m2 4H16m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Copy Link
              </button>
            </div>
          </motion.div>
        )}
        {/* Always show Start Over button, even if there was an error */}
        {error && (
           <motion.div
            className="result-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
             <button onClick={onStartOver} className="start-over-button primary-action">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 6v6l4 2M12 2a10 10 0 1 0 10 10h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Try Again
              </button>
           </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// --- History Screen Component ---
function HistoryScreen({ creations, isLoading, error, onViewCreation, onStartOver, session, onLogout }) {
  return (
    <motion.div
      className="history-screen view-container"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {session && <AccountMenu session={session} onLogout={onLogout} />}

      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Your Creation History
      </motion.h2>

      <div className="history-actions">
        <button onClick={onStartOver} className="action-button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4v16m-8-8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Create New Dream
        </button>
      </div>

      {isLoading ? (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Loading your creations...</p>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : creations.length === 0 ? (
        <div className="empty-history">
          <p>You haven't created any dreams yet.</p>
          <button onClick={onStartOver} className="start-over-button">Create Your First Dream</button>
        </div>
      ) : (
        <div className="history-grid">
          {creations.map((creation, index) => (
            <motion.div
              key={creation.id || index} // Use creation.id if available from DB
              className="history-item"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              onClick={() => onViewCreation(creation)}
            >
              <div className="history-item-image">
                {/* Basic check for valid URL */}
                {creation.media_url && creation.media_url.startsWith('http') ? (
                   <img src={creation.media_url} alt={`Creation ${index}`} loading="lazy" />
                ) : (
                   <div className="history-item-placeholder">Invalid URL</div>
                )}
              </div>
              <div className="history-item-details">
                <div className="history-item-date">
                  {new Date(creation.created_at).toLocaleString()}
                </div>
                <div className="history-item-prompt">{creation.original_prompt}</div>
                <div className="history-item-type">
                  {creation.media_type === 'video' ? 'Video' : 'Image'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}


// --- Main App Component ---

function App() {
  const [session, setSession] = useState(null);
  const [currentView, setCurrentView] = useState('welcome'); // 'welcome', 'workflow', 'loading', 'result', 'history'

  // Workflow State
  const [userImageFile, setUserImageFile] = useState(null);
  const [goalText, setGoalText] = useState('');
  const [generationType, setGenerationType] = useState('image'); // Default to image

  // Model Selection
  const [selectedModel, setSelectedModel] = useState({
    image: 'flux-schnell', // Default image model
    video: 'tencent-hunyuan-video' // Default video model
  });

  // Result State
  const [resultMedia, setResultMedia] = useState(null); // URL of the result
  const [resultMediaType, setResultMediaType] = useState('image'); // Type of the result ('image' or 'video')

  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // New visualization status tracking
  const [visualizationStatus, setVisualizationStatus] = useState(null);
  const [enhancedPrompt, setEnhancedPrompt] = useState('');

  // History state
  const [creationHistory, setCreationHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // --- Auth Effect ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Reset state and view ONLY on explicit logout
      if (_event === 'SIGNED_OUT') {
        setUserImageFile(null);
        setGoalText('');
        setResultMedia(null);
        setError('');
        setGenerationType('image');
        setSelectedModel({ image: 'flux-schnell', video: 'tencent-hunyuan-video' });
        setCurrentView('welcome');
        setIsLoading(false);
        setVisualizationStatus(null);
        setEnhancedPrompt('');
        setCreationHistory([]);
      } else if (_event === 'SIGNED_IN') {
         // Optionally load history or go to workflow on sign in
         setCurrentView('welcome'); // Go to welcome after sign in
      }
    });
    return () => subscription.unsubscribe();
  }, []);


  // Handle logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // The onAuthStateChange handler will reset state and view
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out.'); // Show error to user
    }
  };

  // --- Event Handlers ---
  const handleStartWorkflow = () => {
    if (!session) {
      // This case should ideally be handled by UI (e.g., disabling button)
      // but as a fallback, redirect to login or show message
      setCurrentView('welcome'); // Or show a login prompt
      return;
    }

    // Reset workflow/result state when starting a new one
    setUserImageFile(null);
    setGoalText('');
    setGenerationType('image');
    setSelectedModel({ image: 'flux-schnell', video: 'tencent-hunyuan-video' });
    setResultMedia(null);
    setError('');
    setIsLoading(false);
    setVisualizationStatus(null);
    setEnhancedPrompt('');
    setCurrentView('workflow');
  };

  // New handler for when VisionFlow completes (via SSE)
  const handleVisualizationComplete = (data, errorData) => {
    setIsLoading(false); // Stop loading indicator

    if (errorData) {
      console.error("Visualization failed:", errorData);
      const errorMessage = errorData.error || errorData.status?.details || 'An unexpected error occurred during visualization.';
      setError(errorMessage);
      // Update status to reflect the error, keeping the loading view
      setVisualizationStatus(errorData.status || {
          stage: "error",
          message: "Visualization Failed",
          progress: visualizationStatus?.progress || 0, // Keep last progress or 0
          details: errorMessage
      });
      setCurrentView('loading'); // Stay on loading view to show the error status
    } else if (data && data.success) {
      console.log("Visualization successful:", data);
      
      // Ensure we're using the correct URL property from the response
      const imageUrl = data.resultUrl || data.finalResultUrl || data.mediaUrl || '';
      
      // Log detailed image URL information for debugging
      console.log(`Setting result media URL: ${imageUrl}`);
      console.log(`Available URL fields in response:`, {
        resultUrl: data.resultUrl || 'undefined',
        finalResultUrl: data.finalResultUrl || 'undefined',
        mediaUrl: data.mediaUrl || 'undefined',
        originalUrl: data.originalUrl || 'undefined'
      });
      
      // Validate URL before setting
      if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
        setResultMedia(imageUrl);
        // Ping the URL to check if it's accessible
        fetch(imageUrl, { method: 'HEAD' })
          .then(response => {
            console.log(`Image URL accessibility check: ${response.status} ${response.statusText}`);
            if (!response.ok) {
              console.warn(`Warning: Image URL returned status ${response.status}`);
            }
          })
          .catch(error => {
            console.error(`Error checking image URL: ${error}`);
          });
      } else {
        console.error(`Invalid image URL received: ${imageUrl}`);
        setError('The generated image URL is invalid. Please try again.');
        setResultMedia(''); // Clear any previous URL
      }
      
      setResultMediaType(data.generationType || 'image');
      // Enhanced prompt should have been set via status updates in VisionFlow
      setError(''); // Clear any previous errors
      // Status is already set to complete by VisionFlow before calling this
      setCurrentView('result'); // Switch to the result screen
    } else {
      // Handle unexpected case where stream ends without proper complete/error
      const unexpectedError = 'The visualization process finished unexpectedly. Please try again.';
      console.error("Visualization ended unexpectedly without clear success/error:", data);
      setError(unexpectedError);
      setVisualizationStatus({
          stage: "error",
          message: "Unexpected Finish",
          progress: visualizationStatus?.progress || 99, // Assume it nearly finished
          details: unexpectedError
      });
      setCurrentView('loading'); // Stay on loading to show the error status
    }
  };


  // Load user's creation history
  const loadCreationHistory = async () => {
    if (!session) return;

    setIsHistoryLoading(true);
    setError(''); // Clear previous errors
    try {
      const { data, error: dbError } = await supabase
        .from('creation_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      setCreationHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
      setError("Failed to load your creation history. Please try again later.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Handle viewing history
  const handleViewHistory = () => {
    if (!session) return; // Should not happen if button is shown correctly
    loadCreationHistory();
    setCurrentView('history');
  };

  // Handle viewing a specific creation from history
  const handleViewCreation = (creation) => {
    if (!session) return; // Should not happen
    setResultMedia(creation.media_url);
    setResultMediaType(creation.media_type);
    setGoalText(creation.original_prompt); // Set original prompt for context
    setEnhancedPrompt(creation.enhanced_prompt); // Set enhanced prompt
    setError(''); // Clear any errors from history view
    setCurrentView('result');
  };

  const renderCurrentView = () => {
    // If not logged in and not on welcome screen, show login screen
    // This logic is now primarily handled by the main return block checking !session
    // Keeping the switch case clean for logged-in states.

    switch (currentView) {
      case 'welcome':
        return <WelcomeScreen onStart={handleStartWorkflow} session={session} onLogout={handleLogout} />;

      case 'workflow':
        return (
          <>
            {/* AccountMenu is now rendered outside the switch in the main return for logged-in users */}
            <VisionFlow
              // onVisualize is removed
              onVisualizationComplete={handleVisualizationComplete} // Pass the new handler
              userImageFile={userImageFile}
              setUserImageFile={setUserImageFile}
              goalText={goalText}
              setGoalText={setGoalText}
              generationType={generationType}
              setGenerationType={setGenerationType}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              isLoading={isLoading} // Pass isLoading state
              setIsLoading={setIsLoading} // Pass setIsLoading setter
              visualizationStatus={visualizationStatus} // Pass status state
              setVisualizationStatus={setVisualizationStatus} // Pass status setter
              enhancedPrompt={enhancedPrompt} // Pass enhanced prompt state
              setEnhancedPrompt={setEnhancedPrompt} // Pass enhanced prompt setter
              setCurrentView={setCurrentView} // Pass setCurrentView to allow VisionFlow to change view to 'loading'
            />
          </>
        );

      case 'loading':
        // Error message is now passed directly to LoadingScreen
        return (
          <LoadingScreen
            status={visualizationStatus}
            enhancedPrompt={enhancedPrompt}
            session={session}
            onLogout={handleLogout}
            error={error} // Pass the error state directly
          />
        );

      case 'result':
        return (
          <ResultScreen
            mediaUrl={resultMedia}
            mediaType={resultMediaType}
            error={error} // Pass error state
            onStartOver={handleStartWorkflow}
            session={session}
            onLogout={handleLogout}
            originalPrompt={goalText} // Pass original prompt
            enhancedPrompt={enhancedPrompt} // Pass enhanced prompt
            onViewHistory={handleViewHistory}
          />
        );

      case 'history':
        return (
          <HistoryScreen
            creations={creationHistory}
            isLoading={isHistoryLoading}
            error={error} // Pass error state from loading history
            onViewCreation={handleViewCreation}
            onStartOver={handleStartWorkflow}
            session={session}
            onLogout={handleLogout}
          />
        );

      default:
        // Fallback to welcome screen if view state is unexpected
        return <WelcomeScreen onStart={handleStartWorkflow} session={session} onLogout={handleLogout} />;
    }
  };

  return (
    <div className="App">
      <header>
        <h1>VisionaryAI</h1>
        {/* Render AccountMenu here if user is logged in, regardless of view */}
        {session && currentView !== 'welcome' && <AccountMenu session={session} onLogout={handleLogout} />}
      </header>

      {!session ? (
        // Auth UI takes full screen if not logged in
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
             providers={['google', 'github']} // Add providers as needed
           />
         </div>
      ) : (
         // Render the current view based on state for logged-in users
         <div className="main-content">
           {/* Show general errors prominently, e.g., logout error */}
           {error && (currentView === 'welcome' || currentView === 'workflow') && <p className="error-message main-error">{error}</p>}
           {renderCurrentView()}
         </div>
      )}

      <div className="copyright">
        VisionaryAI &copy; {new Date().getFullYear()} - Powered by AI
      </div>
    </div>
  );
}


export default App;
