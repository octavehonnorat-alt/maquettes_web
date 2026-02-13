import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';

interface MagneticButtonProps {
    children: React.ReactNode;
    to?: string;
    href?: string;
    variant?: 'primary' | 'secondary';
    className?: string;
    onClick?: () => void;
}

const MotionLink = motion(Link);

export function MagneticButton({
    children,
    to,
    href,
    variant = 'primary',
    className = '',
    onClick
}: MagneticButtonProps) {
    const ref = useRef<HTMLAnchorElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;

        x.set(distanceX * 0.5);
        y.set(distanceY * 0.5);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const baseClass = variant === 'primary' ? 'btn btn--accent magnetic' : 'btn magnetic';

    // Props for animation and event handling
    const animationProps = {
        className: `${baseClass} ${className}`,
        onMouseMove: handleMouseMove,
        onMouseLeave: handleMouseLeave,
        style: { x: springX, y: springY },
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.95 }
    };

    // Click handler wrapper
    const handleClick = (e: React.MouseEvent) => {
        if (onClick) {
            // Only prevent default if it's not a link or if explicitly requested (though usually Link handles prevention)
            // Actually, for Link, we shouldn't prevent default unless we want to stop navigation.
            // If it's a button/anchor with onClick, we might want to.
            // Here, just calling onClick is safer.
            onClick();
        }
    };

    if (to) {
        return (
            <MotionLink
                to={to}
                onClick={handleClick}
                {...animationProps}
            >
                {children}
            </MotionLink>
        );
    }

    return (
        <motion.a
            ref={ref}
            href={href || '#'}
            onClick={(e) => {
                if (!href) e.preventDefault();
                handleClick(e);
            }}
            {...animationProps}
        >
            {children}
        </motion.a>
    );
}
