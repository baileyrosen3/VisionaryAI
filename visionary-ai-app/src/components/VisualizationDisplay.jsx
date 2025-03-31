import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Changed prop name from generationType to mediaType
function VisualizationDisplay({ mediaUrl, isLoading, error, mediaType }) { 
  // Determine if the URL is for a video based on the mediaType prop
  const isVideo = mediaType === 'video'; // Simplified logic using the reliable type from backend
  const [imgError, setImgError] = useState(false);
  const [finalUrl, setFinalUrl] = useState('');
  
  // Process the URL to make it more accessible
  useEffect(() => {
    if (mediaUrl) {
      console.log(`VisualizationDisplay received media URL: ${mediaUrl}`);
      // Reset error state on new URL
      setImgError(false);
      
      // Set the initial URL
      setFinalUrl(mediaUrl);
      
      // Check if this is a Supabase storage URL
      if (mediaUrl.includes('supabase.co/storage/v1/object/public/')) {
        // If URL doesn't already have download parameter, add it
        if (!mediaUrl.includes('?download=true') && !mediaUrl.includes('?token=')) {
          const accessibleUrl = `${mediaUrl}?download=true`;
          console.log(`Adding download parameter to make image accessible: ${accessibleUrl}`);
          setFinalUrl(accessibleUrl);
        }
      }
    }
  }, [mediaUrl]);

  // Handle image load errors
  const handleImageError = async (e) => {
    console.error(`Error loading image from URL: ${finalUrl}`, e);
    
    try {
      // If the URL is from Supabase storage and failed to load
      if (finalUrl.includes('supabase.co/storage/v1/object/public/')) {
        console.log(`Attempting to get a signed URL for better access`);
        
        // Extract bucket and path from the URL
        const urlParts = finalUrl.split('/storage/v1/object/public/');
        if (urlParts.length !== 2) {
          throw new Error("Unable to parse Supabase URL format");
        }
        
        const parts = urlParts[1].split('/');
        const bucket = parts[0];
        let path = parts.slice(1).join('/');
        
        // Remove any query parameters from the path
        if (path.includes('?')) {
          path = path.split('?')[0];
        }
        
        console.log(`Extracted bucket: ${bucket}, path: ${path}`);
        
        // Create a signed URL
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 3600); // 1 hour expiration
          
        if (error) {
          console.error(`Error creating signed URL: ${error.message}`);
        } else if (data?.signedUrl) {
          console.log(`Successfully created signed URL: ${data.signedUrl}`);
          setFinalUrl(data.signedUrl);
          setImgError(false); // Reset error to try again with new URL
          return; // Exit early - we'll try again with the new URL
        }
      }
      
      // If we couldn't recover, set the error state
      setImgError(true);
    } catch (err) {
      console.error(`Error trying to recover from failed image load: ${err}`);
      setImgError(true);
    }
  };

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
      
      {(error || imgError) && (
        <div className="error-container">
          <p className="error-message">{error || "Unable to load the image. It may be inaccessible or still processing."}</p>
          <p className="error-hint">
            {imgError ? (
              <>
                Try refreshing the page or checking the direct URL: 
                <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="error-link">
                  Open Image Directly
                </a>
              </>
            ) : (
              "Please adjust your parameters and try again."
            )}
          </p>
        </div>
      )}
      
      {!isLoading && !error && mediaUrl && !imgError && (
        <div className="media-container">
          {isVideo ? (
            <video 
              key={finalUrl} // Add key to force re-render on URL change
              src={finalUrl} 
              controls
              autoPlay
              loop
              muted // Muted is often good practice for autoplay
              onError={(e) => console.error(`Video load error: ${e}`)}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <>
              <img 
                key={finalUrl} // Add key to force re-render on URL change
                src={finalUrl} 
                alt="Generated dream scene"
                onLoad={() => console.log(`Image loaded successfully: ${finalUrl}`)}
                onError={handleImageError}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              {/* Helpful debug text - only in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="debug-url" style={{fontSize: '10px', wordBreak: 'break-all', marginTop: '8px', color: '#666'}}>
                  Image URL: {finalUrl}
                </div>
              )}
            </>
          )}
          
          <div className="media-controls">
            <a 
              href={finalUrl} 
              // Use mediaType to determine download extension
              download={`dream-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`} 
              className="download-button"
            >
              Download
            </a>
            
            <a 
              href={finalUrl}
              target="_blank" 
              rel="noopener noreferrer"
              className="open-button"
            >
              Open Full Size
            </a>
          </div>
        </div>
      )}
      
      {!isLoading && !error && !mediaUrl && !imgError && (
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