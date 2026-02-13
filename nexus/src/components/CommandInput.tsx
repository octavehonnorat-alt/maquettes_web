import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import TextareaAutosize from 'react-textarea-autosize';

// ═══════════════════════════════════════════════════════════════════════
//  Command Input — Auto-resizing "terminal" style input
//  Grows up to 6 lines, monospace font, with accent glow on focus.
// ═══════════════════════════════════════════════════════════════════════

interface CommandInputProps {
    placeholder?: string;
    onSubmit?: (value: string) => void;
}

export function CommandInput({
    placeholder = 'Entrez une commande ou posez une question...',
    onSubmit,
}: CommandInputProps) {
    const [value, setValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim() && onSubmit) {
            onSubmit(value.trim());
            setValue('');
        }
    }, [value, onSubmit]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            formRef.current?.requestSubmit();
        }
    }, []);

    return (
        <motion.form
            ref={formRef}
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
            style={{
                position: 'relative',
                width: '100%',
                maxWidth: '700px',
            }}
        >
            {/* Glow border on focus */}
            <div style={{
                position: 'absolute',
                inset: -1,
                borderRadius: '12px',
                background: isFocused
                    ? 'linear-gradient(135deg, rgba(255,51,0,0.4), rgba(255,120,0,0.2), rgba(255,51,0,0.1))'
                    : 'transparent',
                opacity: isFocused ? 1 : 0,
                transition: 'opacity 0.4s ease, background 0.4s ease',
                pointerEvents: 'none',
                filter: 'blur(1px)',
            }} />

            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '0.75rem',
                background: isFocused
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isFocused ? 'rgba(255,51,0,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '12px',
                padding: '0.875rem 1rem',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
            }}>
                {/* Terminal prompt icon */}
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    color: isFocused ? 'var(--accent)' : 'var(--text-secondary)',
                    transition: 'color 0.3s ease',
                    flexShrink: 0,
                    lineHeight: '1.6',
                    paddingBottom: '1px',
                }}>
                    ›
                </span>

                <TextareaAutosize
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    minRows={1}
                    maxRows={6}
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.85rem',
                        lineHeight: '1.6',
                        letterSpacing: '0.01em',
                        resize: 'none',
                        caretColor: 'var(--accent)',
                    }}
                />

                {/* Submit button */}
                <motion.button
                    type="submit"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                        flexShrink: 0,
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: 'none',
                        background: value.trim()
                            ? 'var(--accent)'
                            : 'rgba(255,255,255,0.05)',
                        color: value.trim()
                            ? '#fff'
                            : 'var(--text-secondary)',
                        cursor: value.trim() ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        fontSize: '0.9rem',
                    }}
                    disabled={!value.trim()}
                >
                    ↑
                </motion.button>
            </div>

            {/* Hint */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '0.5rem',
                paddingInline: '0.25rem',
            }}>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6rem',
                    color: 'var(--text-tertiary)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                }}>
                    ENTER pour envoyer • SHIFT+ENTER pour retour à la ligne
                </span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6rem',
                    color: 'var(--text-tertiary)',
                    letterSpacing: '0.08em',
                }}>
                    AEX-1.TERMINAL
                </span>
            </div>
        </motion.form>
    );
}

export default CommandInput;
