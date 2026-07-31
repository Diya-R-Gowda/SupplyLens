import { useEffect, useState } from 'react';
import api from '../api/axios';

const sentimentStyles = {
	positive: { background: '#dcfce7', color: '#166534' },
	neutral: { background: '#e2e8f0', color: '#334155' },
	negative: { background: '#fee2e2', color: '#991b1b' },
};

export default function NewsPanel({ supplierId }) {
	const [news, setNews] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;

		const loadNews = async () => {
			try {
				const response = await api.get(`/news/${supplierId}`);
				if (active) {
					setNews(response.data.data || []);
				}
			} catch {
				if (active) {
					setNews([]);
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		};

		loadNews();

		return () => {
			active = false;
		};
	}, [supplierId]);

	if (loading) {
		return <p style={styles.status}>Loading intelligence...</p>;
	}

	if (news.length === 0) {
		return <p style={styles.status}>No recent intelligence is available for this supplier.</p>;
	}

	return (
		<div style={styles.list}>
			{news.map((item) => (
				<article key={item._id || `${item.headline}-${item.publishedAt}`} style={styles.card}>
					<div style={styles.row}>
						<span style={{ ...styles.sentiment, ...(sentimentStyles[item.sentiment] || sentimentStyles.neutral) }}>
							{item.sentiment || 'neutral'}
						</span>
						<time style={styles.time}>{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : 'recent'}</time>
					</div>
					<p style={styles.headline}>{item.headline}</p>
				</article>
			))}
		</div>
	);
}

const styles = {
	status: {
		margin: 0,
		color: '#475569',
	},
	list: {
		display: 'grid',
		gap: '12px',
	},
	card: {
		border: '1px solid rgba(148,163,184,0.35)',
		borderRadius: '16px',
		padding: '14px 16px',
		background: 'rgba(255,255,255,0.8)',
	},
	row: {
		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		gap: '10px',
		alignItems: 'center',
		marginBottom: '10px',
	},
	sentiment: {
		borderRadius: '999px',
		padding: '4px 10px',
		fontSize: '0.78rem',
		fontWeight: 700,
		textTransform: 'uppercase',
		letterSpacing: '0.08em',
	},
	time: {
		fontSize: '0.85rem',
		color: '#64748b',
	},
	headline: {
		margin: 0,
		color: '#0f172a',
		lineHeight: 1.6,
	},
};
