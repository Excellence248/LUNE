"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showSuccess, showError } from '@/utils/toast';
import { useWallet } from '@/context/WalletContext';
import { z } from 'zod';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: string;
}

const TipModal = ({ isOpen, onClose, recipient }: TipModalProps) => {
  const { balance, updateBalance } = useWallet();
  const [amount, setAmount] = useState('0.1');
  
  const handleTip = () => {
    const numericAmount = parseFloat(amount);
    
    // Define validation schema
    const tipSchema = z.number()
      .positive("Tip amount must be greater than zero")
      .max(balance, "Insufficient balance for this tip")
      .max(1000, "Maximum tip limit is 1,000 SOL");

    const result = tipSchema.safeParse(numericAmount);

    if (!result.success) {
      showError(result.error.errors[0].message);
      return;
    }

    // Simulate transaction processing
    updateBalance(-numericAmount);
    showSuccess(`Successfully tipped ${numericAmount} SOL to ${recipient}!`);
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Sanitize input: only allow numbers and a single decimal point
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#050505] border-white/10 text-white rounded-[2.5rem] max-w-sm p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-3">
            Send Tip <Zap className="text-yellow-400 fill-yellow-400" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-2">Sending to</p>
            <p className="font-bold text-purple-400">{recipient}</p>
            <p className="text-[10px] text-gray-600 mt-1">Available: {balance.toFixed(2)} SOL</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {['0.1', '0.5', '1.0'].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val)}
                className={`py-3 rounded-xl border font-bold transition-all ${
                  amount === val 
                    ? 'bg-purple-600 border-purple-500 text-white' 
                    : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/10'
                }`}
              >
                {val} SOL
              </button>
            ))}
          </div>

          <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
            <p className="text-[10px] text-gray-500 mb-2 uppercase font-bold">Custom Amount</p>
            <div className="flex justify-between items-center">
              <input 
                type="text" 
                value={amount}
                onChange={handleInputChange}
                className="bg-transparent border-none text-xl font-bold w-full focus:ring-0" 
              />
              <span className="text-sm font-bold text-gray-400">SOL</span>
            </div>
          </div>

          <Button 
            onClick={handleTip}
            className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-lg font-bold rounded-2xl shadow-lg"
          >
            Confirm Tip <ArrowRight className="ml-2" size={20} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TipModal;