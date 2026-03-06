import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle, ArrowLeft } from "lucide-react";

const CheckoutCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card rounded-2xl p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15, delay: 0.2 }}
          className="w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4"
        >
          <XCircle className="w-8 h-8 text-stone-500" />
        </motion.div>

        <h1 className="text-xl font-bold text-foreground mb-2" data-testid="text-checkout-cancelled">
          Checkout Cancelled
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          No worries — your items are still waiting for you in the shop.
        </p>

        <button
          onClick={() => navigate("/")}
          className="w-full py-3 rounded-xl bg-foreground text-background font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          data-testid="button-back-shop"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shop
        </button>
      </motion.div>
    </div>
  );
};

export default CheckoutCancel;
