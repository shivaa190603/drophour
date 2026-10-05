import { useState, useCallback } from 'react';
import type { UploadStage, CreateShareResponse } from '../types/file';
import { validateFile } from '../lib/validation';
import { uploadAndCreateShare } from '../lib/storage-service';

export function useUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CreateShareResponse | null>(null);

  const handleFileSelected = useCallback((selectedFile: File) => {
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file');
      setStage('error');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setStage('selected');
    setProgressPercent(0);
    setErrorMessage(null);
  }, []);

  const cancelSelection = useCallback(() => {
    setFile(null);
    setStage('idle');
    setProgressPercent(0);
    setErrorMessage(null);
  }, []);

  const startUpload = useCallback(async () => {
    if (!file) return;

    try {
      setStage('uploading');
      setProgressPercent(10);
      setErrorMessage(null);

      const shareResult = await uploadAndCreateShare(file, (progress) => {
        setProgressPercent(progress);
        if (progress >= 80 && progress < 100) {
          setStage('securing');
        }
      });

      setStage('completed');
      setProgressPercent(100);
      setResult(shareResult);
    } catch (err: unknown) {
      setStage('error');
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setErrorMessage(msg);
    }
  }, [file]);

  const reset = useCallback(() => {
    setFile(null);
    setStage('idle');
    setProgressPercent(0);
    setErrorMessage(null);
    setResult(null);
  }, []);

  return {
    file,
    stage,
    progressPercent,
    errorMessage,
    result,
    handleFileSelected,
    cancelSelection,
    startUpload,
    reset,
  };
}
