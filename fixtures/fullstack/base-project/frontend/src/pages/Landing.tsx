import Header from '../components/Header';

const styles = {
  hero: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center' as const,
  },
  heroTitle: {
    fontSize: '3rem',
    fontWeight: 700,
    marginBottom: '16px',
    color: 'var(--text-color)',
  },
  heroSubtitle: {
    fontSize: '1.25rem',
    color: '#6b7280',
    maxWidth: '600px',
    lineHeight: 1.8,
  },
  features: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
    padding: '60px 20px',
    flexWrap: 'wrap' as const,
  },
  card: {
    background: '#ffffff',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '32px',
    width: '280px',
    textAlign: 'center' as const,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  cardIcon: {
    fontSize: '2.5rem',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginBottom: '8px',
    color: 'var(--text-color)',
  },
  cardDescription: {
    fontSize: '0.95rem',
    color: '#6b7280',
    lineHeight: 1.6,
  },
  footer: {
    textAlign: 'center' as const,
    padding: '24px 20px',
    borderTop: '1px solid var(--border-color)',
    color: '#9ca3af',
    fontSize: '0.875rem',
  },
};

function Landing() {
  return (
    <div>
      <Header />

      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>Welcome to Our Platform</h1>
        <p style={styles.heroSubtitle}>
          A modern fullstack application built with NestJS and React
        </p>
      </section>

      <section style={styles.features}>
        <div style={styles.card}>
          <div style={styles.cardIcon}>&#9889;</div>
          <h3 style={styles.cardTitle}>Fast</h3>
          <p style={styles.cardDescription}>
            Built with Vite and optimized for performance. Lightning-fast
            development and production builds.
          </p>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIcon}>&#128274;</div>
          <h3 style={styles.cardTitle}>Secure</h3>
          <p style={styles.cardDescription}>
            Enterprise-grade security with JWT authentication and role-based
            access control out of the box.
          </p>
        </div>
        <div style={styles.card}>
          <div style={styles.cardIcon}>&#128640;</div>
          <h3 style={styles.cardTitle}>Scalable</h3>
          <p style={styles.cardDescription}>
            Modular architecture designed to scale. Add features without
            compromising the existing codebase.
          </p>
        </div>
      </section>

      <footer style={styles.footer}>
        <p>&copy; {new Date().getFullYear()} FullstackApp. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default Landing;
