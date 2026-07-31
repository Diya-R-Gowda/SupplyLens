import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import api, { getAccessToken, getRefreshToken, getUser, setTokens, clearTokens, setOnAuthFailure } from './api/axios';

export default function App() {
	const [authed, setAuthed] = useState(() => !!getAccessToken());
	const [user, setUser] = useState(() => getUser());

	useEffect(() => {
		setOnAuthFailure(() => {
			setAuthed(false);
			setUser(null);
		});
	}, []);

	const handleLoginSuccess = (tokens) => {
		setTokens(tokens);
		setUser(tokens.user);
		setAuthed(true);
	};

	const handleLogout = async () => {
		const refreshToken = getRefreshToken();
		try {
			if (refreshToken) {
				await api.post('/auth/logout', { refreshToken });
			}
		} catch {
			// best-effort revoke; still clear local state either way
		} finally {
			clearTokens();
			setAuthed(false);
			setUser(null);
		}
	};

	return (
		<main style={styles.page}>
			<section style={styles.card}>
				{authed ? (
					<Dashboard user={user} onLogout={handleLogout} />
				) : (
					<Login onSuccess={handleLoginSuccess} />
				)}
			</section>
		</main>
	);
}

const styles = {
	page: {
		minHeight: '100vh',
		margin: 0,
		display: 'grid',
		placeItems: 'center',
		background: 'radial-gradient(circle at top, #f3f7ff 0%, #dfe9ff 45%, #c8d7ff 100%)',
		fontFamily: 'Inter, system-ui, sans-serif',
	},
	card: {
		width: 'min(720px, calc(100vw - 48px))',
		padding: '32px',
		borderRadius: '28px',
		background: 'rgba(255, 255, 255, 0.78)',
		boxShadow: '0 24px 80px rgba(31, 59, 128, 0.18)',
		backdropFilter: 'blur(18px)',
		border: '1px solid rgba(255, 255, 255, 0.65)',
	},
};