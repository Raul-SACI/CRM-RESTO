import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Profile, Prize, Transaction } from '@/src/types';
import { motion } from 'motion/react';
import { Users, Gift, Settings, Search, Plus, Trash2, Calendar, Award, History, DollarSign, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function Admin() {
  const [activeTab, setActiveTab] = useState<'clients' | 'prizes' | 'staff' | 'history'>('clients');
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Profile[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [newPrize, setNewPrize] = useState({ title: '', description: '', points_cost: 0, image_url: '' });
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("La imagen es muy pesada (máx 2MB)");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewPrize({ ...newPrize, image_url: reader.result as string });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async (forceRefresh = false) => {
    // 1. Cargar desde caché primero para respuesta instantánea
    const cacheKey = `admin_cache_${activeTab}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached && !forceRefresh) {
      try {
        const parsed = JSON.parse(cached);
        if (activeTab === 'clients') setClients(parsed);
        else if (activeTab === 'prizes') setPrizes(parsed);
        else if (activeTab === 'staff') setStaff(parsed);
        else if (activeTab === 'history') setAllTransactions(parsed);
        setLoading(false);
      } catch (e) {
        console.error("Cache parse error:", e);
      }
    } else {
      setLoading(true);
    }
    
    // Timeout de seguridad
    const fetchTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    try {
      let result: any = null;
      if (activeTab === 'clients') {
        result = await supabase.from('profiles').select('*').eq('role', 'client').order('points', { ascending: false });
      } else if (activeTab === 'prizes') {
        result = await supabase.from('catalogo_premios').select('*').order('points_cost', { ascending: true });
      } else if (activeTab === 'staff') {
        result = await supabase.from('profiles').select('*').in('role', ['waiter', 'admin']).order('role', { ascending: false });
      } else if (activeTab === 'history') {
        result = await supabase.from('transactions').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(50);
      }

      if (result?.error) throw result.error;
      if (result?.data) {
        if (activeTab === 'clients') setClients(result.data);
        else if (activeTab === 'prizes') setPrizes(result.data);
        else if (activeTab === 'staff') setStaff(result.data);
        else if (activeTab === 'history') setAllTransactions(result.data);
        
        // Guardar en caché
        localStorage.setItem(cacheKey, JSON.stringify(result.data));
      }
    } catch (e: any) {
      console.error("Fetch error in Admin:", e);
    } finally {
      clearTimeout(fetchTimeout);
      setLoading(false);
    }
  };

  const handleCreatePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrize.image_url) {
      alert("Por favor sube una imagen");
      return;
    }
    
    setLoading(true);
    try {
      const { error, data } = await supabase.from('catalogo_premios').insert([newPrize]).select();
      if (error) {
        console.error("Error Detail:", error);
        alert(`Error Supabase: ${error.message} (Código: ${error.code})`);
      } else {
        setNewPrize({ title: '', description: '', points_cost: 0, image_url: '' });
        await fetchData();
        alert('¡Premio publicado!');
      }
    } catch (err: any) {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrize = async (id: string) => {
    if (!confirm('¿Eliminar este premio definitivamente?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('catalogo_premios').delete().eq('id', id);
      if (error) {
        alert(`Error al eliminar: ${error.message}`);
      } else {
        await fetchData();
        alert('Premio eliminado');
      }
    } catch (err: any) {
      alert("Error de conexión al eliminar");
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const roleNames: Record<string, string> = {
      'admin': 'Administrador',
      'waiter': 'Staff/Mozo',
      'client': 'Cliente'
    };
    
    if (confirm(`¿Cambiar el rol de este usuario a ${roleNames[newRole]}?`)) {
      setLoading(true);
      try {
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) throw error;
        alert('¡Rol actualizado con éxito! Recargando datos...');
        await fetchData();
      } catch (err: any) {
        alert('Error al actualizar rol: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-ash p-6 rounded-3xl border border-white/5 shadow-bento">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight italic">Gestión <span className="text-love">Resto</span></h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Panel Central Administrativo</p>
        </div>
        
        <div className="flex flex-wrap p-1 bg-black/40 rounded-xl border border-white/5 overflow-x-auto">
          {['clients', 'prizes', 'staff', 'history'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap", 
                activeTab === tab ? "bg-love text-white" : "text-white/40 hover:text-white"
              )}
            >
              {tab === 'clients' ? 'Clientes' : tab === 'prizes' ? 'Premios' : tab === 'staff' ? 'Staff' : 'Movimientos'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-ivory/20 uppercase font-black tracking-widest">Cargando datos...</div>
      ) : (
        <>
          {activeTab === 'clients' && (
            <div className="bg-ash rounded-3xl border border-white/5 overflow-hidden shadow-bento">
              <div className="p-6 border-b border-white/5 bg-white/5">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Users size={16} className="text-love" />
                  Base de Clientes ({clients.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-widest text-slate-500 border-b border-white/5">
                      <th className="px-6 py-4">Nombre</th>
                      <th className="px-6 py-4">DNI</th>
                      <th className="px-6 py-4">Cumpleaños</th>
                      <th className="px-6 py-4 text-right">Puntos</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    {clients.map(client => (
                      <tr key={client.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold">{client.full_name}</p>
                          <p className="text-[10px] text-slate-500 italic font-mono">{client.email}</p>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{client.dni}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs">
                            <Calendar size={12} className="text-love" />
                            {client.birth_date}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-love font-black italic text-lg">{client.points}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => updateUserRole(client.id, 'waiter')}
                            className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded bg-white/5 hover:bg-love transition-all"
                          >
                            Hacer Staff
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'prizes' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 bg-ash rounded-3xl p-6 border border-white/5 shadow-bento h-fit">
                <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Plus size={16} className="text-love" />
                  Nuevo Premio
                </h3>
                <form onSubmit={handleCreatePrize} className="space-y-4">
                  <input placeholder="Título del premio" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-love" value={newPrize.title} onChange={e => setNewPrize({...newPrize, title: e.target.value})} required />
                  <textarea placeholder="Descripción del beneficio" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-love h-24" value={newPrize.description} onChange={e => setNewPrize({...newPrize, description: e.target.value})} required />
                  <input type="number" placeholder="Costo en puntos" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-love" value={newPrize.points_cost || ''} onChange={e => setNewPrize({...newPrize, points_cost: parseInt(e.target.value)})} required />
                  
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 pl-1">Imagen del premio</label>
                    <div className="relative group">
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                        id="prize-image" 
                      />
                      <label 
                        htmlFor="prize-image"
                        className={cn(
                          "w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative bg-black/20",
                          newPrize.image_url ? "border-love/30" : "border-white/10 hover:border-love/50"
                        )}
                      >
                        {newPrize.image_url ? (
                          <>
                            <img src={newPrize.image_url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                              <Upload size={20} className="mb-1" />
                              <span className="text-[8px] font-black uppercase tracking-widest">Cambiar Imagen</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={cn("flex flex-col items-center transition-all", uploading ? "animate-pulse" : "")}>
                              <ImageIcon size={24} className="text-slate-600 mb-2" />
                              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                                {uploading ? 'Procesando...' : 'Subir Imagen (Máx 2MB)'}
                              </span>
                            </div>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  <button type="submit" disabled={uploading || !newPrize.image_url} className="w-full bg-love text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-love/20 active:scale-[0.98] transition-all disabled:opacity-20">
                    Publicar Premio
                  </button>
                </form>
              </div>
              <div className="md:col-span-2 space-y-4">
                {prizes.length === 0 && (
                  <div className="bg-ash p-12 rounded-3xl border border-dashed border-white/10 text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">No hay premios cargados</p>
                    <p className="text-[10px] text-slate-600 max-w-xs mx-auto">Si no puedes agregar, asegúrate de haber ejecutado el SQL de permisos en la consola de Supabase.</p>
                  </div>
                )}
                {prizes.map(prize => (
                  <div key={prize.id} className="bg-ash p-4 rounded-2xl border border-white/5 flex items-center gap-4 group transition-all">
                    <img src={prize.image_url} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm uppercase tracking-tight">{prize.title}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{prize.points_cost} Puntos</p>
                    </div>
                    <button onClick={() => handleDeletePrize(prize.id)} className="p-3 text-slate-600 hover:text-love transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                
                <div className="pt-8 mt-4 border-t border-white/5 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">
                    CRM RESTO v1.0.6-FIX-DATABASE • DB Status: Connected
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="bg-ash rounded-3xl border border-white/5 overflow-hidden shadow-bento">
              <div className="p-6 border-b border-white/5 bg-white/5">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Award size={16} className="text-love" />
                  Roles de Staff
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {staff.map(member => (
                  <div key={member.id} className="bg-black/20 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{member.full_name}</p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase italic leading-none mt-1">{member.role}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateUserRole(member.id, member.role === 'admin' ? 'waiter' : 'admin')} className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded bg-white/5 hover:bg-love transition-all">
                        {member.role === 'admin' ? 'Hacer Mozo' : 'Hacer Admin'}
                      </button>
                      <button onClick={() => updateUserRole(member.id, 'client')} className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded bg-white/5 hover:text-love transition-all">
                        Quitar Acceso
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-8 p-4 bg-love/5 rounded-xl border border-love/10">
                  <p className="text-[10px] text-love font-bold uppercase tracking-widest text-center">Para añadir staff: Pídeles que se registren como clientes y luego asciéndelos aquí.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-ash rounded-3xl border border-white/5 overflow-hidden shadow-bento">
               <div className="p-6 border-b border-white/5 bg-white/5">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <History size={16} className="text-love" />
                  Historial del Salón (Últimos 50)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[9px] uppercase text-slate-500 border-b border-white/5">
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Sucursal</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Carga</th>
                      <th className="px-6 py-4 text-right">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10px] font-medium text-ivory/80">
                    {allTransactions.map(tx => (
                      <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-6 py-3">{new Date(tx.created_at).toLocaleString('es-AR')}</td>
                        <td className="px-6 py-3 bg-white/5 font-black text-white/60 uppercase">{tx.branch || '—'}</td>
                        <td className="px-6 py-3 uppercase">{(tx as any).profiles?.full_name}</td>
                        <td className="px-6 py-3 italic">{tx.description}</td>
                        <td className="px-6 py-3 text-right">
                          <p className="text-love font-black italic">+{tx.points_earned}</p>
                          {tx.amount > 0 && <p className="text-[8px] text-slate-500 opacity-60">${tx.amount.toLocaleString()}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
