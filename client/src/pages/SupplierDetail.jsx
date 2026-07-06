import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import { RiskBadge } from '../components/RiskBadge';
import RagChatDrawer from '../components/RagChatDrawer';

export default function SupplierDetail() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);

  useEffect(() => {
    api.get(`/suppliers/${id}`).then(res => setSupplier(res.data));
  }, [id]);

  if (!supplier) return <p>Loading...</p>;

  return (
    <div className="flex h-screen">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{supplier.name}</h1>
            <p className="text-slate-500">{supplier.category} | {supplier.country}</p>
          </div>
          <RiskBadge score={supplier.riskScore} />
        </div>

        {/* Document Upload Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
          <h2 className="text-xl font-bold mb-4">Document Vault</h2>
          <input type="file" onChange={async (e) => {
            const formData = new FormData();
            formData.append('file', e.target.files[0]);
            await api.post(`/documents/upload/${id}`, formData);
            alert("Document ingested and embedded!");
          }} />
        </div>

        {/* News Section */}
        <div className="grid grid-cols-1 gap-4">
            <h2 className="text-xl font-bold">Latest Intelligence</h2>
            {/* Map through supplier's news cache here */}
        </div>
      </div>
      
      {/* The RAG Feature */}
      <RagChatDrawer supplierId={id} />
    </div>
  );
}