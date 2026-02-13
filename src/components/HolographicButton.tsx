import React from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';

interface HolographicButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

export const HolographicButton: React.FC<HolographicButtonProps> = ({ children, onClick, className, style }) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    };

    return (
        <motion.button
            className={`relative group px-6 py-3 rounded-lg overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 ${className}`}
            style={style}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
        >
            {/* Animated Gradient Border / Glow */}
            <motion.div
                className="absolute -inset-px rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                    background: useMotionTemplate`
                        radial-gradient(
                            250px circle at ${mouseX}px ${mouseY}px,
                            var(--accent-glow, rgba(255, 100, 50, 0.4)),
                            transparent 80%
                        )
                    `
                }}
            />

            {/* Inner Content */}
            <span className="relative z-10 flex items-center justify-center gap-2 text-sm font-medium tracking-wider text-white">
                {children}
            </span>

            {/* Subtle shiny reflection */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full group-hover:animate-shine transition-all duration-700" />

            <style>{`
                @keyframes shine {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .group-hover\\:animate-shine:hover {
                    animation: shine 1s ease-in-out forwards;
                }
             `}</style>
        </motion.button>
    );
};
