import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  X,
  AlertCircle,
  Loader2,
  Receipt,
  Check,
  Sparkles,
  Clock,
  XCircle,
  RotateCcw,
  ShieldAlert,
  ExternalLink,
  Smartphone,
  Copy,
} from 'lucide-react';
import { formatFileSize } from '../lib/formatters';
import {
  createRazorpayOrder,
  getOrCreateRazorpayOrder,
  saveActivePaymentOrder,
  clearActivePaymentOrder,
  checkRazorpayStatus,
  markOrderAsExpired,
  confirmRazorpayOrder,
  verifyUtrAgainstStatement,
  checkPaymentOrderStatus,
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
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(180); // Strict 3-minute window (180s)
  const [isOrderExpired, setIsOrderExpired] = useState(false);
  const [isPollingRazorpay, setIsPollingRazorpay] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'upi' | 'razorpay'>('upi');

  const [verifiedTx, setVerifiedTx] = useState<VerifiedTransaction | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(3);
  const [isCopiedUpi, setIsCopiedUpi] = useState(false);

  // Manual UTR verification option
  const [showUtrField, setShowUtrField] = useState(false);
  const [manualUtr, setManualUtr] = useState('');
  const [isVerifyingUtr, setIsVerifyingUtr] = useState(false);
  const [utrSuccessMsg, setUtrSuccessMsg] = useState<string | null>(null);

  const upiId = import.meta.env.VITE_UPI_ID || 'shivaxroy@ybl';

  // Load Razorpay Checkout SDK dynamically
  useEffect(() => {
    if (!document.getElementById('razorpay-checkout-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Strict 3-minute order persistence across modal close/open:
  // Reuses the exact same active order and QR code if within 3 minutes
  useEffect(() => {
    let isCancelled = false;
    if (isOpen && !verifiedTx) {
      getOrCreateRazorpayOrder(pricing.priceInr, pricing.tierName, filename).then((activeOrder) => {
        if (!isCancelled) {
          setOrder(activeOrder);
          const remainingSec = Math.max(
            0,
            Math.floor((new Date(activeOrder.expiresAt).getTime() - Date.now()) / 1000)
          );
          setTimeLeftSeconds(remainingSec);
          if (remainingSec <= 0) {
            setIsOrderExpired(true);
            markOrderAsExpired(activeOrder.orderCode);
            clearActivePaymentOrder();
          } else {
            setIsOrderExpired(false);
          }
          setErrorMsg(null);
        }
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [isOpen, pricing.priceInr, pricing.tierName, filename, verifiedTx]);

  // Restart 3-minute window when explicitly requested by user
  const initOrder = useCallback(async () => {
    clearActivePaymentOrder();
    setIsOrderExpired(false);
    setTimeLeftSeconds(180);
    setErrorMsg(null);
    setVerifiedTx(null);
    setManualUtr('');
    setUtrSuccessMsg(null);

    const newOrder = await createRazorpayOrder(
      pricing.priceInr,
      pricing.tierName,
      filename
    );
    saveActivePaymentOrder(newOrder, filename);
    setOrder(newOrder);
  }, [pricing.priceInr, pricing.tierName, filename]);

  // Strict 3-minute countdown timer: calculates exact seconds relative to expiresAt
  useEffect(() => {
    if (!isOpen || !order || verifiedTx || isOrderExpired) return;

    const timer = setInterval(() => {
      const remainingSec = Math.max(
        0,
        Math.floor((new Date(order.expiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeftSeconds(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(timer);
        setIsOrderExpired(true);
        markOrderAsExpired(order.orderCode);
        clearActivePaymentOrder();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, order, verifiedTx, isOrderExpired]);

  // Real-time Razorpay Status Polling (Auto-Detect payment completed via Razorpay link or checkout)
  useEffect(() => {
    if (!isOpen || !order?.paymentLinkId || verifiedTx || isOrderExpired) return;

    const pollInterval = setInterval(async () => {
      setIsPollingRazorpay(true);
      const res = await checkRazorpayStatus(order.paymentLinkId!);
      setIsPollingRazorpay(false);

      if (res.isPaid) {
        clearInterval(pollInterval);
        const paymentId = res.paymentId || `pay_${Date.now()}`;
        await confirmRazorpayOrder(order.orderCode, paymentId);
        clearActivePaymentOrder();

        const tx: VerifiedTransaction = {
          id: paymentId,
          gateway: 'Razorpay Verified Gateway',
          timestamp: new Date().toLocaleTimeString(),
          amount: pricing.priceInr,
          retentionHours: 2,
        };
        setVerifiedTx(tx);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isOpen, order?.paymentLinkId, order?.orderCode, verifiedTx, isOrderExpired, pricing.priceInr]);

  // Background Bank Statement Status Polling (To catch UPI payments matched in database)
  useEffect(() => {
    if (!isOpen || !order?.orderCode || verifiedTx || isOrderExpired) return;

    const statusInterval = setInterval(async () => {
      const statusRes = await checkPaymentOrderStatus(order.orderCode);
      if (statusRes.isVerified) {
        clearInterval(statusInterval);
        clearActivePaymentOrder();
        const tx: VerifiedTransaction = {
          id: statusRes.bankRefUtr || `upi_${Date.now()}`,
          gateway: 'UPI Bank Statement Verified',
          timestamp: new Date().toLocaleTimeString(),
          amount: pricing.priceInr,
          retentionHours: 2,
        };
        setVerifiedTx(tx);
      }
    }, 3000);

    return () => clearInterval(statusInterval);
  }, [isOpen, order?.orderCode, verifiedTx, isOrderExpired, pricing.priceInr]);

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

  // Launch official Razorpay Checkout modal directly on this device
  const handleRazorpayPay = () => {
    if (!order) return;
    setErrorMsg(null);
    const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

    if (typeof window.Razorpay === 'undefined') {
      setErrorMsg('Razorpay SDK is loading. Please scan the QR code above or wait a moment.');
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
          clearActivePaymentOrder();

          const tx: VerifiedTransaction = {
            id: paymentId,
            gateway: 'Razorpay Verified Gateway (Direct Settlement)',
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
            'Payment did not complete. You can also scan the QR code.'
        );
      });
      rzp.open();
    } catch {
      setErrorMsg('Checkout window unavailable. Please scan the QR code above.');
    }
  };

  // Handle manual 12-digit UTR submission for UPI transfers
  const handleVerifyManualUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !manualUtr.trim()) return;

    setIsVerifyingUtr(true);
    setErrorMsg(null);

    const cleanUtr = manualUtr.trim().replace(/\s+/g, '');
    const res = await verifyUtrAgainstStatement(order.orderCode, cleanUtr, pricing.priceInr);
    setIsVerifyingUtr(false);

    if (res.success) {
      setUtrSuccessMsg(res.message);
      clearActivePaymentOrder();
      const tx: VerifiedTransaction = {
        id: cleanUtr,
        gateway: 'UPI Statement Matched (Instant Settlement)',
        timestamp: new Date().toLocaleTimeString(),
        amount: pricing.priceInr,
        retentionHours: 2,
      };
      setVerifiedTx(tx);
    } else {
      setErrorMsg(res.message);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setIsCopiedUpi(true);
    setTimeout(() => setIsCopiedUpi(false), 2000);
  };

  // 1. Native Universal UPI Intent URI:
  // Immediately parsed by PhonePe, Google Pay, Paytm, FamPay, BHIM, Cred, etc.
  const universalUpiUri = `upi://pay?pa=${upiId}&pn=DropHour&am=${pricing.priceInr}&cu=INR&tn=${order?.orderCode || 'DH-ORDER'}`;

  // 2. Razorpay Hosted Payment Link (or fallback to UPI QR)
  const razorpayTargetUrl = order?.paymentUrl || universalUpiUri;

  // Active QR code value based on user's selected mode
  const activeQrValue = paymentMode === 'upi' ? universalUpiUri : razorpayTargetUrl;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={verifiedTx ? undefined : onClose}
    >
      <div
        className="w-full max-w-md bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-6 shadow-md space-y-4 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* State A: Verified Receipt View (Payment Confirmed) */}
        {verifiedTx ? (
          <div className="py-2 space-y-4 text-center">
            {/* Success Animation Badge */}
            <div className="w-16 h-16 bg-[#DCFCE7] text-[#16A34A] rounded-full mx-auto flex items-center justify-center border-2 border-[#16A34A] shadow-sm animate-in fade-in zoom-in duration-300">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                Payment Confirmed &amp; Verified!
              </span>
              <h2 className="text-3xl font-extrabold text-[#171717]">
                ₹{verifiedTx.amount}.00
              </h2>
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
                  <span>Verified Payment Receipt</span>
                </div>
                <span className="text-[10px] text-[#16A34A] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#BBF7D0]">
                  SETTLED IN BANK ✓
                </span>
              </div>

              <div className="flex justify-between text-[#666666]">
                <span>Transaction / Payment ID:</span>
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
          /* State B: Strict Rejection / Lockout State (3 Minutes Expired & Unpaid) */
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
                The 3-minute payment verification window has expired. Payment was not confirmed for order{' '}
                <strong className="font-mono text-[#171717]">{order?.orderCode}</strong>.
              </p>
            </div>

            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs text-[#991B1B] text-left space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Strict Payment Policy</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Files larger than 50 MB require confirmed payment. Uploading without verified payment is strictly blocked.
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
          /* State C: Active QR & Checkout View (Persistent across modal close/open for 3 mins) */
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
                  Complete Transfer Payment
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
            <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg p-3 flex items-center justify-between">
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

            {/* Payment Method Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-[#F7F7F5] p-1 rounded-lg border border-[#D9D9D9] text-xs">
              <button
                type="button"
                onClick={() => setPaymentMode('upi')}
                className={`py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMode === 'upi'
                    ? 'bg-[#FFFFFF] text-[#171717] shadow-sm font-semibold'
                    : 'text-[#666666] hover:text-[#171717]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>UPI Scan &amp; Pay</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('razorpay')}
                className={`py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  paymentMode === 'razorpay'
                    ? 'bg-[#FFFFFF] text-[#171717] shadow-sm font-semibold'
                    : 'text-[#666666] hover:text-[#171717]'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Razorpay Checkout</span>
              </button>
            </div>

            {errorMsg && (
              <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs p-2.5 rounded flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {utrSuccessMsg && (
              <div className="bg-[#DCFCE7] border border-[#BBF7D0] text-[#16A34A] text-xs p-2.5 rounded flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{utrSuccessMsg}</span>
              </div>
            )}

            {/* QR Section */}
            <div className="space-y-3 text-center">
              {/* Strict 3-Minute Live Countdown Badge */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  timeLeftSeconds <= 30
                    ? 'bg-[#FEE2E2] border border-[#FCA5A5] text-[#DC2626] animate-pulse'
                    : 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Order ID &amp; QR Locked: {formatTime(timeLeftSeconds)} remaining
                </span>
              </div>

              {/* Dynamic QR Code Container */}
              <div className="bg-[#FFFFFF] border-2 border-[#171717] rounded-xl p-3 inline-block mx-auto shadow-md relative">
                <QRCodeSVG
                  value={activeQrValue}
                  size={175}
                  level="M"
                  marginSize={2}
                  fgColor="#171717"
                  bgColor="#FFFFFF"
                />
                <div className="mt-1 pt-1 border-t border-[#E5E5E5] flex items-center justify-center gap-1 text-[10px] font-semibold text-[#2563EB]">
                  <ShieldCheck className="w-3 h-3 text-[#2563EB]" />
                  <span>
                    {paymentMode === 'upi' ? 'Direct UPI Intent QR' : 'Razorpay Hosted QR'}
                  </span>
                </div>
              </div>

              {/* Accepted Apps Badges */}
              {paymentMode === 'upi' ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[#171717]">
                    Scan with PhonePe, Google Pay, Paytm, or FamPay
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1 text-[10px] text-[#444444]">
                    <span className="bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded font-medium">Google Pay</span>
                    <span className="bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded font-medium">PhonePe</span>
                    <span className="bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded font-medium">Paytm</span>
                    <span className="bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded font-medium">FamPay</span>
                    <span className="bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded font-medium">BHIM</span>
                  </div>
                  <div className="pt-1 flex items-center justify-center gap-2 text-[11px] text-[#666666]">
                    <span>UPI ID: <strong className="font-mono text-[#171717]">{upiId}</strong></span>
                    <button
                      type="button"
                      onClick={copyUpiId}
                      className="text-[#2563EB] hover:underline flex items-center gap-0.5 text-[10px]"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{isCopiedUpi ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#171717]">
                    Razorpay Gateway (Cards, UPI, Net Banking)
                  </p>
                  <p className="text-[11px] text-[#666666]">
                    Visa · Mastercard · RuPay · Net Banking · Wallets
                  </p>
                  {order?.paymentUrl && (
                    <a
                      href={order.paymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#2563EB] hover:underline font-medium"
                    >
                      <span>Open Razorpay payment link in new tab</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Real-Time Live Status Bar */}
              <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg p-2.5 text-left space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-[#171717]">
                    <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Real-Time Payment Detection</span>
                  </span>
                  <span className="text-[10px] text-[#16A34A] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#BBF7D0]">
                    AUTO-DETECT ON ✓
                  </span>
                </div>

                <div className="text-[11px] text-[#666666] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB] shrink-0" />
                  <span>
                    {isPollingRazorpay
                      ? 'Checking payment status with banking servers...'
                      : 'Waiting for payment... Advances automatically once paid!'}
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
              </div>

              {/* Direct Checkout Button on Device */}
              <button
                type="button"
                onClick={handleRazorpayPay}
                className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-[#FFFFFF] rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay ₹{pricing.priceInr} with Razorpay (Checkout on this device)</span>
              </button>

              {/* Manual UTR input option for UPI scans */}
              <div className="pt-1">
                {!showUtrField ? (
                  <button
                    type="button"
                    onClick={() => setShowUtrField(true)}
                    className="text-[11px] text-[#666666] hover:text-[#171717] underline transition-colors"
                  >
                    Paid via UPI app? Click here to enter 12-digit UTR reference
                  </button>
                ) : (
                  <form onSubmit={handleVerifyManualUtr} className="space-y-2 text-left bg-[#F7F7F5] p-3 rounded-lg border border-[#D9D9D9]">
                    <div className="flex items-center justify-between">
                      <label htmlFor="utr-input" className="text-[11px] font-semibold text-[#171717]">
                        12-Digit UPI UTR Reference Number:
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowUtrField(false)}
                        className="text-[10px] text-[#666666] hover:text-[#171717]"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="utr-input"
                        type="text"
                        value={manualUtr}
                        onChange={(e) => setManualUtr(e.target.value)}
                        placeholder="e.g. 428910294812"
                        maxLength={16}
                        className="flex-1 h-9 px-2.5 text-xs border border-[#D9D9D9] rounded font-mono focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="submit"
                        disabled={isVerifyingUtr || !manualUtr.trim()}
                        className="px-3 h-9 bg-[#171717] hover:bg-black disabled:bg-[#999999] text-[#FFFFFF] text-xs font-semibold rounded transition-colors"
                      >
                        {isVerifyingUtr ? 'Verifying...' : 'Verify UTR'}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#666666]">
                      Found in your GPay / PhonePe / Paytm receipt details as &quot;UPI Ref ID&quot; or &quot;UTR&quot;.
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* Footer note */}
            <p className="text-[11px] text-center text-[#666666] pt-1 border-t border-[#D9D9D9]">
              Secured by <strong>Razorpay</strong> &amp; <strong>UPI</strong> · Extended <strong>2 hours</strong> retention activated immediately.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
