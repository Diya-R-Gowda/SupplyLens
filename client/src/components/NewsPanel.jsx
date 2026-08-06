import { useEffect, useState } from 'react';
import api from '../api/axios';
import Badge from './Badge';
import ConfidenceBadge from './ConfidenceBadge';

const sentimentClasses = {
	positive: 'bg-green-100 text-green-800',
	neutral: 'bg-slate-200 text-slate-700',
	negative: 'bg-red-100 text-red-800',
	pending: 'bg-slate-100 text-slate-500',
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
						<Badge
							className={`px-2.5 py-1 text-[0.78rem] uppercase tracking-[0.08em] ${sentimentClasses[item.sentiment] || sentimentClasses.pending}`}
							title={typeof item.sentimentScore === 'number' ? `Sentiment score: ${item.sentimentScore.toFixed(2)}` : undefined}
						>
							{item.sentiment || 'pending'}
						</Badge>
						<ConfidenceBadge confidence={item.sentimentConfidence} />
						<time className="text-[0.85rem] text-slate-500">{item.publishedAt ? new Date(item.publishedAt).toLocaleString() : 'recent'}</time>
					</div>
					<p className="m-0 text-slate-900 leading-[1.6]">
						{item.url ? (
							<a href={item.url} target="_blank" rel="noreferrer" className="text-inherit no-underline hover:underline">
								{item.headline}
							</a>
						) : item.headline}
					</p>
					{item.source ? <p className="mt-1 mb-0 text-[0.8rem] text-slate-500">{item.source}</p> : null}
				</article>
			))}
		</div>
	);
}
