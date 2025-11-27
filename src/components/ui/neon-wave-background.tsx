"use client";
import React, { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export const NeonWaveBackground = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { theme } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;

        const resize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        window.addEventListener("resize", resize);
        resize();

        // Wave parameters
        const waves = [
            { color: "rgba(59, 130, 246, 0.5)", speed: 0.002, amplitude: 50, frequency: 0.005, yOffset: 0 }, // Blue
            { color: "rgba(139, 92, 246, 0.5)", speed: 0.003, amplitude: 70, frequency: 0.004, yOffset: 20 }, // Violet
            { color: "rgba(236, 72, 153, 0.5)", speed: 0.001, amplitude: 40, frequency: 0.006, yOffset: -20 }, // Pink
            { color: "rgba(6, 182, 212, 0.3)", speed: 0.004, amplitude: 30, frequency: 0.008, yOffset: 40 }, // Cyan
        ];

        let time = 0;

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            // Dark background clearing for trail effect if desired, but we want clean waves
            // ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
            // ctx.fillRect(0, 0, width, height);

            waves.forEach((wave) => {
                ctx.beginPath();
                ctx.strokeStyle = wave.color;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 20;
                ctx.shadowColor = wave.color;

                for (let x = 0; x < width; x++) {
                    const y =
                        height / 2 +
                        wave.yOffset +
                        Math.sin(x * wave.frequency + time * wave.speed * 1000) * wave.amplitude +
                        Math.sin(x * wave.frequency * 0.5 + time * wave.speed * 500) * (wave.amplitude * 0.5); // Add complexity

                    if (x === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
            });

            time += 0.005;
            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener("resize", resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className={`relative w-full overflow-hidden ${className}`}>
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none z-0"
                style={{ opacity: 0.6 }}
            />
            <div className="relative z-10">{children}</div>
        </div>
    );
};
