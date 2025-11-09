"use client";
import React, { useEffect, useState } from "react";
import { FaRobot } from "react-icons/fa";

interface FlyingRobot {
  id: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  size: number;
  rotation: number;
  color: string;
}

const AnimatedBackground = () => {
  const [robots, setRobots] = useState<FlyingRobot[]>([]);

  useEffect(() => {
    // Generate random flying robots with varied patterns
    const colors = [
      '#4E82EE', // Blue
      '#D96570', // Pink/Red
      '#9b72cb', // Purple
      '#FFD93D', // Yellow
      '#6BCF7F', // Green
      '#FF6B6B', // Red
      '#4ECDC4', // Cyan
      '#45B7D1', // Light Blue
    ];

    const newRobots: FlyingRobot[] = Array.from({ length: 15 }, (_, i) => {
      // Create varied flight patterns
      const pattern = i % 3;
      let x, y, duration, delay;
      
      if (pattern === 0) {
        // Diagonal from top-left to bottom-right
        x = -10 - Math.random() * 10;
        y = -10 - Math.random() * 10;
        duration = 20 + Math.random() * 15;
        delay = Math.random() * 3;
      } else if (pattern === 1) {
        // Horizontal from left to right
        x = -10 - Math.random() * 10;
        y = 20 + Math.random() * 60;
        duration = 18 + Math.random() * 12;
        delay = Math.random() * 4;
      } else {
        // Vertical from bottom to top
        x = 20 + Math.random() * 60;
        y = 110 + Math.random() * 10;
        duration = 22 + Math.random() * 18;
        delay = Math.random() * 5;
      }
      
      return {
        id: i,
        x,
        y,
        duration,
        delay,
        size: 24 + Math.random() * 36, // Random size (24-60px)
        rotation: Math.random() * 360, // Random rotation
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });

    setRobots(newRobots);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#4E82EE]/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#D96570]/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-[#9b72cb]/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }}></div>

      {/* Flying robots */}
      {robots.map((robot) => (
        <div
          key={robot.id}
          className="absolute animate-fly-robot"
          style={{
            left: `${robot.x}%`,
            top: `${robot.y}%`,
            animationDuration: `${robot.duration}s`,
            animationDelay: `${robot.delay}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            transform: `rotate(${robot.rotation}deg)`,
            filter: `drop-shadow(0 0 12px ${robot.color}50) drop-shadow(0 0 24px ${robot.color}30)`,
            willChange: 'transform, opacity',
          }}
        >
          <div
            className="relative"
            style={{
              width: `${robot.size}px`,
              height: `${robot.size}px`,
            }}
          >
            <FaRobot
              className="w-full h-full animate-float-robot"
              style={{
                color: robot.color,
                animationDuration: `${2 + Math.random() * 2}s`,
                animationDelay: `${robot.delay}s`,
                filter: `drop-shadow(0 0 4px ${robot.color}80)`,
              }}
            />
            {/* Glow effect */}
            <div
              className="absolute inset-0 rounded-full blur-lg opacity-40 animate-pulse-glow"
              style={{
                backgroundColor: robot.color,
                animationDuration: `${1.5 + Math.random() * 1}s`,
                animationDelay: `${robot.delay}s`,
              }}
            ></div>
            {/* Trail effect */}
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-20"
              style={{
                backgroundColor: robot.color,
                transform: 'scale(1.5)',
              }}
            ></div>
          </div>
        </div>
      ))}

      {/* Floating particles */}
      {Array.from({ length: 30 }).map((_, i) => {
        const colors = ['#4E82EE', '#D96570', '#9b72cb', '#FFD93D', '#6BCF7F', '#4ECDC4'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 1 + Math.random() * 2;
        
        return (
          <div
            key={`particle-${i}`}
            className="absolute rounded-full opacity-30 animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              boxShadow: `0 0 ${size * 2}px ${color}60`,
              animationDuration: `${8 + Math.random() * 12}s`,
              animationDelay: `${Math.random() * 5}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          ></div>
        );
      })}

      {/* Grid pattern overlay with animation */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(78, 130, 238, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(78, 130, 238, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          backgroundPosition: '0 0',
          animation: 'gridMove 20s linear infinite',
        }}
      ></div>
      
      {/* Animated connecting lines */}
      <svg className="absolute inset-0 opacity-10 pointer-events-none" style={{ zIndex: 0, width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4E82EE" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#D96570" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#9b72cb" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`line-${i}`}
            x1={`${10 + i * 12}%`}
            y1="0%"
            x2={`${15 + i * 10}%`}
            y2="100%"
            stroke="url(#lineGradient)"
            strokeWidth="1"
            strokeDasharray="5,5"
            className="animate-pulse-slow"
            style={{
              animationDuration: `${3 + i * 0.5}s`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
};

export default AnimatedBackground;

