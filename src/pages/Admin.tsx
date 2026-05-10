import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Profile, Prize, Transaction, SystemSettings } from '@/src/types';
import { motion } from 'motion/react';
import { Users, Gift, Settings, Search, Plus, Trash2, Calendar, Award, History, DollarSign, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function Admin() {
  const [activeTab, setActiveTab] = useState<'clients' | 'prizes' | 'staff' | 'history' | 'settings'>('clients');
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Profile[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [newPrize, setNewPrize] = useState({ title: '', description: '', points_cost: 0, image_url: '' });
  const [uploading, setUploading] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);

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
    if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      } else {
        // Create default settings if not exists
        const { data: newData, error: insertError } = await supabase
          .from('settings')
          .insert([{ points_conversion_rate: 1000 }])
          .select()
          .single();
        
        if (insertError) throw insertError;
        setSettings(newData);
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setUpdatingSettings(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update({ 
          points_conversion_rate: settings.points_conversion_rate,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;
      alert("Configuración actualizada correctamente");
    } catch (err: any) {
      alert("Error actualizando configuración: " + err.message);
    } finally {
      setUpdatingSettings(false);
    }
  };

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
        const { data, error } = await supabase
          .from('transactions')
          .select(`
            *,
            profiles!transactions_client_id_fkey (
              full_name
            )
          `)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) {
          // Fallback if specific relationship name fails
          result = await supabase
            .from('transactions')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false })
            .limit(50);
        } else {
          result = { data, error };
        }
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
      const { error, data } = await supabase.from('catalogo_premios').insert([{ ...newPrize, is_active: true }]).select();
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic text-ink">Gestión <span className="text-love">Resto</span></h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Panel Central Administrativo</p>
        </div>
        
        <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
          {['clients', 'prizes', 'staff', 'history', 'settings'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap", 
                activeTab === tab ? "bg-love text-white shadow-lg shadow-love/20" : "text-slate-400 hover:text-ink"
              )}
            >
              {tab === 'clients' ? 'Clientes' : tab === 'prizes' ? 'Premios' : tab === 'staff' ? 'Staff' : tab === 'history' ? 'Movimientos' : 'Ajustes'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-slate-200 uppercase font-black tracking-widest text-[10px] italic">Cargando datos...</div>
      ) : (
        <>
          {activeTab === 'clients' && (
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-ink">
                  <Users size={16} className="text-love" />
                  Base de Clientes ({clients.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-4">Nombre</th>
                      <th className="px-6 py-4">DNI</th>
                      <th className="px-6 py-4">Cumpleaños</th>
                      <th className="px-6 py-4 text-right">Puntos</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    {clients.map(client => (
                      <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-ink">
                        <td className="px-6 py-4">
                          <p className="font-bold">{client.full_name}</p>
                          <p className="text-[10px] text-slate-400 italic font-mono">{client.email}</p>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{client.dni}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
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
                            className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded bg-slate-100 text-slate-500 hover:bg-love hover:text-white transition-all shadow-sm"
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
              <div className="md:col-span-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50 h-fit">
                <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-ink">
                  <Plus size={16} className="text-love" />
                  Nuevo Premio
                </h3>
                <form onSubmit={handleCreatePrize} className="space-y-4">
                  <input placeholder="Título del premio" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink" value={newPrize.title} onChange={e => setNewPrize({...newPrize, title: e.target.value})} required />
                  <textarea placeholder="Descripción del beneficio" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-love h-24 text-ink" value={newPrize.description} onChange={e => setNewPrize({...newPrize, description: e.target.value})} required />
                  <input type="number" placeholder="Costo en puntos" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink" value={newPrize.points_cost || ''} onChange={e => setNewPrize({...newPrize, points_cost: parseInt(e.target.value)})} required />
                  
                  <div className="space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 pl-1">Imagen del premio</label>
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
                          "w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative bg-slate-50",
                          newPrize.image_url ? "border-love/30" : "border-slate-200 hover:border-love/50"
                        )}
                      >
                        {newPrize.image_url ? (
                          <>
                            <img src={newPrize.image_url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                              <Upload size={20} className="mb-1" />
                              <span className="text-[8px] font-black uppercase tracking-widest">Cambiar Imagen</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={cn("flex flex-col items-center transition-all", uploading ? "animate-pulse" : "")}>
                              <ImageIcon size={24} className="text-slate-300 mb-2" />
                              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                {uploading ? 'Procesando...' : 'Subir Imagen (Máx 2MB)'}
                              </span>
                            </div>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  <button type="submit" disabled={uploading || !newPrize.image_url} className="w-full bg-love text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-red active:scale-[0.98] transition-all disabled:opacity-20">
                    Publicar Premio
                  </button>
                </form>
              </div>
              <div className="md:col-span-2 space-y-4">
                {prizes.length === 0 && (
                  <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center shadow-xl shadow-slate-200/50">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 italic">No hay premios cargados</p>
                    <p className="text-[10px] text-slate-300 max-w-xs mx-auto font-bold uppercase tracking-tight">Si no puedes agregar, consulta con soporte técnico de Supabase.</p>
                  </div>
                )}
                {prizes.map(prize => (
                  <div key={prize.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 group transition-all shadow-xl shadow-slate-200/50">
                    <img src={prize.image_url} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm uppercase tracking-tighter text-ink">{prize.title}</h4>
                      <p className="text-[10px] text-love font-black uppercase tracking-widest italic">{prize.points_cost} Puntos</p>
                    </div>
                    <button onClick={() => handleDeletePrize(prize.id)} className="p-3 text-slate-300 hover:text-love transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                
                <div className="pt-8 mt-4 border-t border-slate-100 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">
                    CRM RESTO v1.0.6-FIX-DATABASE • DB Status: Connected
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-ink">
                  <Award size={16} className="text-love" />
                  Roles de Staff
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {staff.map(member => (
                  <div key={member.id} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-black uppercase tracking-tight text-ink">{member.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase italic leading-none mt-1 tracking-widest">{member.role}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateUserRole(member.id, member.role === 'admin' ? 'waiter' : 'admin')} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded bg-white text-slate-500 hover:bg-love hover:text-white transition-all border border-slate-200 shadow-sm">
                        {member.role === 'admin' ? 'Hacer Mozo' : 'Hacer Admin'}
                      </button>
                      <button onClick={() => updateUserRole(member.id, 'client')} className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded bg-white text-slate-400 hover:text-love transition-all border border-slate-200 shadow-sm">
                        Quitar Acceso
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-8 p-4 bg-love/5 rounded-xl border border-love/10">
                  <p className="text-[10px] text-love font-black uppercase tracking-widest text-center">Para añadir staff: Pídeles que se registren como clientes y luego asciéndelos aquí.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
               <div className="p-6 border-b border-slate-100 bg-slate-50">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-ink">
                  <History size={16} className="text-love" />
                  Historial del Salón (Últimos 50)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[9px] uppercase text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Sucursal</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Carga</th>
                      <th className="px-6 py-4 text-right">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10px] font-medium text-ink/80">
                    {allTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                          No se encontraron movimientos registrados en el salón.
                        </td>
                      </tr>
                    ) : (
                      allTransactions.map(tx => (
                      <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-3">{new Date(tx.created_at).toLocaleString('es-AR')}</td>
                        <td className="px-6 py-3 bg-slate-50 font-black text-slate-400 uppercase">{tx.branch || '—'}</td>
                        <td className="px-6 py-3 uppercase font-black text-ink">
                          {(() => {
                            const p = (tx as any).profiles;
                            if (Array.isArray(p)) return p[0]?.full_name || 'Desconocido';
                            return p?.full_name || 'Desconocido';
                          })()}
                        </td>
                        <td className="px-6 py-3 italic text-slate-500">{tx.description}</td>
                        <td className="px-6 py-3 text-right">
                          <p className="text-love font-black italic">+{tx.points_earned}</p>
                          {tx.amount > 0 && <p className="text-[8px] text-slate-400 font-bold tracking-tight">${tx.amount.toLocaleString()}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && settings && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-love/10 rounded-2xl flex items-center justify-center text-love">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-ink">Configuración del <span className="text-love">Sistema</span></h3>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Personaliza las reglas de lealtad</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateSettings} className="space-y-8">
                  <div className="space-y-3">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 pl-1">Tasa de Conversión de Puntos</label>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between group transition-all hover:border-love/30">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-ink">$</span>
                          <input 
                            type="number" 
                            className="bg-transparent text-4xl font-black text-love outline-none w-full border-b-2 border-transparent focus:border-love transition-all"
                            value={settings.points_conversion_rate}
                            onChange={e => setSettings({...settings, points_conversion_rate: parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">equivale a 1 punto</p>
                      </div>
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm text-love">
                        <Award size={32} />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium px-2 leading-relaxed">
                      Este valor define cuántos pesos argentinos debe consumir el cliente para sumar 1 punto. Por ejemplo, si pones 1000, un consumo de $10.000 sumará 10 puntos.
                    </p>
                  </div>

                  <button 
                    type="submit" 
                    disabled={updatingSettings}
                    className="w-full bg-ink text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-ink/20 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {updatingSettings ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
