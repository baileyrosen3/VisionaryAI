import React from 'react';

// Accept goal and onGoalChange props from parent (App.jsx)
function GoalInput({ goal, onGoalChange, generationType }) {
  const handleInputChange = (event) => {
    // Call the function passed from the parent to update the state there
    if (onGoalChange) {
      onGoalChange(event.target.value);
    }
  };

  // Adapt placeholder text based on generation type
  const getPlaceholder = () => {
    switch(generationType) {
      case 'video':
        return "Describe the professional environment (e.g., 'corporate office with modern workspace', 'executive conference room with city view', 'professional studio with advanced equipment')...";
      default: // image
        return "Describe the professional setting (e.g., 'modern corporate headquarters', 'executive office with panoramic view', 'professional networking event with industry leaders')...";
    }
  };

  return (
    <div className="goal-input">
      <div className="input-label">
        <label htmlFor="vision-prompt">
          Environment Description
        </label>
      </div>
      
      <textarea
        id="vision-prompt"
        value={goal}
        onChange={handleInputChange}
        placeholder={getPlaceholder()}
        rows="4"
      />
      
      <div className="character-count">
        <span className={goal.length > 0 ? "has-content" : ""}>
          {goal.length} characters
        </span>
        {goal.length > 300 && 
          <span className="hint">(Detailed specifications enhance results)</span>
        }
      </div>
      
      {goal.length > 0 && goal.length < 20 && (
        <div className="prompt-hint">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>Additional details will improve visualization quality</span>
        </div>
      )}
    </div>
  );
}

export default GoalInput;