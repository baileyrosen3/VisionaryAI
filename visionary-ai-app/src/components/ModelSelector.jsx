import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function ModelSelector({ 
  generationType, 
  setGenerationType, 
  modelId, 
  setModelId, 
  advancedParams,
  setAdvancedParams,
  // userImageFile // No longer needed directly in this component for logic
  // enableFaceSwap // No longer needed directly in this component for logic
}) {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState({
    image: [],
    video: [],
    // faceSwap: [] // Removed - backend doesn't return this category anymore
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  // const [targetType, setTargetType] = useState(advancedParams.targetType || 'image'); // Removed

  // Removed useEffect syncing targetType with advancedParams

  // Fetch available models on component mount
  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        setError(null); // Reset error before fetch
        const { data, error: functionError } = await supabase.functions.invoke('visualize-dream', {
          method: 'GET' // Use GET to fetch model information
        });

        if (functionError) {
          throw new Error(`Failed to fetch models: ${functionError.message}`);
        }

        if (data && data.models && data.models.image && data.models.video) {
          setModels({
             image: data.models.image || [],
             video: data.models.video || []
          });
        } else {
          console.error("Unexpected API response format:", data);
          throw new Error('Unexpected response format from API when fetching models.');
        }
      } catch (err) {
        console.error('Error fetching models:', err);
        setError(err.message || 'An unknown error occurred while fetching models.');
      } finally {
        setLoading(false);
      }
    }

    fetchModels();
  }, []);

  // When generation type changes, update the selected model to the first available
  useEffect(() => {
    const available = models[generationType] || [];
    if (available.length > 0) {
      // Check if current modelId is valid for the new type, if not, select the first one
      if (!modelId || !available.some(m => m.id === modelId)) {
        setModelId(available[0].id);
      }
    } else if (!loading) {
        // If no models are available for the selected type (and not loading), clear modelId
        setModelId('');
    }
  }, [generationType, models, modelId, setModelId, loading]); // Added loading dependency

  // Update selected model details when modelId changes
  useEffect(() => {
    if (modelId) {
      // Find the model in either image or video arrays
      const model = models.image.find(m => m.id === modelId) || 
                   models.video.find(m => m.id === modelId);
                   // || models.faceSwap.find(m => m.id === modelId); // Removed faceSwap check
      setSelectedModel(model || null); // Set to null if not found
    } else {
      setSelectedModel(null); // Clear selection if modelId is empty
    }
  }, [modelId, models]);

  // Handle generation type change
  const handleGenerationTypeChange = (e) => {
    const newType = e.target.value;
    setGenerationType(newType);
    
    // Reset advanced params when changing type
    setAdvancedParams({}); 
  };

  // Removed handleTargetTypeChange

  // Handle model selection change
  const handleModelChange = (e) => {
    setModelId(e.target.value);
  };

  // Handle changes to advanced parameters
  const handleParamChange = (param, value) => {
    // Group parameters under the relevant generation type for clarity in App.jsx
    const paramGroup = generationType === 'video' ? 'videoGeneration' : 'imageGeneration';
    
    // Also handle potential faceSwap specific params if needed later, though none are directly set here now
    // Example: if (param === 'someFaceSwapParam') paramGroup = 'faceSwap';

    setAdvancedParams(prev => ({
      ...prev,
      [paramGroup]: {
        ...(prev[paramGroup] || {}),
        [param]: value
      }
      // If not grouping: ...prev, [param]: value 
    }));
  };

  // Determine which models to show based on generationType
  const getAvailableModels = () => {
    return models[generationType] || [];
  };

  // Helper to get current value for a param, checking the correct group
  const getParamValue = (param, defaultValue) => {
      const paramGroup = generationType === 'video' ? 'videoGeneration' : 'imageGeneration';
      return advancedParams[paramGroup]?.[param] ?? defaultValue;
      // If not grouping: return advancedParams[param] ?? defaultValue;
  }

  return (
    <div className="model-selector">
      <h2>2. Choose Generation Type & Model</h2>
      
      {error && (
        <div className="error-message">
          Error loading models: {error}
        </div>
      )}
      
      <div className="generation-type-selector">
        <div>
          <input 
            type="radio" 
            id="type-image"
            name="generationType" 
            value="image" 
            checked={generationType === 'image'} 
            onChange={handleGenerationTypeChange}
            disabled={loading}
          />
          <label htmlFor="type-image">Generate Image</label>
        </div>
        
        <div>
          <input 
            type="radio" 
            id="type-video"
            name="generationType" 
            value="video" 
            checked={generationType === 'video'} 
            onChange={handleGenerationTypeChange}
            disabled={loading}
          />
          <label htmlFor="type-video">Generate Video</label>
        </div>
        
        {/* Removed Face Swap radio button */}
      </div>

      {/* Removed target type selection */}
      {/* Removed face swap warning message */}

      <div className="model-dropdown">
        <label htmlFor="model-select">Select Model:</label>
        <select 
          id="model-select" 
          value={modelId || ''} 
          onChange={handleModelChange}
          disabled={loading || getAvailableModels().length === 0}
        >
          {loading ? (
            <option value="">Loading models...</option>
          ) : getAvailableModels().length > 0 ? (
            getAvailableModels().map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))
          ) : (
            <option value="">No {generationType} models available</option> // More specific message
          )}
        </select>
      </div>

      {selectedModel && (
        <div className="model-info">
          <p><strong>{selectedModel.name}</strong>: {selectedModel.description}</p>
          
          <div className="capabilities">
            <h4>Capabilities:</h4>
            <ul>
              {selectedModel.capabilities.map((capability, index) => (
                <li key={index}>{capability}</li>
              ))}
            </ul>
          </div>

          <button 
            className="toggle-advanced" 
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
          </button>

          {showAdvanced && selectedModel.commonParams && (
            <div className="advanced-params">
              <h4>Advanced Options for {selectedModel.name}</h4>
              {/* Only show advanced params that make sense for this UI */}
              {selectedModel.commonParams.includes('negative_prompt') && (
                <div className="param-group">
                  <label htmlFor="negative_prompt">Negative Prompt:</label>
                  <textarea
                    id="negative_prompt"
                    value={getParamValue('negative_prompt', '')}
                    onChange={(e) => handleParamChange('negative_prompt', e.target.value)}
                    placeholder="Things to avoid in the generated content..."
                    rows="2"
                  />
                </div>
              )}

              {/* Show aspect ratio only for image models */}
              {generationType === 'image' && selectedModel.commonParams.includes('aspect_ratio') && (
                <div className="param-group">
                  <label htmlFor="aspect_ratio">Aspect Ratio:</label>
                  <select
                    id="aspect_ratio"
                    value={getParamValue('aspect_ratio', '1:1')}
                    onChange={(e) => handleParamChange('aspect_ratio', e.target.value)}
                  >
                    <option value="1:1">Square (1:1)</option>
                    <option value="16:9">Landscape (16:9)</option>
                    <option value="9:16">Portrait (9:16)</option>
                    <option value="4:3">Standard (4:3)</option>
                    <option value="3:2">Photo (3:2)</option>
                  </select>
                </div>
              )}

              {selectedModel.commonParams.includes('num_outputs') && (
                <div className="param-group">
                  <label htmlFor="num_outputs">Number of Outputs:</label>
                  <input
                    id="num_outputs"
                    type="number"
                    min="1"
                    max="4" // Example max, adjust if needed
                    value={getParamValue('num_outputs', 1)}
                    onChange={(e) => handleParamChange('num_outputs', parseInt(e.target.value))}
                  />
                </div>
              )}

              {/* Show video params only for video models */}
              {generationType === 'video' && selectedModel.commonParams.includes('num_frames') && (
                <div className="param-group">
                  <label htmlFor="num_frames">Number of Frames:</label>
                  <input
                    id="num_frames"
                    type="number"
                    min="10" // Example min
                    max="120" // Example max
                    value={getParamValue('num_frames', 25)} // Default to 25
                    onChange={(e) => handleParamChange('num_frames', parseInt(e.target.value))}
                  />
                </div>
              )}

              {generationType === 'video' && selectedModel.commonParams.includes('fps') && (
                <div className="param-group">
                  <label htmlFor="fps">Frames Per Second:</label>
                  <input
                    id="fps"
                    type="number"
                    min="5" // Example min
                    max="30" // Example max
                    value={getParamValue('fps', 15)} // Default to 15
                    onChange={(e) => handleParamChange('fps', parseInt(e.target.value))}
                  />
                </div>
              )}

              {selectedModel.commonParams.includes('guidance_scale') && (
                <div className="param-group">
                  <label htmlFor="guidance_scale">Guidance Scale:</label>
                  <input
                    id="guidance_scale"
                    type="range"
                    min="1"
                    max="20" // Example max
                    step="0.5"
                    value={getParamValue('guidance_scale', 7.5)} // Default
                    onChange={(e) => handleParamChange('guidance_scale', parseFloat(e.target.value))}
                  />
                  <span>{getParamValue('guidance_scale', 7.5)}</span>
                </div>
              )}
              
              {/* Add other relevant commonParams here as needed */}
              
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ModelSelector;