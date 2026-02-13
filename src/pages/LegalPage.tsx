import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function LegalPage() {
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
                        INFORMATIONS JURIDIQUES
                    </span>

                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(2rem, 5vw, 4rem)',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.05,
                        color: 'var(--text-primary)',
                        marginBottom: 'var(--space-lg)',
                    }}>
                        Mentions Légales &<br />
                        <span style={{ color: 'var(--text-secondary)' }}>Politique de Confidentialité</span>
                    </h1>

                    <div className="divider" style={{ marginBottom: 'var(--space-lg)' }} />

                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                        {/* SECTION I */}
                        <section style={{ marginBottom: 'var(--space-xl)' }}>
                            <h2 style={{
                                fontSize: '1.5rem',
                                color: 'var(--text-primary)',
                                marginBottom: 'var(--space-md)',
                                fontFamily: 'var(--font-display)'
                            }}>
                                I. Mentions Légales
                            </h2>

                            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                                <div>
                                    <h3 className="mono-sm" style={{ color: 'var(--accent)', marginBottom: 'var(--space-xs)' }}>1. ÉDITEUR DU SITE</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        Le site est édité par <strong>[NOM_DE_LA_SOCIETE]</strong>, [FORME_JURIDIQUE] au capital de [CAPITAL_SOCIAL].<br />
                                        <strong>Siège social :</strong> [ADRESSE_COMPLETE]<br />
                                        <strong>SIRET :</strong> [NUMERO_SIRET]<br />
                                        <strong>RCS :</strong> [NUMERO_RCS_VILLE]<br />
                                        <strong>TVA Intracommunautaire :</strong> [NUMERO_TVA]<br />
                                        <strong>Email :</strong> [EMAIL_CONTACT]<br />
                                        <strong>Téléphone :</strong> [TELEPHONE]<br />
                                        <strong>Directeur de la publication :</strong> [NOM_PRENOM_GERANT]
                                    </p>
                                </div>

                                <div>
                                    <h3 className="mono-sm" style={{ color: 'var(--accent)', marginBottom: 'var(--space-xs)' }}>2. HÉBERGEUR</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        Le site est hébergé par <strong>[NOM_HEBERGEUR]</strong>.<br />
                                        <strong>Adresse :</strong> [ADRESSE_HEBERGEUR]<br />
                                        <strong>Site web :</strong> [URL_HEBERGEUR]
                                    </p>
                                </div>
                            </div>
                        </section>

                        <div className="divider" style={{ marginBottom: 'var(--space-lg)', opacity: 0.3 }} />

                        {/* SECTION II */}
                        <section>
                            <h2 style={{
                                fontSize: '1.5rem',
                                color: 'var(--text-primary)',
                                marginBottom: 'var(--space-md)',
                                fontFamily: 'var(--font-display)'
                            }}>
                                II. Politique de Confidentialité
                            </h2>

                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-md)' }}>
                                Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, nous nous engageons à protéger vos données personnelles.
                            </p>

                            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                                <div>
                                    <h3 className="mono-sm" style={{ color: 'var(--accent)', marginBottom: 'var(--space-xs)' }}>1. COLLECTE ET FINALITÉS</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        <strong>Données collectées :</strong> [DONNEES_COLLECTEES]<br />
                                        <strong>Finalité du traitement :</strong> [FINALITE]<br />
                                        <strong>Base légale :</strong> Consentement de l'utilisateur (via formulaire ou cookies).
                                    </p>
                                </div>

                                <div>
                                    <h3 className="mono-sm" style={{ color: 'var(--accent)', marginBottom: 'var(--space-xs)' }}>2. DURÉE DE CONSERVATION</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        Les données personnelles sont conservées pour une durée maximale de <strong>3 ans</strong> à compter du dernier contact. Elles sont ensuite supprimées ou anonymisées.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="mono-sm" style={{ color: 'var(--accent)', marginBottom: 'var(--space-xs)' }}>3. DROITS DES UTILISATEURS</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        Conformément à la législation en vigueur, vous disposez des droits suivants concernant vos données :
                                    </p>
                                    <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                                        <li><strong>Droit d'accès :</strong> connaître les données que nous détenons sur vous.</li>
                                        <li><strong>Droit de rectification :</strong> modifier des informations inexactes.</li>
                                        <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données.</li>
                                        <li><strong>Droit à la portabilité :</strong> récupérer vos données dans un format structuré.</li>
                                    </ul>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '0.5rem' }}>
                                        Pour exercer ces droits, contactez-nous à : <strong>[EMAIL_CONTACT]</strong>.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="mono-sm" style={{ color: 'var(--accent)', marginBottom: 'var(--space-xs)' }}>4. COOKIES</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                        <strong>Utilisation de cookies :</strong> [OUI/NON]<br />
                                        [SI OUI : Ce site utilise des cookies tiers tels que Google Analytics ou Google Maps pour améliorer l'expérience utilisateur et analyser le trafic.]<br />
                                        Vous pouvez gérer vos préférences via les paramètres de votre navigateur.
                                    </p>
                                </div>
                            </div>
                        </section>

                    </div>
                </motion.div>
            </div>
        </div>
    );
}
