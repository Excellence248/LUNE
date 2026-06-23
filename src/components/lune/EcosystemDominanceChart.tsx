"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { name: 'SOL', value: 85, color: '#3b82f6' },
  { name: 'JUP', value: 65, color: '#a855f7' },
  { name: 'RAY', value: 45, color: '#22c55e' },
  { name: 'PYTH', value: 35, color: '#eab308' },
  { name: 'LUNE', value: 55, color: '#f97316' },
  { name: 'DRIFT', value: 25, color: '#ec4899' },
];

const EcosystemDominanceChart = () => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#6b7280" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#6b7280" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EcosystemDominanceChart;