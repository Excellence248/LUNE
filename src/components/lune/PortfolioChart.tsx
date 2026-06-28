"use client";

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useWallet } from '@/context/WalletContext';

const PortfolioChart = () => {
  const { balance } = useWallet();

  // In a real app, we'd fetch all token balances. 
  // For now, we use the main SOL balance.
  const data = balance > 0 ? [
    { name: 'SOL', value: balance, color: '#3b82f6' },
  ] : [
    { name: 'Empty', value: 1, color: 'rgba(255,255,255,0.05)' }
  ];

  return (
    <div className="h-64 w-full relative">
      {balance === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">No Assets</p>
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {balance > 0 && (
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#050505', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                fontSize: '12px'
              }}
              itemStyle={{ color: '#fff' }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PortfolioChart;