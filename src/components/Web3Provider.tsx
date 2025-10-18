import { ReactNode } from 'react';

interface Web3ProviderProps {
  children: ReactNode;
}

// Simplified Web3Provider - Web3 functionality has been removed
// This component now just passes through children to avoid breaking existing code
export const Web3Provider = ({ children }: Web3ProviderProps) => {
  return <>{children}</>;
};