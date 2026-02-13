import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function SystemePage() {
    return (
        <div className="page-container" style={{ minHeight: '100vh', padding: 'var(--space-xl) 0' }}>
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                    <Link to="/" className="mono-sm" style={{
                        color: 'var(--text-secondary)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: 'var(--space-lg)',
                    }}>
                        ← Retour
                    </Link>

                    <span className="mono-sm" style={{ display: 'block', marginBottom: 'var(--space-sm)', color: 'var(--text-secondary)' }}>
                        01 / SYSTÈME
                    </span>

                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.05,
                        color: 'var(--text-primary)',
                        marginBottom: 'var(--space-lg)',
                    }}>
                        Neural Core<br />
                        <span style={{ color: 'var(--text-secondary)' }}>Architecture</span>
                    </h1>

                    <div className="divider" style={{ marginBottom: 'var(--space-lg)' }} />

                    <div style={{ maxWidth: '700px' }}>
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '1.1rem',
                            lineHeight: 1.7,
                            marginBottom: 'var(--space-md)',
                        }}>
                            Le moteur computationnel AEX-1 repose sur une architecture neuronale
                            déterministe, conçue pour les environnements critiques nécessitant
                            une précision mathématique absolue.
                        </p>
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '1.1rem',
                            lineHeight: 1.7,
                        }}>
                            Chaque décision est calculée, jamais prédite. Le système opère
                            en isolation complète, sans dépendance réseau, garantissant un
                            temps de réponse constant et reproductible.
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 'var(--space-md)',
                        marginTop: 'var(--space-xl)',
                    }}>
                        {[
                            { label: 'Latence', value: '< 1ms' },
                            { label: 'Précision', value: '99.97%' },
                            { label: 'Uptime', value: '99.999%' },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                                className="bento-cell"
                                style={{ padding: 'var(--space-md)' }}
                            >
                                <span className="mono-sm">{stat.label}</span>
                                <span className="data-value" style={{ marginTop: 'var(--space-xs)' }}>{stat.value}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
