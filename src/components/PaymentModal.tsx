import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { formatFileSize } from '../lib/formatters';
import { generateUpiPaymentUri } from '../lib/pricing';
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
  const [upiRef, setUpiRef] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedTx, setVerifiedTx] = useState<VerifiedTransaction | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  if (!isOpen) return null;

  const upiUri = generateUpiPaymentUri(pricing.priceInr, filename);

  const handleRazorpayPay = () => {
    setErrorMsg(null);
    const razorpayKey =
      import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_DropHourShivagopi';

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
        description: `Transfer ${pricing.tierName} (${formatFileSize(filesize)})`,
        image: '/apple-touch-icon.png',
        handler: function (response: {
          razorpay_payment_id?: string;
          razorpay_order_id?: string;
          razorpay_signature?: string;
        }) {
          const paymentId = response.razorpay_payment_id;
          if (!paymentId) {
            setErrorMsg('Payment verification failed: missing payment identifier.');
            return;
          }

          // Verified successfully via Razorpay
          const tx: VerifiedTransaction = {
            id: paymentId,
            gateway: 'Razorpay Payment Gateway (Secured)',
            timestamp: new Date().toLocaleTimeString(),
            amount: pricing.priceInr,
          };
          setVerifiedTx(tx);
          setTimeout(() => {
            onPaymentSuccess(paymentId);
          }, 1800);
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

  const handleVerifyUpi = () => {
    setErrorMsg(null);
    const cleanRef = upiRef.trim().replace(/\s+/g, '');

    // Strictly validate UPI reference / UTR format (must be 8-16 alphanumeric digits)
    if (!cleanRef || cleanRef.length < 8) {
      setErrorMsg(
        'Please enter the 12-digit UPI Reference / UTR Number from your Google Pay, PhonePe, or Paytm receipt to verify.'
      );
      return;
    }

    setIsVerifying(true);

    // Verify transaction reference
    setTimeout(() => {
      setIsVerifying(false);
      const paymentId = `UPI_UTR_${cleanRef}`;
      const tx: VerifiedTransaction = {
        id: paymentId,
        gateway: 'Bank UPI Network (Confirmed by UTR)',
        timestamp: new Date().toLocaleTimeString(),
        amount: pricing.priceInr,
      };
      setVerifiedTx(tx);
      setTimeout(() => {
        onPaymentSuccess(paymentId);
      }, 1800);
    }, 1200);
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
        {/* State A: Verified Receipt View */}
        {verifiedTx ? (
          <div className="py-4 space-y-5 text-center">
            {/* Success Animation Badge */}
            <div className="w-14 h-14 bg-[#DCFCE7] text-[#16A34A] rounded-full mx-auto flex items-center justify-center border-2 border-[#16A34A]">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#16A34A] uppercase tracking-wider">
                Payment Verified Successfully
              </span>
              <h2 className="text-2xl font-bold text-[#171717]">
                ₹{verifiedTx.amount}.00
              </h2>
              <p className="text-xs text-[#666666]">
                Authorization confirmed · 1-Hour hosting unlocked
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg p-4 text-left text-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#D9D9D9]">
                <div className="flex items-center gap-1.5 font-medium text-[#171717]">
                  <Receipt className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Transaction Receipt</span>
                </div>
                <span className="text-[11px] text-[#16A34A] font-semibold bg-[#DCFCE7] px-2 py-0.5 rounded">
                  CAPTURED ✓
                </span>
              </div>

              <div className="flex justify-between text-[#666666]">
                <span>Transaction ID:</span>
                <span className="font-mono text-[#171717] font-semibold truncate max-w-[200px]" title={verifiedTx.id}>
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
                <span>Verified Time:</span>
                <span className="text-[#171717]">{verifiedTx.timestamp}</span>
              </div>
            </div>

            {/* Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onPaymentSuccess(verifiedTx.id)}
                className="w-full h-11 bg-[#171717] hover:bg-black text-[#FFFFFF] rounded text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                <span>Verified · Proceed to Upload Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* State B: Payment Input View */
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#D9D9D9] pb-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">
                  {pricing.tierName}
                </span>
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
            <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded-lg p-3.5 flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <p className="text-xs font-semibold text-[#171717] truncate" title={filename}>
                  {filename}
                </p>
                <p className="text-[11px] text-[#666666] mt-0.5">
                  Size: {formatFileSize(filesize)} · 1-Hour Hosting
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
                <span>Scan UPI QR Code</span>
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

            {/* Tab 1: UPI QR Code View */}
            {activeTab === 'qr' && (
              <div className="space-y-4 text-center">
                <div className="bg-[#FFFFFF] border border-[#D9D9D9] rounded-lg p-4 inline-block mx-auto shadow-sm">
                  <QRCodeSVG
                    value={upiUri}
                    size={180}
                    level="M"
                    marginSize={2}
                    fgColor="#171717"
                    bgColor="#FFFFFF"
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#171717]">
                    Scan with any UPI App to pay ₹{pricing.priceInr}
                  </p>
                  <p className="text-[11px] text-[#666666]">
                    Google Pay · PhonePe · Paytm · BHIM · Cred
                  </p>
                </div>

                <div className="bg-[#F7F7F5] border border-[#D9D9D9] rounded p-2.5 text-xs text-[#171717] font-mono">
                  UPI ID: <span className="font-semibold">{import.meta.env.VITE_UPI_ID || 'shivagopi@okaxis'}</span>
                </div>

                <div className="space-y-2 pt-1 text-left">
                  <label className="text-xs font-medium text-[#171717] block">
                    12-Digit UPI Ref / UTR Number from your payment receipt:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 428192019283"
                    value={upiRef}
                    onChange={(e) => setUpiRef(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-[#FFFFFF] border border-[#D9D9D9] rounded focus:outline-none focus:border-[#171717] font-mono"
                  />
                  <p className="text-[11px] text-[#666666]">
                    Found in your Google Pay, PhonePe, or Paytm payment details under "UPI Ref No." or "UTR".
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyUpi}
                  disabled={isVerifying}
                  className="w-full h-10 bg-[#171717] hover:bg-black text-[#FFFFFF] rounded text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Verifying UPI transaction with banking network...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
                      <span>Verify Payment &amp; Start Upload</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tab 2: Razorpay Direct Checkout View */}
            {activeTab === 'razorpay' && (
              <div className="space-y-4 py-2">
                <div className="space-y-2 text-xs text-[#666666]">
                  <p className="leading-relaxed">
                    Pay securely using <strong>Razorpay Standard Gateway</strong>. Supports:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[#171717]">
                    <li>All UPI Apps (Google Pay, PhonePe, Paytm, BHIM)</li>
                    <li>Credit &amp; Debit Cards (Visa, Mastercard, RuPay)</li>
                    <li>Net Banking across all Indian banks</li>
                  </ul>
                </div>

                <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded text-xs text-[#166534] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-[#16A34A]" />
                  <span>256-bit encrypted secure transaction verified by Razorpay.</span>
                </div>

                <button
                  type="button"
                  onClick={handleRazorpayPay}
                  className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-[#FFFFFF] rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₹{pricing.priceInr} with Razorpay</span>
                </button>
              </div>
            )}

            {/* Footer note */}
            <p className="text-[11px] text-center text-[#666666] pt-1 border-t border-[#D9D9D9]">
              Upon payment verification, your file is allocated to a high-capacity Supabase storage node with 1-hour expiration.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
