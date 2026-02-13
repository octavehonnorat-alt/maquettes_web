import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function DeploiementPage() {
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
                        03 / DÉPLOIEMENT
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
                        Déploiement<br />
                        <span style={{ color: 'var(--text-secondary)' }}>Opérationnel</span>
                    </h1>

                    <div className="divider" style={{ marginBottom: 'var(--space-lg)' }} />

                    <div style={{ maxWidth: '700px' }}>
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '1.1rem',
                            lineHeight: 1.7,
                            marginBottom: 'var(--space-md)',
                        }}>
                            AEX-1 se déploie en environnement air-gapped, sans connexion
                            extérieure. Le système est livré pré-configuré et validé pour
                            votre infrastructure spécifique.
                        </p>
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '1.1rem',
                            lineHeight: 1.7,
                        }}>
                            Temps de déploiement standard : 48 heures. Support technique
                            24/7 avec SLA garanti.
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 'var(--space-md)',
                        marginTop: 'var(--space-xl)',
                    }}>
                        {[
                            { phase: 'Phase 1', title: 'Audit', duration: '8h', desc: 'Analyse de l\'infrastructure cible' },
                            { phase: 'Phase 2', title: 'Configuration', duration: '16h', desc: 'Paramétrage et calibration du système' },
                            { phase: 'Phase 3', title: 'Intégration', duration: '16h', desc: 'Connexion aux systèmes existants' },
                            { phase: 'Phase 4', title: 'Validation', duration: '8h', desc: 'Tests de conformité et certification' },
                        ].map((item, i) => (
                            <motion.div
                                key={item.phase}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                                className="bento-cell"
                                style={{ padding: 'var(--space-md)' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                                    <span className="mono-sm" style={{ color: 'var(--accent)' }}>{item.phase}</span>
                                    <span className="mono-sm">{item.duration}</span>
                                </div>
                                <h3 style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: '1.2rem',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    marginBottom: 'var(--space-xs)',
                                }}>
                                    {item.title}
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                    {item.desc}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
