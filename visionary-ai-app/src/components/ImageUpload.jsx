import React, { useState, useRef, useEffect } from 'react';

// Accept onFileSelect prop to notify parent component and selectedImage to show existing selection
function ImageUpload({ onFileSelect, selectedImage }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  
  // When selectedImage prop changes, update the preview
  useEffect(() => {
    if (selectedImage) {
      // If the selectedImage is a File object
      if (selectedImage instanceof File) {
        setSelectedFile(selectedImage);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result);
        };
        reader.readAsDataURL(selectedImage);
      } 
      // If the selectedImage is already a data URL
      else if (typeof selectedImage === 'string' && selectedImage.startsWith('data:')) {
        setPreview(selectedImage);
      }
    }
  }, [selectedImage]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Call the prop function with the selected file
      if (onFileSelect) {
        onFileSelect(file);
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreview(null);
      // Notify parent if selection is cancelled/invalid
      if (onFileSelect) {
        onFileSelect(null);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="image-upload">    
      <input 
        type="file" 
        ref={fileInputRef}
        accept="image/png, image/jpeg" 
        onChange={handleFileChange} 
        style={{ display: 'none' }}
      />
      
      <div 
        className="image-upload-inner"
        onClick={handleUploadClick}
      >
        {!preview ? (
          <>
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 16L12 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 11L12 8 15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 16.7428C21.2215 15.734 22 14.2079 22 12.5C22 9.46243 19.5376 7 16.5 7C16.2815 7 16.0771 7.01422 15.8606 7.04143C14.8345 4.59974 12.4462 3 9.69231 3C5.8505 3 2.73338 6.0135 2.52756 9.80717C2.50928 9.80242 2.49094 9.7978 2.47253 9.79331C0.986776 9.44317 0 8.10283 0 6.5C0 4.567 1.567 3 3.5 3C3.77456 3 4.04227 3.03642 4.29887 3.10498C5.19926 1.8204 6.75108 1 8.5 1C11.3998 1 13.7664 3.33325 13.9797 6.21271C14.1454 6.07953 14.3194 5.9547 14.5 5.84C16.1676 4.94458 18.1678 5.2257 19.5 6.25C20.9172 7.33862 21.4968 9.10711 21 10.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 21L12 17L16 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 17L12 21L16 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p>Upload professional portrait</p>
            <p className="upload-hint">Click or drag and drop image file</p>
          </>
        ) : (
          <div className="image-preview">
            <img src={preview} alt="Selected portrait" />
            <button 
              className="change-image-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current.click();
              }}
            >
              Replace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageUpload;