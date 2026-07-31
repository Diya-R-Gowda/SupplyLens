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
		<main className="min-h-screen m-0 grid place-items-center bg-[radial-gradient(circle_at_top,_#f3f7ff_0%,_#dfe9ff_45%,_#c8d7ff_100%)] font-sans">
			<section className="w-[min(720px,calc(100vw-48px))] p-8 rounded-[28px] bg-white/78 shadow-[0_24px_80px_rgba(31,59,128,0.18)] backdrop-blur-[18px] border border-white/65">
				{authed ? (
					<Dashboard user={user} onLogout={handleLogout} />
				) : (
					<Login onSuccess={handleLoginSuccess} />
				)}
			</section>
		</main>
	);
}
