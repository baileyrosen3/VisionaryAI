import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const PromptEnhancer = ({ originalPrompt, targetGeneration, onPromptEnhanced }) => {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Optional customization states
  const [style, setStyle] = useState('');
  const [mood, setMood] = useState('');
  const [details, setDetails] = useState('');
  
  // Predefined style options
  const styleOptions = [
    'Cinematic', 'Photorealistic', 'Anime', 'Watercolor', 
    'Digital Art', 'Oil Painting', 'Abstract', '3D Render'
  ];
  
  // Predefined mood options
  const moodOptions = [
    'Cheerful', 'Dramatic', 'Mysterious', 'Serene', 
    'Epic', 'Playful', 'Dystopian', 'Nostalgic'
  ];
  
  const enhancePrompt = async () => {
    if (!originalPrompt) {
      setError('Please enter a prompt first');
      return;
    }
    
    setIsEnhancing(true);
    setError(null);
    setSuccess(false);
    
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          originalPrompt,
          targetGeneration: targetGeneration || 'image',
          style: style || undefined,
          mood: mood || undefined,
          details: details || undefined
        }
      });
      
      if (error) throw error;
      
      if (data.enhancedPrompt) {
        setEnhancedPrompt(data.enhancedPrompt);
        // Automatically apply the enhanced prompt to the parent component
        if (onPromptEnhanced) {
          onPromptEnhanced(data.enhancedPrompt);
        }
        setSuccess(true);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } else {
        throw new Error('No enhanced prompt received');
      }
    } catch (err) {
      console.error('Error enhancing prompt:', err);
      setError(err.message || 'Failed to enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  };
  
  const handleUseEnhanced = () => {
    if (enhancedPrompt && onPromptEnhanced) {
      onPromptEnhanced(enhancedPrompt);
    }
  };
  
  return (
    <div className="prompt-enhancer">
      <div className="enhancer-options">
        <div className="option-select">
          <div className="input-label">
            <label htmlFor="prompt-style">Style</label>
          </div>
          <select 
            id="prompt-style"
            value={style} 
            onChange={(e) => setStyle(e.target.value)}
            disabled={isEnhancing}
          >
            <option value="">Select a style (optional)</option>
            {styleOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        
        <div className="option-select">
          <div className="input-label">
            <label htmlFor="prompt-mood">Mood</label>
          </div>
          <select 
            id="prompt-mood"
            value={mood} 
            onChange={(e) => setMood(e.target.value)}
            disabled={isEnhancing}
          >
            <option value="">Select a mood (optional)</option>
            {moodOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        
        <div className="option-input">
          <div className="input-label">
            <label htmlFor="prompt-details">Additional Details</label>
          </div>
          <input
            id="prompt-details"
            type="text"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Any specific details you want to include"
            disabled={isEnhancing}
          />
        </div>
      </div>
      
      <div className="action-section">
        <button 
          className="visualize-button enhance-button"
          onClick={enhancePrompt} 
          disabled={isEnhancing || !originalPrompt}
        >
          {isEnhancing ? (
            <>
              <span className="loading-spinner-small"></span>
              Enhancing...
            </>
          ) : (
            'Enhance with Gemini'
          )}
        </button>
      </div>
      
      {success && (
        <div className="success-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Prompt successfully enhanced! The enhanced version has been applied.</span>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}
      
      {enhancedPrompt && (
        <div className="enhanced-prompt-container">
          <div className="input-label">
            <label>Enhanced Prompt:</label>
          </div>
          <textarea 
            className="enhanced-prompt"
            value={enhancedPrompt}
            readOnly
            rows="4"
          />
          <div className="character-count">
            <span className="has-content">
              {enhancedPrompt.length} characters
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptEnhancer; 