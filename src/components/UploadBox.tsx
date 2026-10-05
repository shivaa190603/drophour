import React, { useRef, useState, type DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';

interface UploadBoxProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export const UploadBox: React.FC<UploadBoxProps> = ({ onFileSelected, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      onFileSelected(droppedFile);
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
    // Reset input value so same file can be re-selected if removed
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload file area. Drop your file here or choose a file."
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full rounded-lg border-2 border-dashed p-10 md:p-14 text-center cursor-pointer transition-colors outline-none select-none ${
        isDragging
          ? 'border-[#2563EB] bg-[#EFF6FF]'
          : 'border-[#D9D9D9] bg-[#FFFFFF] hover:border-[#666666]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            isDragging ? 'bg-[#2563EB] text-[#FFFFFF]' : 'bg-[#F7F7F5] text-[#171717] border border-[#D9D9D9]'
          }`}
        >
          <UploadCloud className="w-6 h-6" strokeWidth={2} />
        </div>

        <div className="space-y-1">
          <p className="text-base font-semibold text-[#171717]">
            {isDragging ? 'Drop your file here' : 'Drop your file here'}
          </p>
          <p className="text-sm text-[#666666]">
            or <span className="text-[#2563EB] font-medium hover:underline">choose a file</span>
          </p>
        </div>

        <p className="text-xs text-[#666666] pt-2">
          Files are automatically deleted after 1 hour (up to 50 MB)
        </p>
      </div>
    </div>
  );
};
