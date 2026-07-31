import { useEffect, useState } from 'react';
import api from '../api/axios';

const sentimentClasses = {
	positive: 'bg-green-100 text-green-800',
	neutral: 'bg-slate-200 text-slate-700',
	negative: 'bg-red-100 text-red-800',
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
		return <p className="m-0 text-slate-600">Loading intelligence...</p>;
	}

	if (news.length === 0) {
		return <p className="m-0 text-slate-600">No recent intelligence is available for this supplier.</p>;
	}

	return (
		<div className="grid gap-3">
			{news.map((item) => (
				<article key={item._id || `${item.headline}-${item.publishedAt}`} className="border border-slate-400/35 rounded-2xl px-4 py-3.5 bg-white/80">
					<div className="flex flex-wrap justify-between gap-2.5 items-center mb-2.5">
						<span className={`rounded-full px-2.5 py-1 text-[0.78rem] font-bold uppercase tracking-[0.08em] ${sentimentClasses[item.sentiment] || sentimentClasses.neutral}`}>
							{item.sentiment || 'neutral'}
						</span>
						<time className="text-[0.85rem] text-slate-500">{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : 'recent'}</time>
					</div>
					<p className="m-0 text-slate-900 leading-[1.6]">{item.headline}</p>
				</article>
			))}
		</div>
	);
}
