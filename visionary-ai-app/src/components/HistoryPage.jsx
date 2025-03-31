import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Import supabase client
import { motion } from 'framer-motion'; // For animations
import './HistoryPage.css'; // Add CSS for styling (create this file next)
import { BottomNav } from '../App';

function HistoryPage({ 
  creations,
  isLoading,
  error,
  onViewCreation,
  onStartOver,
  session,
  onLogout
}) {
  // Remove the local state for session since it's now a prop
  // const [session, setSession] = useState(null);
  
  return (
    <motion.div
      className="history-page view-container" // Use consistent class
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2>Past Creations</h2>

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
          {/* Optional: Add a button to navigate to the creation page */}
          <button onClick={onStartOver} className="start-over-button">Create Your First Dream</button>
        </div>
      ) : (
        <div className="history-grid">
          {creations.map((creation, index) => (
            <motion.div
              key={creation.id || index} // Use creation.id from DB
              className="history-item"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              onClick={() => onViewCreation(creation)} // Add click handler
            >
              <div className="history-item-image">
                {creation.media_url && creation.media_url.startsWith('http') ? (
                  <img src={creation.media_url} alt={`Creation ${index}`} loading="lazy" />
                ) : (
                  <div className="history-item-placeholder">No Image</div>
                )}
              </div>
              <div className="history-item-details">
                <div className="history-item-date">
                  {new Date(creation.created_at).toLocaleDateString()} {/* Format date */}
                </div>
                <div className="history-item-prompt" title={creation.original_prompt}>
                  {/* Truncate long prompts */}
                  {creation.original_prompt?.substring(0, 50)}{creation.original_prompt?.length > 50 ? '...' : ''}
                </div>
                <div className="history-item-type">
                  {creation.media_type === 'video' ? 'Video' : 'Image'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {session && <BottomNav session={session} />}
    </motion.div>
  );
}

export default HistoryPage;