import { useState, useCallback, useMemo } from 'react';
import type { UploadStage, CreateShareResponse } from '../types/file';
import { validateFile } from '../lib/validation';
import { uploadAndCreateShare } from '../lib/storage-service';
import { getFilePricingTier } from '../lib/pricing';
import type { PricingTierInfo } from '../lib/pricing';

export function useUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CreateShareResponse | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);

  const pricing: PricingTierInfo = useMemo(() => {
    if (!file) {
      return {
        priceInr: 0,
        isPaid: false,
        tierName: 'Free Tier',
        description: 'Files up to 50 MB are free with 1-hour expiration.',
        badgeLabel: 'Free · 1hr',
        expiryHours: 1,
      };
    }
    return getFilePricingTier(file.size);
  }, [file]);

  const handleFileSelected = useCallback((selectedFile: File) => {
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file');
      setStage('error');
      setFile(null);
      setIsPaymentConfirmed(false);
      return;
    }

    setFile(selectedFile);
    setStage('selected');
    setProgressPercent(0);
    setErrorMessage(null);
    setIsPaymentConfirmed(false);
  }, []);

  const cancelSelection = useCallback(() => {
    setFile(null);
    setStage('idle');
    setProgressPercent(0);
    setErrorMessage(null);
    setIsPaymentConfirmed(false);
    setIsPaymentModalOpen(false);
  }, []);

  const executeUpload = useCallback(
    async (paymentDetails?: { amountPaidInr: number; paymentId?: string }) => {
      if (!file) return;

      try {
        setStage('uploading');
        setProgressPercent(10);
        setErrorMessage(null);

        const shareResult = await uploadAndCreateShare(
          file,
          (progress) => {
            setProgressPercent(progress);
            if (progress >= 80 && progress < 100) {
              setStage('securing');
            }
          },
          paymentDetails
        );

        setStage('completed');
        setProgressPercent(100);
        setResult(shareResult);
      } catch (err: unknown) {
        setStage('error');
        const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        setErrorMessage(msg);
      }
    },
    [file]
  );

  const startUpload = useCallback(() => {
    if (!file) return;

    // Check if this file size requires payment and hasn't been confirmed yet
    if (pricing.isPaid && !isPaymentConfirmed) {
      setIsPaymentModalOpen(true);
      return;
    }

    executeUpload();
  }, [file, pricing.isPaid, isPaymentConfirmed, executeUpload]);

  const handlePaymentSuccess = useCallback(
    (paymentId?: string) => {
      setIsPaymentConfirmed(true);
      setIsPaymentModalOpen(false);
      executeUpload({
        amountPaidInr: pricing.priceInr,
        paymentId: paymentId || `pay_sim_${Date.now()}`,
      });
    },
    [executeUpload, pricing.priceInr]
  );

  const reset = useCallback(() => {
    setFile(null);
    setStage('idle');
    setProgressPercent(0);
    setErrorMessage(null);
    setResult(null);
    setIsPaymentConfirmed(false);
    setIsPaymentModalOpen(false);
  }, []);

  return {
    file,
    stage,
    progressPercent,
    errorMessage,
    result,
    pricing,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    handleFileSelected,
    cancelSelection,
    startUpload,
    handlePaymentSuccess,
    reset,
  };
}
