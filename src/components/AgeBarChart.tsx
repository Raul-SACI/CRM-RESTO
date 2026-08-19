import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Gráfico de distribución por edades (solo lo usa el panel del admin).
// Va en su propio archivo para cargar recharts SOLO cuando se necesita
// (lazy), y que el cliente no lo descargue en el arranque.
export default function AgeBarChart({ data }: { data: { range: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 700 }}
        />
        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
          {data.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#D90015' : '#0f172a'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
