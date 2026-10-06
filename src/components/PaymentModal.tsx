import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  CheckCircle2,
  ArrowRight,
  X,
  AlertCircle,
  Loader2,
  Receipt,
  Check,
  Clipboard,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
  XCircle,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { formatFileSize } from '../lib/formatters';
import { generateUpiPaymentUri } from '../lib/pricing';
import {
  createPaymentOrder,
  checkPaymentOrderStatus,
  markOrderAsExpired,
  verifyUtrAgainstStatement,
  confirmRazorpayOrder,
} from '../lib/payment-service';
import type { PaymentOrder } from '../lib/payment-service';
import type { PricingTierInfo } from '../lib/pricing';

interface PaymentModalProps {
  isOpen: boolean;
  filename: string;
  filesize: number;
  pricing: PricingTierInfo;
  onPaymentSuccess: (paymentId?: string) => void;
  onClose: () => void;
}

interface VerifiedTransaction {
  id: string;
  gateway: string;
  timestamp: string;
  amount: number;
  retentionHours: number;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  filename,
  filesize,
  pricing,
  onPaymentSuccess,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'razorpay'>('qr');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(180); // Strict 3-minute window (180s)
  const [isOrderExpired, setIsOrderExpired] = useState(false);
  const [isCheckingStatement, setIsCheckingStatement] = useState(false);
  const [isVerifyingUtr, setIsVerifyingUtr] = useState(false);

  const [upiRef, setUpiRef] = useState('');
  const [verifiedTx, setVerifiedTx] = useState<VerifiedTransaction | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(3);
  const [showManualUtr, setShowManualUtr] = useState(false);

  // Initialize a strict 3-minute payment order
  const initOrder = useCallback(async () => {
    setIsOrderExpired(false);
    setTimeLeftSeconds(180);
    setErrorMsg(null);
    setUpiRef('');
    setVerifiedTx(null);

    const newOrder = await createPaymentOrder(pricing.priceInr, pricing.tierName);
    setOrder(newOrder);
  }, [pricing.priceInr, pricing.tierName]);

  // Load Razorpay Checkout script dynamically
  useEffect(() => {
    if (!document.getElementById('razorpay-checkout-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Initialize order when modal opens
  useEffect(() => {
    let isCancelled = false;
    if (isOpen && !verifiedTx) {
      createPaymentOrder(pricing.priceInr, pricing.tierName).then((newOrder) => {
        if (!isCancelled) {
          setOrder(newOrder);
          setTimeLeftSeconds(180);
          setIsOrderExpired(false);
          setErrorMsg(null);
        }
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen, pricing.priceInr, pricing.tierName, verifiedTx]);

  // Strict 3-minute countdown timer: locks user out if timer hits 00:00
  useEffect(() => {
    if (!isOpen || !order || verifiedTx || isOrderExpired) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsOrderExpired(true);
          markOrderAsExpired(order.orderCode);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, order, verifiedTx, isOrderExpired]);

  // Real-time Bank Statement Polling: continuously verifies if money hit bank account
  useEffect(() => {
    if (!isOpen || !order || verifiedTx || isOrderExpired) return;

    const pollInterval = setInterval(async () => {
      setIsCheckingStatement(true);
      const result = await checkPaymentOrderStatus(order.orderCode);
      setIsCheckingStatement(false);

      if (result.isVerified) {
        clearInterval(pollInterval);
        const tx: VerifiedTransaction = {
          id: result.bankRefUtr || order.orderCode,
          gateway: 'Bank Statement Verified (Credit Confirmed)',
          timestamp: new Date().toLocaleTimeString(),
          amount: pricing.priceInr,
          retentionHours: 2,
        };
        setVerifiedTx(tx);
      } else if (result.isExpired) {
        clearInterval(pollInterval);
        setIsOrderExpired(true);
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [isOpen, order, verifiedTx, isOrderExpired, pricing.priceInr]);

  // When payment is verified, automatically advance to upload after countdown
  useEffect(() => {
    if (!verifiedTx) return;

    const interval = setInterval(() => {
      setAutoAdvanceCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onPaymentSuccess(verifiedTx.id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [verifiedTx, onPaymentSuccess]);

  if (!isOpen) return null;

  // Format time mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const upiUri = generateUpiPaymentUri(
    pricing.priceInr,
    filename,
    order ? order.orderCode : undefined
  );

  // Handle manual UTR verification against bank statements
  const handleManualUpiSubmit = async (ref: string) => {
    if (!order) return;
    setErrorMsg(null);
    const cleanRef = ref.trim().replace(/\s+/g, '');
    if (!cleanRef || cleanRef.length < 8) {
      setErrorMsg('Please enter at least 8 digits from your UPI Reference / UTR.');
      return;
    }

    setIsVerifyingUtr(true);
    const verifyResult = await verifyUtrAgainstStatement(order.orderCode, cleanRef, pricing.priceInr);
    setIsVerifyingUtr(false);

    if (verifyResult.success) {
      const tx: VerifiedTransaction = {
        id: `UPI_UTR_${cleanRef}`,
        gateway: 'Bank Statement Verified (Confirmed by UTR)',
        timestamp: new Date().toLocaleTimeString(),
        amount: pricing.priceInr,
        retentionHours: 2,
      };
      setVerifiedTx(tx);
    } else {
      setErrorMsg(verifyResult.message || 'Payment not yet credited in bank records. Please wait a moment.');
    }
  };

  const handleAutoReadClipboard = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.clipboard?.readText) {
        setErrorMsg('Clipboard access unavailable. Please paste your UTR manually.');
        return;
      }
      const text = await navigator.clipboard.readText();
      const match = text.match(/\b\d{8,16}\b/);
      if (match) {
        const detectedUtr = match[0];
        setUpiRef(detectedUtr);
        handleManualUpiSubmit(detectedUtr);
      } else {
        setErrorMsg('No 12-digit UPI UTR found in clipboard. Copy your receipt and try again.');
      }
    } catch {
      setErrorMsg('Please allow clipboard permission or enter UTR manually.');
    }
  };

  const handleRazorpayPay = () => {
    if (!order) return;
    setErrorMsg(null);
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

    if (typeof window.Razorpay === 'undefined') {
      setErrorMsg('Razorpay SDK is loading. You can scan the UPI QR code directly below.');
      setActiveTab('qr');
      return;
    }

    try {
      const options = {
        key: razorpayKey,
        amount: pricing.priceInr * 100, // Amount in paise
        currency: 'INR',
        name: 'DropHour',
        description: `Order ${order.orderCode} (${formatFileSize(filesize)}) - 2hr Retention`,
        image: '/apple-touch-icon.png',
        handler: async function (response: {
          razorpay_payment_id?: string;
          razorpay_order_id?: string;
          razorpay_signature?: string;
        }) {
          const paymentId = response.razorpay_payment_id;
          if (!paymentId) {
            setErrorMsg('Payment verification failed: missing payment identifier.');
            return;
          }

          await confirmRazorpayOrder(order.orderCode, paymentId);

          const tx: VerifiedTransaction = {
            id: paymentId,
            gateway: 'Razorpay Gateway (Bank Settled)',
            timestamp: new Date().toLocaleTimeString(),
            amount: pricing.priceInr,
            retentionHours: 2,
          };
          setVerifiedTx(tx);
        },
        prefill: {
          name: 'DropHour User',
          email: 'user@drophour.app',
        },
        theme: {
          color: '#171717',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp: { error?: { description?: string } }) {
        setErrorMsg(
          resp.error?.description ||
            'Payment did not complete. You can also scan the UPI QR code.'
        );
      });
      rzp.open();
    } catch {
      setActiveTab('qr');
      setErrorMsg('Checkout window unavailable. Please scan the UPI QR code below.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={verifiedTx ? undefined : onClose}
    >
      <div
        className="w-full max-w-md bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-6 shadow-md space-y-5 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* State A: Verified Receipt View (Payment Verified by Bank Statements) */}
        {verifiedTx ? (
          <div className="py-2 space-y-4 text-center">
            {/* Success Animation Badge */}
            <div className="w-16 h-16 bg-[#DCFCE7] text-[#16A34A] rounded-full mx-auto flex items-center justify-center border-2 border-[#16A34A] shadow-sm animate-in fade-in zoom-in duration-300">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                Bank Statement Credit Confirmed!
              </span>
              <h2 className="text-3xl font-extrabold text-[#171717]">
                ₹{verifiedTx.amount}.00
              </h2>
              {/* Highlight 2-hour retention */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] rounded-full text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Extended 2-Hour Retention Activated</span>
              </div>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg p-4 text-left text-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#D9D9D9]">
                <div className="flex items-center gap-1.5 font-medium text-[#171717]">
                  <Receipt className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Official Transaction Receipt</span>
                </div>
                <span className="text-[10px] text-[#16A34A] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#BBF7D0]">
                  SETTLED IN BANK ✓
                </span>
              </div>

              <div className="flex justify-between text-[#666666]">
                <span>Transaction Ref:</span>
                <span
                  className="font-mono text-[#171717] font-semibold truncate max-w-[200px]"
                  title={verifiedTx.id}
                >
                  {verifiedTx.id}
                </span>
              </div>

              <div className="flex justify-between text-[#666666]">
                <span>Payment Channel:</span>
                <span className="text-[#171717] font-medium">{verifiedTx.gateway}</span>
              </div>

              <div className="flex justify-between text-[#666666]">
                <span>File Size:</span>
                <span className="text-[#171717] font-medium">{formatFileSize(filesize)}</span>
              </div>

              <div className="flex justify-between text-[#666666]">
                <span>Storage Retention:</span>
                <span className="text-[#16A34A] font-bold">2 Hours (120 mins) · Paid Tier</span>
              </div>

              <div className="flex justify-between text-[#666666]">
                <span>Timestamp:</span>
                <span className="text-[#171717]">{verifiedTx.timestamp}</span>
              </div>
            </div>

            {/* Action / Auto-advance */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => onPaymentSuccess(verifiedTx.id)}
                className="w-full h-11 bg-[#171717] hover:bg-black text-[#FFFFFF] rounded text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                <span>Proceed to Upload Now (2-Hr Retention)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-[#666666]">
                Automatically proceeding to upload in {autoAdvanceCountdown}s...
              </p>
            </div>
          </div>
        ) : isOrderExpired ? (
          /* State B: Strict Rejection / Lockout State (Timer Expired & No Bank Credit Found) */
          <div className="py-4 space-y-4 text-center">
            <div className="w-16 h-16 bg-[#FEE2E2] text-[#DC2626] rounded-full mx-auto flex items-center justify-center border-2 border-[#DC2626] shadow-sm animate-in fade-in zoom-in duration-200">
              <XCircle className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-[#DC2626] uppercase tracking-wider flex items-center justify-center gap-1">
                <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                Payment Window Expired
              </span>
              <h2 className="text-2xl font-extrabold text-[#171717]">
                Upload Permission Blocked
              </h2>
              <p className="text-xs text-[#666666] max-w-sm mx-auto leading-relaxed pt-1">
                The 3-minute payment verification window has expired. No confirmed credit was found in bank statements for order <strong className="font-mono text-[#171717]">{order?.orderCode}</strong>.
              </p>
            </div>

            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs text-[#991B1B] text-left space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Strict Bank Verification Policy</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Files larger than 50 MB require verified bank account credit. Uploading without confirmed payment is strictly blocked.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={initOrder}
                className="w-full h-10 bg-[#171717] hover:bg-black text-[#FFFFFF] rounded text-xs font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Start New 3-Minute Payment Window</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full h-9 bg-[#F7F7F5] hover:bg-[#EAEAEA] border border-[#D9D9D9] text-[#171717] rounded text-xs font-medium transition-colors"
              >
                Cancel &amp; Return to Free Tier (50MB)
              </button>
            </div>
          </div>
        ) : (
          /* State C: Active Payment & Bank Statement Listening View */
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                    {pricing.tierName}
                  </span>
                  {order && (
                    <span className="font-mono text-[10px] font-bold bg-[#E0E7FF] text-[#3730A3] px-2 py-0.5 rounded">
                      {order.orderCode}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-[#171717]">
                  Verify Payment to Unlock Upload
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-[#666666] hover:text-[#171717] p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* File & Price Summary Card */}
            <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg p-3.5 flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <p className="text-xs font-semibold text-[#171717] truncate" title={filename}>
                  {filename}
                </p>
                <p className="text-[11px] text-[#16A34A] font-medium mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    Size: {formatFileSize(filesize)} · <strong>2-Hour Extended Retention</strong>
                  </span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-bold text-[#171717]">
                  ₹{pricing.priceInr}
                </span>
                <span className="block text-[10px] text-[#666666]">One-time fee</span>
              </div>
            </div>

            {/* Tab Selection */}
            <div className="flex border-b border-[#D9D9D9] text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={`flex-1 py-2 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === 'qr'
                    ? 'border-[#171717] text-[#171717] font-semibold'
                    : 'border-transparent text-[#666666] hover:text-[#171717]'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>UPI QR Code (Bank Verification)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('razorpay')}
                className={`flex-1 py-2 text-center border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === 'razorpay'
                    ? 'border-[#171717] text-[#171717] font-semibold'
                    : 'border-transparent text-[#666666] hover:text-[#171717]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Razorpay / Cards</span>
              </button>
            </div>

            {errorMsg && (
              <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs p-2.5 rounded flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Tab 1: Strict Bank-Verified UPI QR */}
            {activeTab === 'qr' && (
              <div className="space-y-3.5 text-center">
                {/* Live Countdown & Bank Statement Listening Badge */}
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                    timeLeftSeconds <= 30
                      ? 'bg-[#FEE2E2] border border-[#FCA5A5] text-[#DC2626] animate-pulse'
                      : 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Window Closes In: {formatTime(timeLeftSeconds)} · Strict Bank Verification
                  </span>
                </div>

                {/* Dynamic QR Code Container */}
                <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-3 inline-block mx-auto shadow-sm">
                  <QRCodeSVG
                    value={upiUri}
                    size={165}
                    level="M"
                    marginSize={2}
                    fgColor="#171717"
                    bgColor="#FFFFFF"
                  />
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[#171717]">
                    Scan &amp; Pay ₹{pricing.priceInr} with any UPI App
                  </p>
                  <p className="text-[11px] text-[#666666]">
                    Google Pay · PhonePe · Paytm · BHIM · Cred
                  </p>
                </div>

                <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded p-1.5 text-xs text-[#171717] font-mono flex items-center justify-between">
                  <span className="text-[#666666]">UPI VPA:</span>
                  <span className="font-semibold">{import.meta.env.VITE_UPI_ID || 'pay@upi'}</span>
                </div>

                {/* Real-Time Statement Verification Radar Box */}
                <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg p-3 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-[#171717]">
                      <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Bank Statement Verification</span>
                    </span>
                    <span className="text-[10px] text-[#2563EB] font-bold bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                      {formatTime(timeLeftSeconds)} LEFT
                    </span>
                  </div>

                  <div className="text-[11px] text-[#666666] flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB] shrink-0" />
                    <span>
                      {isCheckingStatement
                        ? 'Verifying bank statement credits for this order...'
                        : `Monitoring bank account for ₹${pricing.priceInr} credit with ref ${order?.orderCode}...`}
                    </span>
                  </div>

                  {/* Progress bar matching 3-minute remaining time */}
                  <div className="w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                        timeLeftSeconds <= 30 ? 'bg-[#DC2626]' : 'bg-[#2563EB]'
                      }`}
                      style={{
                        width: `${Math.max(0, (timeLeftSeconds / 180) * 100)}%`,
                      }}
                    />
                  </div>

                  <p className="text-[10px] text-[#DC2626] font-medium pt-0.5">
                    ⚠️ <strong>Strict Rule:</strong> Complete payment before 00:00. Once the timer expires without confirmed bank credit, upload is blocked!
                  </p>
                </div>

                {/* Instant UTR Statement Match Button / Dropdown */}
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setShowManualUtr(!showManualUtr)}
                    className="text-[11px] text-[#2563EB] hover:text-[#1D4ED8] font-semibold inline-flex items-center gap-1 transition-colors hover:underline"
                  >
                    <span>Paid on Phone? Match 12-Digit Bank UTR Instantly</span>
                    {showManualUtr ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {showManualUtr && (
                    <div className="mt-2 p-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-lg text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-[#171717]">
                          Enter 12-Digit UTR from Bank Receipt/SMS:
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoReadClipboard}
                          className="text-[10px] text-[#2563EB] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Clipboard className="w-3 h-3" />
                          <span>Paste Clipboard</span>
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 428192019283"
                          value={upiRef}
                          onChange={(e) => setUpiRef(e.target.value)}
                          className="flex-1 h-8 px-2 text-xs bg-white border border-[#D9D9D9] rounded font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleManualUpiSubmit(upiRef)}
                          disabled={isVerifyingUtr}
                          className="px-3 h-8 bg-[#171717] hover:bg-black text-white text-xs rounded font-medium disabled:opacity-50 flex items-center gap-1"
                        >
                          {isVerifyingUtr ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                          )}
                          <span>Verify</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Razorpay Direct Checkout View */}
            {activeTab === 'razorpay' && (
              <div className="space-y-4 py-2">
                <div className="space-y-2 text-xs text-[#666666]">
                  <p className="leading-relaxed">
                    Pay securely using <strong>Razorpay Standard Gateway</strong>:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[#171717]">
                    <li>All UPI Apps (Google Pay, PhonePe, Paytm, BHIM)</li>
                    <li>Credit &amp; Debit Cards (Visa, Mastercard, RuPay)</li>
                    <li>Net Banking across all Indian banks</li>
                  </ul>
                </div>

                <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded text-xs text-[#166534] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-[#16A34A]" />
                  <span>Instant settlement &amp; direct bank verification.</span>
                </div>

                <button
                  type="button"
                  onClick={handleRazorpayPay}
                  className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-[#FFFFFF] rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₹{pricing.priceInr} with Razorpay (Instant Settle)</span>
                </button>
              </div>
            )}

            {/* Footer note */}
            <p className="text-[11px] text-center text-[#666666] pt-1 border-t border-[#D9D9D9]">
              Window: <strong>3 minutes</strong> · Only paid &amp; bank-verified transfers unlock upload.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
