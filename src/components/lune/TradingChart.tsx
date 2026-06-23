"use client";

import React, { useEffect, useRef } from 'react';
import * as LightweightCharts from 'lightweight-charts';

interface TradingChartProps {
  data: any[];
  symbol: string;
}

const TradingChart = ({ data, symbol }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize the chart
    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      layout: {
        background: { type: LightweightCharts.ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const seriesOptions = {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    };

    // Use the more robust addSeries method with the CandlestickSeries type
    // This is the most compatible way across different versions of the library
    const candlestickSeries = chart.addSeries(LightweightCharts.CandlestickSeries, seriesOptions);

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Initial data set
    if (data && data.length > 0) {
      try {
        const sortedData = [...data].sort((a, b) => (a.time as number) - (b.time as number));
        candlestickSeries.setData(sortedData);
      } catch (e) {
        console.error("Error setting initial chart data:", e);
      }
    }

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []); // Run once on mount

  // Update data when it changes
  useEffect(() => {
    if (seriesRef.current && data && data.length > 0) {
      try {
        const sortedData = [...data].sort((a, b) => (a.time as number) - (b.time as number));
        seriesRef.current.setData(sortedData);
      } catch (e) {
        console.error("Error updating chart data:", e);
      }
    }
  }, [data]);

  return (
    <div className="relative w-full h-[400px] bg-[#050505]">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="px-3 py-1 bg-purple-600/20 border border-purple-500/30 rounded-lg text-xs font-bold text-purple-400">
          {symbol}
        </div>
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-gray-500">
          1m
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
};

export default TradingChart;