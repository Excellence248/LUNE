"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { time: '00:00', value: 2.42 },
  { time: '04:00', value: 2.45 },
  { time: '08:00', value: 2.41 },
  { time: '12:00', value: 2.48 },
  { time: '16:00', value: 2.52 },
  { time: '20:00', value: 2.54 },
  { time: '23:59', value: 2.53 },
];

const MarketCapChart = () => {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorCap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="time" 
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
            tickFormatter={(val) => `$${val}T`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
            itemStyle={{ color: '#a855f7', fontWeight: 'bold' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#a855f7" 
            fillOpacity={1} 
            fill="url(#colorCap)" 
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MarketCapChart;