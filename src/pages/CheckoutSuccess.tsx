import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, ArrowLeft, Package, AlertCircle, Clock } from "lucide-react";

interface SessionInfo {
  status: string;
  customerEmail: string | null;
  amountTotal: number | null;
  currency: string | null;
  productName: string | null;
}

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setLoading(false);
      setError(true);
      return;
    }

    fetch(`/api/stripe/session/${sessionId}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to verify payment");
        return res.json();
      })
      .then(data => {
        setSession(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [searchParams]);

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (!amount || !currency) return "";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const isPaid = session?.status === "paid";
  const isPending = session?.status === "unpaid" || session?.status === "no_payment_required";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card rounded-2xl p-8 text-center"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Confirming your order...</p>
          </div>
        ) : error || !session ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, delay: 0.2 }}
              className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4"
            >
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </motion.div>
            <h1 className="text-xl font-bold text-foreground mb-2" data-testid="text-checkout-error">
              Unable to Verify Payment
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              We couldn't confirm your payment status. If you were charged, please contact us.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-xl bg-foreground text-background font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Us
            </button>
          </>
        ) : isPaid ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, delay: 0.2 }}
              className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </motion.div>

            <h1 className="text-xl font-bold text-foreground mb-2" data-testid="text-checkout-success">
              Order Confirmed
            </h1>

            {session.productName && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <Package className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground" data-testid="text-product-name">{session.productName}</p>
              </div>
            )}

            {session.amountTotal && (
              <p className="text-2xl font-bold text-foreground mb-1" data-testid="text-amount">
                {formatAmount(session.amountTotal, session.currency)}
              </p>
            )}

            <p className="text-sm text-muted-foreground mb-6">
              {session.customerEmail
                ? `A confirmation has been sent to ${session.customerEmail}`
                : "Your payment was successful"}
            </p>

            <button
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-xl bg-foreground text-background font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Us
            </button>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15, delay: 0.2 }}
              className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4"
            >
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </motion.div>
            <h1 className="text-xl font-bold text-foreground mb-2" data-testid="text-checkout-pending">
              Payment Pending
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              Your payment is still being processed. You'll receive a confirmation once it completes.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-xl bg-foreground text-background font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Us
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default CheckoutSuccess;
