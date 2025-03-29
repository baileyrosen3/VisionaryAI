import React from 'react';

// Changed prop name from generationType to mediaType
function VisualizationDisplay({ mediaUrl, isLoading, error, mediaType }) { 
  // Determine if the URL is for a video based on the mediaType prop
  const isVideo = mediaType === 'video'; // Simplified logic using the reliable type from backend

  return (
    <div className="visualization-display">
      <h2>Your Dream Result</h2>
      
      {isLoading && (
        <div className="loading">
          {/* Updated text to use mediaType */}
          <p>Creating your {mediaType || 'dream'}...</p> 
          <div className="loading-spinner"></div>
          <p className="loading-hint">This might take a moment. AI generation can take up to a minute.</p>
        </div>
      )}
      
      {error && (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <p className="error-hint">Please adjust your parameters and try again.</p>
        </div>
      )}
      
      {!isLoading && !error && mediaUrl && (
        <div className="media-container">
          {isVideo ? (
            <video 
              key={mediaUrl} // Add key to force re-render on URL change
              src={mediaUrl} 
              controls
              autoPlay
              loop
              muted // Muted is often good practice for autoplay
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <img 
              key={mediaUrl} // Add key to force re-render on URL change
              src={mediaUrl} 
              alt="Generated dream scene" 
            />
          )}
          
          <div className="media-controls">
            <a 
              href={mediaUrl} 
              // Use mediaType to determine download extension
              download={`dream-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`} 
              className="download-button"
            >
              Download
            </a>
            
            <a 
              href={mediaUrl}
              target="_blank" 
              rel="noopener noreferrer"
              className="open-button"
            >
              Open Full Size
            </a>
          </div>
        </div>
      )}
      
      {!isLoading && !error && !mediaUrl && (
        <div className="placeholder">
          <div className="placeholder-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {/* Updated text to use mediaType */}
          <p>Your {mediaType || 'dream'} will appear here</p> 
          <p className="placeholder-hint">Complete the form and proceed with generation</p>
        </div>
      )}
    </div>
  );
}

export default VisualizationDisplay;