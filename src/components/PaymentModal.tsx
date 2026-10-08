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
  Clock,
  XCircle,
  RotateCcw,
  ShieldAlert,
  ExternalLink,
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

  const [verifiedTx, setVerifiedTx] = useState<VerifiedTransaction | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState(3);

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
  // Reuses the exact same active Razorpay order and QR code if within 3 minutes
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

  // Real-time Razorpay Status Polling (Auto-Detect payment completed via Razorpay link, QR scan, or checkout)
  useEffect(() => {
    if (!isOpen || !order?.paymentLinkId || verifiedTx || isOrderExpired) return;

    const pollInterval = setInterval(async () => {
      const res = await checkRazorpayStatus(order.paymentLinkId!);

      if (res.isPaid) {
        clearInterval(pollInterval);
        const paymentId = res.paymentId || `pay_${Date.now()}`;
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
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isOpen, order?.paymentLinkId, order?.orderCode, verifiedTx, isOrderExpired, pricing.priceInr]);

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
      setErrorMsg('Razorpay Checkout SDK is loading. Please scan the QR code above or wait a moment.');
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

  // The official Razorpay payment link generated dynamically
  const razorpayQrValue = order?.paymentUrl || '';

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
        {/* State A: Verified Receipt View (Payment Verified by Razorpay) */}
        {verifiedTx ? (
          <div className="py-2 space-y-4 text-center">
            {/* Success Animation Badge */}
            <div className="w-16 h-16 bg-[#DCFCE7] text-[#16A34A] rounded-full mx-auto flex items-center justify-center border-2 border-[#16A34A] shadow-sm animate-in fade-in zoom-in duration-300">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                Payment Verified by Razorpay!
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
                  <span>Official Razorpay Receipt</span>
                </div>
                <span className="text-[10px] text-[#16A34A] font-bold bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#BBF7D0]">
                  SETTLED IN BANK ✓
                </span>
              </div>

              <div className="flex justify-between text-[#666666]">
                <span>Razorpay Payment ID:</span>
                <span
                  className="font-mono text-[#171717] font-semibold truncate max-w-[200px]"
                  title={verifiedTx.id}
                >
                  {verifiedTx.id}
                </span>
              </div>

              <div className="flex justify-between text-[#666666]">
                <span>Payment Gateway:</span>
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
          /* State B: Strict Lockout State (3 Minutes Expired & Unpaid) */
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
          /* State C: Active Razorpay QR & Checkout View (Persistent across modal close/open for 3 mins) */
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
                  Razorpay Secure Checkout
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

            {errorMsg && (
              <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs p-2.5 rounded flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Razorpay QR Section */}
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

              {/* Dynamic Razorpay QR Code Container */}
              <div className="bg-[#FFFFFF] border-2 border-[#171717] rounded-xl p-3 inline-block mx-auto shadow-md relative min-w-[195px] min-h-[195px]">
                {razorpayQrValue ? (
                  <>
                    <QRCodeSVG
                      value={razorpayQrValue}
                      size={175}
                      level="M"
                      marginSize={2}
                      fgColor="#171717"
                      bgColor="#FFFFFF"
                    />
                    <div className="mt-1 pt-1 border-t border-[#E5E5E5] flex items-center justify-center gap-1 text-[10px] font-semibold text-[#2563EB]">
                      <ShieldCheck className="w-3 h-3 text-[#2563EB]" />
                      <span>Razorpay Official QR</span>
                    </div>
                  </>
                ) : (
                  <div className="w-[175px] h-[175px] flex flex-col items-center justify-center gap-2 text-xs text-[#666666]">
                    <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
                    <span>Generating Razorpay QR...</span>
                  </div>
                )}
              </div>

              {/* Payment Methods Supported */}
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#171717]">
                  Scan with Camera, Google Pay, PhonePe, or Paytm
                </p>
                <p className="text-[11px] text-[#666666]">
                  UPI · Credit Cards · Debit Cards · Net Banking · Wallets
                </p>
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

              {/* Direct Link button */}
              {razorpayQrValue && (
                <a
                  href={razorpayQrValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#2563EB] hover:underline font-medium"
                >
                  <span>Or open Razorpay payment link in new tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Footer note */}
            <p className="text-[11px] text-center text-[#666666] pt-1 border-t border-[#D9D9D9]">
              100% Secured by <strong>Razorpay</strong> · Extended <strong>2 hours</strong> retention activated immediately.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
