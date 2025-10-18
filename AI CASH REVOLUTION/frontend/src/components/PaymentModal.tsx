import { Button } from '@/components/ui/button';
import {
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface PaymentModalProps {
  plan: {
    name: string;
    price: string;
    period: string;
    features: string[];
    popular: boolean;
    trialText: string;
  };
  isAnnual: boolean;
  trigger?: React.ReactNode;
}

export const PaymentModal = ({ plan, isAnnual, trigger }: PaymentModalProps) => {
  // Web3 payment functionality has been removed
  // Now redirects to standard payment setup page

  const defaultTrigger = (
    <Button
      className={`w-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
      variant={plan.popular ? 'default' : 'outline'}
    >
      {plan.name === 'Enterprise' ? 'Contattaci' : 'Scegli Piano'}
      <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  );

  if (plan.name === 'Enterprise') {
    return (
      <Link to="/login">
        {trigger || defaultTrigger}
      </Link>
    );
  }

  return (
    <Link to="/payment-setup">
      {trigger || defaultTrigger}
    </Link>
  );
};