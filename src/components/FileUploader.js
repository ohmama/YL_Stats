import React from 'react';

export const FileUploader = ({ onFileUpload, uploadedFiles, onRemoveFile }) => {
  return (
    <div className="app-controls">
      <div className="file-upload">
        <label className="file-label">上传文件</label>
        <input
          type="file"
          accept=".csv"
          onChange={onFileUpload}
          className="file-input"
          multiple
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="uploaded-files">
          <h3 className="uploaded-files-title">已上传文件：</h3>
          <div className="uploaded-files-list">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="uploaded-file-item">
                <span className="file-name">{file.name}</span>
                <button
                  onClick={() => onRemoveFile(file.name)}
                  className="remove-file-button"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 