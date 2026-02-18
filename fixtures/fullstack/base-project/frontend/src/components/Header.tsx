import { Link } from 'react-router-dom';

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    backgroundColor: 'var(--header-bg)',
    borderBottom: '1px solid var(--border-color)',
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--primary-color)',
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center',
  },
  link: {
    color: 'var(--text-color)',
    textDecoration: 'none',
    fontSize: '0.95rem',
    fontWeight: 500,
    transition: 'color 0.2s',
  },
};

function Header() {
  return (
    <header style={styles.header}>
      <Link to="/" style={styles.logo}>
        FullstackApp
      </Link>
      <nav style={styles.nav}>
        <Link to="/" style={styles.link}>
          Home
        </Link>
        <Link to="/login" style={styles.link}>
          Login
        </Link>
      </nav>
    </header>
  );
}

export default Header;
