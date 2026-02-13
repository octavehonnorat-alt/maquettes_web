import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function ArchitecturePage() {
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
                        02 / ARCHITECTURE
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
                        Infrastructure<br />
                        <span style={{ color: 'var(--text-secondary)' }}>Modulaire</span>
                    </h1>

                    <div className="divider" style={{ marginBottom: 'var(--space-lg)' }} />

                    <div style={{ maxWidth: '700px' }}>
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '1.1rem',
                            lineHeight: 1.7,
                            marginBottom: 'var(--space-md)',
                        }}>
                            L'architecture AEX-1 est construite sur un modèle modulaire
                            à trois couches : acquisition des données, traitement neuronal,
                            et synthèse décisionnelle.
                        </p>
                        <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '1.1rem',
                            lineHeight: 1.7,
                        }}>
                            Chaque module est indépendant, testable en isolation, et peut
                            être remplacé sans affecter les autres composants du système.
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 'var(--space-md)',
                        marginTop: 'var(--space-xl)',
                    }}>
                        {[
                            { title: 'Couche Acquisition', desc: 'Ingestion temps réel multi-source avec validation cryptographique' },
                            { title: 'Couche Traitement', desc: 'Réseau neuronal déterministe à 12 niveaux de profondeur' },
                            { title: 'Couche Décision', desc: 'Synthèse probabiliste avec arbres de décision vérifiables' },
                            { title: 'Couche Audit', desc: 'Traçabilité complète de chaque calcul et décision' },
                        ].map((item, i) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                                className="bento-cell"
                                style={{ padding: 'var(--space-md)' }}
                            >
                                <span className="mono-sm" style={{ color: 'var(--accent)', marginBottom: 'var(--space-xs)', display: 'block' }}>
                                    0{i + 1}
                                </span>
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
