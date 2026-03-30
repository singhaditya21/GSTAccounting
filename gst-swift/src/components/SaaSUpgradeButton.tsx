"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";
import Script from "next/script";

export function SaaSUpgradeButton() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/razorpay/saas-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });

      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: orderData.amount,
        currency: orderData.currency,
        name: "GSTSwift Enterprise SaaS",
        description: "PRO Tier Upgrade - 1000 Premium AI Tokens Refill",
        order_id: orderData.id,
        handler: function (response: any) {
          // Real execution happens on Webhook backend, but we reload cleanly
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        },
        theme: { color: "#4f46e5" }, 
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      alert(`SaaS Handshake Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Button 
        onClick={handleUpgrade} 
        disabled={loading} 
        variant="outline" 
        size="sm" 
        className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
        Upgrade to Pro
      </Button>
    </>
  );
}
