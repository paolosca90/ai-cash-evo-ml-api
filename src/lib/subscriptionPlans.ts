// Configurazione piani di abbonamento con i price ID reali di Stripe LIVE
export const SUBSCRIPTION_PLANS = {
  essenziale: {
    name: "Piano Essenziale",
    price_id: "price_1SCGyjERdDwJ3ajHxx5tWffL",
    product_id: "prod_T8Y4cnx4vjY5xC",
    price_monthly: 29.00,
    price_annual: 290.00,
    description: "Piano base con 1 segnale al giorno",
    features: [
      "1 segnale AI al giorno",
      "Analisi di base",
      "Dashboard di controllo",
      "Supporto email"
    ]
  },
  professional: {
    name: "Piano Professional", 
    price_id: "price_1SCGz2ERdDwJ3ajHdGrdCSle",
    product_id: "prod_T8Y5bPALYjcjd1",
    price_monthly: 97.00,
    price_annual: 970.00,
    description: "Piano avanzato con segnali illimitati e ML",
    features: [
      "Segnali illimitati",
      "ML optimized trading",
      "Expert Advisor MT5",
      "Analisi avanzate AI",
      "Supporto prioritario",
      "Trading automatico"
    ]
  }
} as const;

export type SubscriptionPlanType = keyof typeof SUBSCRIPTION_PLANS;