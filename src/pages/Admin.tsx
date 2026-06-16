import React, { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Profile, Prize, Transaction, SystemSettings } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Gift, Settings, Search, Plus, Trash2, Pencil, Calendar, Award, History, DollarSign, Upload, Image as ImageIcon, FileSpreadsheet, UserPlus, X, Palette, Home, User } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import * as XLSX from 'xlsx';
import { BRANCHES } from '@/src/constants';
import { useDesign, COLOR_PRESETS, CORNER_PRESETS, AVAILABLE_FONTS, type DesignConfig, type BannerConfig } from '@/src/components/DesignEngine';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts';

export function Admin() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'prizes' | 'staff' | 'history' | 'settings' | 'design'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Profile[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [newPrize, setNewPrize] = useState({ title: '', description: '', points_cost: 0, image_url: '' });
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [newClient, setNewClient] = useState({ fullName: '', email: '', dni: '', birthDate: '', password: '' });
  const [editingClient, setEditingClient] = useState<Profile | null>(null);
  const [editClientForm, setEditClientForm] = useState({ fullName: '', email: '', dni: '', birthDate: '' });
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('Todas');
  const [dateStart, setDateStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // Last 30 days by default instead of start of month for more context
    return d.toISOString().split('T')[0];
  });
  const [dateEnd, setDateEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Design editing module states
  const { designConfig, saveDesignConfig } = useDesign();
  const [localDesign, setLocalDesign] = useState<DesignConfig | null>(null);
  const [savingDesign, setSavingDesign] = useState(false);
  const [designSubSection, setDesignSubSection] = useState<'branding' | 'styling' | 'colors' | 'banners' | 'css'>('branding');
  const [activeBannerIndex, setActiveBannerIndex] = useState<number>(0);

  const hexToRgbStr = (hex: string): string => {
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    return `${r}, ${g}, ${b}`;
  };

  useEffect(() => {
    if (activeTab === 'design' && designConfig) {
      setLocalDesign(JSON.parse(JSON.stringify(designConfig)));
    }
  }, [activeTab, designConfig]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const clientsToInsert = data.map(row => ({
          full_name: row.Nombre || row['Nombre Completo'] || row.fullName || row.name,
          email: row.Email || row.email || row.Correo,
          dni: String(row.DNI || row.dni),
          birth_date: row.FechaNacimiento || row['Fecha de Nacimiento'] || row.birthDate || row.birth_date,
          role: 'client',
          points: parseInt(row.Puntos || row.points) || 0
        })).filter(c => c.dni && c.full_name);

        if (clientsToInsert.length === 0) {
          alert("No se encontraron datos válidos en el archivo. Asegúrate de tener columnas como 'Nombre', 'DNI', 'Email'.");
          return;
        }

        const { error } = await supabase.from('profiles').upsert(clientsToInsert, { onConflict: 'dni' });
        if (error) throw error;
        
        alert(`¡Se importaron ${clientsToInsert.length} clientes correctamente!`);
        fetchData(true);
      } catch (err: any) {
        alert("Error al procesar Excel: " + err.message);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.email || !newClient.password) {
      alert("Email y Contraseña son obligatorios para crear la cuenta de usuario.");
      return;
    }

    setLoading(true);
    try {
      const trimmedDni = newClient.dni.trim();
      const trimmedEmail = newClient.email.trim();
      
      // 1. Create Supabase Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: newClient.password,
        options: {
          data: {
            full_name: newClient.fullName.trim(),
            dni: trimmedDni,
            birth_date: newClient.birthDate || null
          }
        }
      });

      if (authError) throw authError;

      // 2. Intentar actualizar o insertar el perfil manual para asegurar consistencia
      const userId = authData.user?.id;
      if (userId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            full_name: newClient.fullName.trim(),
            email: trimmedEmail,
            dni: trimmedDni,
            birth_date: newClient.birthDate || null,
            role: 'client',
            points: 0
          }, { onConflict: 'id' });

        if (profileError) {
          console.error("Profile upsert failed:", profileError);
          throw new Error(`Usuario creado pero el perfil falló: ${profileError.message}`);
        }
      }
      
      alert('¡Cliente y usuario creados con éxito! El cliente ya puede iniciar sesión.');
      setNewClient({ fullName: '', email: '', dni: '', birthDate: '', password: '' });
      setShowAddModal(false);
      
      // Delay de 1 segundo para asegurar que triggers de DB han terminado
      setTimeout(() => fetchData(true), 1000);
    } catch (err: any) {
      alert("Error al crear usuario: " + err.message);
    } finally {
      setLoading(false);
    }
  };

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
    setSelectedClients([]);
    if (activeTab === 'settings') {
      fetchSettings();
    } else if (activeTab === 'design') {
      setLoading(false);
    } else if (activeTab === 'dashboard') {
      // Dashboard needs transactions and clients
      void fetchData(true);
    } else {
      fetchData();
    }
  }, [activeTab]);

  const getDashboardData = () => {
    const prizeRanking: Record<string, number> = {};
    const clientRanking: Record<string, number> = {};

    const filteredTransactions = allTransactions.filter(tx => {
      // Branch filter
      const branchMatch = selectedBranchFilter === 'Todas' || tx.branch === selectedBranchFilter;
      
      // Date filter
      const txDate = tx.created_at.split('T')[0];
      const dateMatch = txDate >= dateStart && txDate <= dateEnd;

      return branchMatch && dateMatch;
    });

    filteredTransactions.forEach(tx => {
      // Ranking by prize redemptions
      if (tx.redemption_code && tx.description?.startsWith('CANJE:')) {
        const prizeName = tx.description.replace('CANJE:', '').trim();
        prizeRanking[prizeName] = (prizeRanking[prizeName] || 0) + 1;
      }

      // Ranking by client amount
      const p = (tx as any).profiles;
      const profile = Array.isArray(p) ? p[0] : p;
      const clientName = profile?.full_name || tx.client_id;
      if (tx.amount > 0) {
        clientRanking[clientName] = (clientRanking[clientName] || 0) + (tx.amount || 0);
      }
    });

    const prizeData = Object.entries(prizeRanking)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const clientData = Object.entries(clientRanking)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const newClients = clients.filter(c => {
      const isClient = !c.role || c.role === 'client';
      if (!isClient) return false;
      if (!c.created_at) return false;
      const cAt = c.created_at.split('T')[0];
      return cAt >= dateStart && cAt <= dateEnd;
    }).sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

    const regPerDay: Record<string, number> = {};
    
    // Ensure all days between dateStart and dateEnd have at least 0 registrations for a better chart
    let curr = new Date(dateStart + 'T12:00:00');
    const end = new Date(dateEnd + 'T12:00:00');
    while (curr <= end) {
      regPerDay[curr.toISOString().split('T')[0]] = 0;
      curr.setDate(curr.getDate() + 1);
    }

    newClients.forEach(c => {
      const day = c.created_at!.split('T')[0];
      regPerDay[day] = (regPerDay[day] || 0) + 1;
    });

    const registrationData = Object.entries(regPerDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { prizeData, clientData, filteredTransactions, newClients, registrationData };
  };

  const dashboardData = getDashboardData();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) {
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
    } catch (err: any) {
      console.error("Error fetching settings:", err);
      // Fallback if table doesn't exist or other error
      if (!settings) {
        setSettings({ id: 'fallback', points_conversion_rate: 1000, updated_at: new Date().toISOString() });
      }
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
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('points', { ascending: false });
        
        if (error) {
          if (error.message.includes('recursion')) {
            console.error("Recursive policy detected. Falling back to local data.");
            // Don't alert here to avoid spamming the user, we try to fetch as much as we can
          }
          throw error;
        }

        if (data) {
          const filtered = data.filter((p: any) => {
            const role = String(p.role || '').toLowerCase();
            return role === 'client' || role === '' || (!role && role !== 'admin' && role !== 'waiter');
          });
          setClients(filtered);
          localStorage.setItem(cacheKey, JSON.stringify(filtered));
        }
      } else if (activeTab === 'prizes') {
        const { data, error } = await supabase
          .from('catalogo_premios')
          .select('*')
          .order('points_cost', { ascending: true });
        
        if (error) throw error;
        
        setPrizes(data || []);
        localStorage.setItem(cacheKey, JSON.stringify(data || []));
      } else if (activeTab === 'staff') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('role', { ascending: false });
        
        if (error) throw error;
        
        const filtered = (data || []).filter((p: any) => {
          const role = String(p.role || '').toLowerCase();
          return role === 'waiter' || role === 'admin';
        });
        setStaff(filtered);
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
      } else if (activeTab === 'dashboard' || activeTab === 'history') {
        // Dashboard also needs clients for the registration chart
        if (activeTab === 'dashboard' || activeTab === 'history') {
          const { data: pData } = await supabase.from('profiles').select('*');
          if (pData) {
            const onlyClients = pData.filter(p => !p.role || p.role === 'client');
            setClients(onlyClients);
          }
        }

        let query = supabase
          .from('transactions')
          .select('*, profiles!client_id(full_name, dni), transaction_items(*)')
          .order('created_at', { ascending: false });
        
        if (dateStart) query = query.gte('created_at', `${dateStart}T00:00:00`);
        if (dateEnd) query = query.lte('created_at', `${dateEnd}T23:59:59`);

        const { data, error } = await query.limit(activeTab === 'dashboard' ? 500 : 1000);
        
        if (error) {
          console.error("History fetch error, retrying flat:", error);
          let flatQuery = supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (dateStart) flatQuery = flatQuery.gte('created_at', `${dateStart}T00:00:00`);
          if (dateEnd) flatQuery = flatQuery.lte('created_at', `${dateEnd}T23:59:59`);

          const { data: flatData, error: flatError } = await flatQuery.limit(500);
          if (flatError) throw flatError;
          setAllTransactions(flatData || []);
          localStorage.setItem(cacheKey, JSON.stringify(flatData || []));
        } else {
          setAllTransactions(data || []);
          localStorage.setItem(cacheKey, JSON.stringify(data || []));
        }
      }
    } catch (e: any) {
      console.error("Fetch error in Admin:", e);
      alert("Error al cargar datos: " + e.message);
    } finally {
      clearTimeout(fetchTimeout);
      setLoading(false);
    }
  };

  const handleDeleteClients = async (idsToDelete?: string[]) => {
    const targets = Array.isArray(idsToDelete) ? idsToDelete : selectedClients;
    if (targets.length === 0) return;
    
    const confirmMsg = targets.length === 1 
      ? "¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer."
      : `¿Estás seguro de que deseas eliminar los ${targets.length} clientes seleccionados? Esta acción no se puede deshacer y podría afectar el historial si los clientes tienen transacciones.`;

    if (!confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .in('id', targets);

      if (error) {
        if (error.message.includes('violates foreign key constraint')) {
          throw new Error("No se pueden eliminar clientes con transacciones previas. Primero elimina sus movimientos o consulta con soporte.");
        }
        throw error;
      }

      alert(targets.length === 1 ? 'Cliente eliminado' : 'Clientes eliminados correctamente');
      if (idsToDelete) {
        setSelectedClients(prev => prev.filter(id => !idsToDelete.includes(id)));
      } else {
        setSelectedClients([]);
      }
      await fetchData(true);
    } catch (err: any) {
      alert("Error al eliminar: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmitPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrize.image_url) {
      alert("Por favor sube una imagen");
      return;
    }
    
    setLoading(true);
    try {
      if (editingPrizeId) {
        const { error } = await supabase
          .from('catalogo_premios')
          .update({
            title: newPrize.title,
            description: newPrize.description,
            points_cost: newPrize.points_cost,
            image_url: newPrize.image_url
          })
          .eq('id', editingPrizeId);
        
        if (error) {
          alert(`Error al actualizar: ${error.message}`);
        } else {
          setEditingPrizeId(null);
          setNewPrize({ title: '', description: '', points_cost: 0, image_url: '' });
          await fetchData(true);
          alert('¡Premio actualizado!');
        }
      } else {
        const { error } = await supabase.from('catalogo_premios').insert([{ ...newPrize, is_active: true }]);
        if (error) {
          console.error("Error Detail:", error);
          alert(`Error Supabase: ${error.message} (Código: ${error.code})`);
        } else {
          setNewPrize({ title: '', description: '', points_cost: 0, image_url: '' });
          await fetchData(true);
          alert('¡Premio publicado!');
        }
      }
    } catch (err: any) {
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const startEditingPrize = (prize: Prize) => {
    setEditingPrizeId(prize.id);
    setNewPrize({
      title: prize.title,
      description: prize.description,
      points_cost: prize.points_cost,
      image_url: prize.image_url
    });
    // Scroll to the form
    const formElement = document.getElementById('prize-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
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

  const handleExportHistory = () => {
    const dataToExport = allTransactions.map(tx => {
      const p = (tx as any).profiles;
      const profile = Array.isArray(p) ? p[0] : p;
      const date = new Date(tx.created_at);
      
      const cleanDesc = (tx.description || '').split('||JSON_ITEMS')[0].trim();
      const isCanje = cleanDesc.toUpperCase().startsWith('CANJE:');
      const operacion = isCanje ? 'Canje' : (cleanDesc.toUpperCase().startsWith('CONSUMO') ? 'Consumo' : 'Otro');
      const premio = isCanje ? cleanDesc.split(':')[1]?.trim() || '—' : '—';

      return {
        'Fecha': date.toLocaleDateString('es-AR'),
        'Hora': date.toLocaleTimeString('es-AR'),
        'Sucursal': tx.branch || '—',
        'Cliente': profile?.full_name || 'Desconocido',
        'DNI': profile?.dni || '—',
        'Operación': operacion,
        'Premio Canjeado': premio,
        'Código': tx.redemption_code || '—',
        'Factura': tx.invoice_number || '—',
        'Monto ($)': tx.amount,
        'Puntos Sumados': tx.points_earned
      };
    });
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial");
    XLSX.writeFile(wb, `movimientos_salon_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const startEditingClient = (client: Profile) => {
    setEditingClient(client);
    setEditClientForm({
      fullName: client.full_name,
      email: client.email,
      dni: client.dni,
      birthDate: client.birth_date || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editClientForm.fullName,
          email: editClientForm.email,
          dni: editClientForm.dni,
          birth_date: editClientForm.birthDate || null
        })
        .eq('id', editingClient.id);

      if (error) throw error;
      
      alert('¡Cliente actualizado con éxito!');
      setShowEditModal(false);
      await fetchData(true);
    } catch (err: any) {
      alert('Error al actualizar cliente: ' + err.message);
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
          <h2 className="text-2xl font-black uppercase tracking-tighter italic text-ink">CRAFT <span className="text-love">RESTO</span></h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">Panel Central Administrativo</p>
        </div>
        
        <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto">
          {['dashboard', 'clients', 'prizes', 'staff', 'history', 'settings', 'design'].map((tab) => {
            const labels: Record<string, string> = {
              dashboard: 'Dashboard',
              clients: 'Clientes',
              prizes: 'Premios',
              staff: 'Staff',
              history: 'Movimientos',
              settings: 'Ajustes',
              design: 'Diseño'
            };
            return (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap", 
                  activeTab === tab ? "bg-love text-white shadow-lg shadow-love/20" : "text-slate-400 hover:text-ink"
                )}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-slate-200 uppercase font-black tracking-widest text-[10px] italic">Cargando datos...</div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-2 items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-2">Sucursal:</span>
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setSelectedBranchFilter('Todas')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all",
                        selectedBranchFilter === 'Todas' ? "bg-ink text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      )}
                    >
                      Todas
                    </button>
                    {BRANCHES.map(branch => (
                      <button
                        key={branch}
                        onClick={() => setSelectedBranchFilter(branch)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all",
                          selectedBranchFilter === branch ? "bg-ink text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        {branch}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Calendar size={14} className="text-slate-300" />
                    <div className="flex items-center gap-1 flex-1">
                      <input 
                        type="date" 
                        value={dateStart} 
                        onChange={e => setDateStart(e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] font-bold text-ink outline-none focus:border-love/30 flex-1"
                      />
                      <span className="text-[9px] font-black text-slate-300 uppercase">A</span>
                      <input 
                        type="date" 
                        value={dateEnd} 
                        onChange={e => setDateEnd(e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] font-bold text-ink outline-none focus:border-love/30 flex-1"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => fetchData(true)}
                    className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors"
                    title="Actualizar Datos"
                  >
                    <History size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Visual Cards */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-ink flex items-center gap-2">
                       <Award size={16} className="text-love" />
                       Ranking de Ventas (Top Clientes)
                    </h3>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.clientData} layout="vertical" margin={{ left: 40, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={100} 
                          tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 800 }}
                          formatter={(val: number) => [`$${val.toLocaleString('es-AR')}`, 'Total Gastado']}
                        />
                        <Bar dataKey="total" fill="#FF4757" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
                   <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-ink flex items-center gap-2">
                       <Gift size={16} className="text-ink" />
                       Premios Más Canjeados (Cantidades)
                    </h3>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.prizeData} margin={{ top: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis hide />
                        <Tooltip 
                           contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 800 }}
                           formatter={(val: number) => [val, 'Canjes']}
                        />
                        <Bar dataKey="qty" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={30}>
                          {dashboardData.prizeData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#FF4757' : '#1e293b'} opacity={1 - (index * 0.05)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 md:col-span-2">
                   <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-ink flex items-center gap-2">
                       <UserPlus size={16} className="text-love" />
                       Nuevos Clientes ({dashboardData.newClients.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.registrationData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                             dataKey="date" 
                             tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }}
                             tickFormatter={(val) => new Date(val).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                             axisLine={false}
                             tickLine={false}
                          />
                          <YAxis allowDecimals={false} tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 800 }}
                            labelFormatter={(val) => new Date(val).toLocaleDateString('es-AR', { dateStyle: 'medium' })}
                          />
                          <Bar dataKey="count" fill="#FF4757" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Últimos Registros:</p>
                      {dashboardData.newClients.length > 0 ? (
                        dashboardData.newClients.slice(0, 10).map(client => (
                          <div key={client.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                             <div className="overflow-hidden">
                                <p className="text-[10px] font-bold text-ink truncate uppercase">{client.full_name}</p>
                                <p className="text-[8px] font-bold text-slate-400">{new Date(client.created_at!).toLocaleDateString('es-AR')}</p>
                             </div>
                             <div className="text-[10px] font-black text-love">{client.dni}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-[10px] font-bold text-slate-300 uppercase italic">No hubo registros</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid de Métricas Rápidas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Recaudado</p>
                  <p className="text-lg font-black text-ink mt-1">
                    ${dashboardData.filteredTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0).toLocaleString('es-AR')}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Puntos Emitidos</p>
                  <p className="text-lg font-black text-love mt-1">
                    {dashboardData.filteredTransactions.reduce((acc, tx) => acc + (tx.points_earned || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Prom Ticket</p>
                  <p className="text-lg font-black text-ink mt-1">
                    ${dashboardData.filteredTransactions.length > 0 ? (dashboardData.filteredTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0) / dashboardData.filteredTransactions.length).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '0'}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
                   <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Transacciones</p>
                   <p className="text-lg font-black text-ink mt-1">{dashboardData.filteredTransactions.length}</p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-love text-white p-6 rounded-3xl flex items-center justify-between shadow-xl shadow-love/20 hover:scale-[1.02] transition-all"
                >
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Nuevo</p>
                    <h4 className="text-xl font-black italic">Cliente Manual</h4>
                  </div>
                  <UserPlus size={32} />
                </button>

                <div className="relative group overflow-hidden bg-ink text-white p-6 rounded-3xl flex items-center justify-between shadow-xl shadow-ink/20 hover:scale-[1.02] transition-all cursor-pointer">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleImportExcel}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    disabled={importing}
                  />
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{importing ? 'Procesando...' : 'Carga Masiva'}</p>
                    <h4 className="text-xl font-black italic">Importar Excel</h4>
                  </div>
                  <FileSpreadsheet size={32} />
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-xl shadow-slate-200/50">
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total en Base</p>
                    <h4 className="text-xl font-black italic text-ink">{clients.length} Clientes</h4>
                  </div>
                  <Users size={32} className="text-slate-200" />
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-ink">
                    <Users size={16} className="text-love" />
                    Base de Clientes
                  </h3>
                </div>
                
                {selectedClients.length > 0 && (
                  <div className="px-6 py-3 bg-love/5 border-b border-love/10 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-love italic">
                        {selectedClients.length} Seleccionado{selectedClients.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleDeleteClients()}
                      disabled={deleting}
                      className="flex items-center gap-2 bg-love text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-love/20 disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      {deleting ? 'Eliminando...' : 'Eliminar' }
                    </button>
                  </div>
                )}

                <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[9px] uppercase tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-4 w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-love focus:ring-love"
                          checked={clients.length > 0 && selectedClients.length === clients.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClients(clients.map(c => c.id));
                            } else {
                              setSelectedClients([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-6 py-4">Nombre</th>
                      <th className="px-6 py-4">DNI</th>
                      <th className="px-6 py-4">Cumpleaños</th>
                      <th className="px-6 py-4 text-right">Puntos</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                          No se encontraron clientes registrados.
                        </td>
                      </tr>
                    ) : (
                      clients.map(client => (
                        <tr key={client.id} className={cn(
                          "border-b border-slate-100 hover:bg-slate-50 transition-colors text-ink",
                          selectedClients.includes(client.id) && "bg-love/5"
                        )}>
                          <td className="px-6 py-4">
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-love focus:ring-love"
                              checked={selectedClients.includes(client.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClients(prev => [...prev, client.id]);
                                } else {
                                  setSelectedClients(prev => prev.filter(id => id !== client.id));
                                }
                              }}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold">{client.full_name}</p>
                            <p className="text-[10px] text-slate-400 italic font-mono">{client.email}</p>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{client.dni}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Calendar size={12} className={cn("text-love", !client.birth_date && "opacity-20")} />
                              {client.birth_date ? (
                                <span className="font-bold text-ink">{client.birth_date}</span>
                              ) : (
                                <span className="text-[10px] text-slate-300 italic">No cargada</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-love font-black italic text-lg">{client.points}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => startEditingClient(client)}
                                className="p-2 text-slate-300 hover:text-ink transition-colors"
                                title="Editar Datos"
                              >
                                <Pencil size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteClients([client.id])}
                                className="p-2 text-slate-300 hover:text-love transition-colors"
                                title="Eliminar Cliente"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button 
                                onClick={() => updateUserRole(client.id, 'waiter')}
                                className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded bg-slate-100 text-slate-500 hover:bg-love hover:text-white transition-all shadow-sm"
                              >
                                Hacer Staff
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          {activeTab === 'prizes' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/50 h-fit">
                <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-ink">
                  {editingPrizeId ? <Pencil size={16} className="text-love" /> : <Plus size={16} className="text-love" />}
                  {editingPrizeId ? 'Editar Premio' : 'Nuevo Premio'}
                </h3>
                <form id="prize-form" onSubmit={handleSubmitPrize} className="space-y-4">
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
                    {editingPrizeId ? 'Guardar Cambios' : 'Publicar Premio'}
                  </button>
                  {editingPrizeId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingPrizeId(null);
                        setNewPrize({ title: '', description: '', points_cost: 0, image_url: '' });
                      }} 
                      className="w-full bg-slate-100 text-slate-500 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                    >
                      Cancelar
                    </button>
                  )}
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
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEditingPrize(prize)} className="p-3 text-slate-300 hover:text-ink transition-colors">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => handleDeletePrize(prize.id)} className="p-3 text-slate-300 hover:text-love transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="pt-8 mt-4 border-t border-slate-100 text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-300">
                    CRM CRAFT RESTO v1.0.6-FIX-DATABASE • DB Status: Connected
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
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-2">Filtro Período:</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="date" 
                        value={dateStart} 
                        onChange={e => setDateStart(e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2 py-1.5 text-[10px] font-bold text-ink outline-none focus:border-love/30"
                      />
                    </div>
                    <span className="text-[9px] font-black text-slate-300 uppercase">Hasta</span>
                    <div className="relative">
                      <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        type="date" 
                        value={dateEnd} 
                        onChange={e => setDateEnd(e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-lg pl-8 pr-2 py-1.5 text-[10px] font-bold text-ink outline-none focus:border-love/30"
                      />
                    </div>
                    <button 
                      onClick={() => fetchData(true)}
                      className="ml-2 bg-ink text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-2">Sucursal:</span>
                  <select 
                    value={selectedBranchFilter}
                    onChange={e => setSelectedBranchFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-[10px] font-bold text-ink outline-none focus:border-love/30"
                  >
                    <option value="Todas">Todas</option>
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-ink">
                    <History size={16} className="text-love" />
                    Historial del Salón
                  </h3>
                <button 
                  onClick={handleExportHistory}
                  className="flex items-center gap-2 bg-ink text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-ink/10"
                >
                  <FileSpreadsheet size={14} />
                  Exportar CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="text-[9px] uppercase text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Hora</th>
                      <th className="px-6 py-4">Sucursal</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">DNI</th>
                      <th className="px-6 py-4">Operación</th>
                      <th className="px-6 py-4">Premio</th>
                      <th className="px-6 py-4">Código</th>
                      <th className="px-6 py-4">Factura</th>
                      <th className="px-6 py-4 text-right">Puntos</th>
                    </tr>
                  </thead>
                  <tbody className="text-[10px] font-medium text-ink/80">
                    {(() => {
                      const filtered = allTransactions.filter(tx => {
                        const branchMatch = selectedBranchFilter === 'Todas' || tx.branch === selectedBranchFilter;
                        return branchMatch;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={10} className="px-6 py-12 text-center text-slate-400 italic">
                              No se encontraron movimientos para el filtro seleccionado.
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map(tx => {
                        const cleanDesc = (tx.description || '').split('||JSON_ITEMS')[0].trim();
                        const isCanje = cleanDesc.toUpperCase().startsWith('CANJE:');
                        const operacion = isCanje ? 'Canje' : (cleanDesc.toUpperCase().startsWith('CONSUMO') ? 'Consumo' : 'Otro');
                        const premio = isCanje ? cleanDesc.split(':')[1]?.trim() || '—' : '—';
                        const date = new Date(tx.created_at);

                        return (
                        <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-6 py-3">{date.toLocaleDateString('es-AR')}</td>
                          <td className="px-6 py-3 text-slate-400">{date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-6 py-3 bg-slate-50 font-black text-slate-400 uppercase">{tx.branch || '—'}</td>
                          <td className="px-6 py-3 uppercase font-black text-ink">
                            {(() => {
                              const p = (tx as any).profiles;
                              const profile = Array.isArray(p) ? p[0] : p;
                              return profile?.full_name || 'Desconocido';
                            })()}
                          </td>
                          <td className="px-6 py-3 text-slate-400">
                            {(() => {
                              const p = (tx as any).profiles;
                              const profile = Array.isArray(p) ? p[0] : p;
                              return profile?.dni || '—';
                            })()}
                          </td>
                          <td className="px-6 py-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                              operacion === 'Canje' ? "bg-love/10 text-love" : "bg-ink/10 text-ink"
                            )}>
                              {operacion}
                            </span>
                          </td>
                          <td className="px-6 py-3 italic text-slate-500">
                            {premio}
                            {tx.transaction_items && tx.transaction_items.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tx.transaction_items.map((item: any, i: number) => (
                                  <span key={i} className="bg-love/5 text-love text-[7px] px-1.5 py-0.5 rounded border border-love/10 font-black uppercase tracking-tighter">
                                    {item.quantity}x {item.item_name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-3 font-mono font-black text-ink">
                            {tx.redemption_code ? (
                              <span className="bg-slate-100 px-2 py-1 rounded text-[9px] border border-slate-200">
                                {tx.redemption_code}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-6 py-3 font-mono font-black text-ink uppercase">
                            {tx.invoice_number ? (
                              <span className="bg-slate-100 px-2 py-1 rounded text-[9px] border border-slate-200">
                                {tx.invoice_number}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <p className={cn("font-black italic", tx.points_earned >= 0 ? "text-love" : "text-slate-400")}>
                              {tx.points_earned >= 0 ? '+' : ''}{tx.points_earned}
                            </p>
                            {tx.amount > 0 && <p className="text-[8px] text-slate-400 font-bold tracking-tight">${tx.amount.toLocaleString()}</p>}
                          </td>
                        </tr>
                      );});
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto">
              {!settings ? (
                <div className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  Cargando configuración...
                </div>
              ) : (
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
              )}
            </div>
          )}

          {activeTab === 'design' && (
            <div className="space-y-6">
              {!localDesign ? (
                <div className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  Cargando panel de diseño...
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Column - Editing Controls */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-love/10 rounded-2xl flex items-center justify-center text-love">
                            <Palette size={24} />
                          </div>
                          <div>
                            <h3 className="text-xl font-black uppercase tracking-tighter text-ink">Estilo y <span className="text-love">Marca</span></h3>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Control de diseño para Marketing</p>
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            setSavingDesign(true);
                            try {
                              await saveDesignConfig(localDesign);
                              alert('¡Configuración de diseño guardada con éxito!');
                            } catch (err) {
                              alert('Error al guardar diseño.');
                            } finally {
                              setSavingDesign(false);
                            }
                          }}
                          disabled={savingDesign}
                          className="bg-love text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-love/30 hover:bg-red-600 transition-all disabled:opacity-50"
                        >
                          {savingDesign ? 'Guardando...' : 'Aplicar y Guardar'}
                        </button>
                      </div>

                      {/* Subsection Navigation Bar */}
                      <div className="flex flex-wrap gap-1 p-1 bg-slate-50 border border-slate-200/60 rounded-xl mb-6">
                        {(['branding', 'styling', 'colors', 'banners', 'css'] as const).map((sub) => {
                          const labels: Record<string, string> = {
                            branding: 'Branding',
                            styling: 'Tipografía',
                            colors: 'Colores',
                            banners: 'Publicidad/Banners',
                            css: 'CSS Avanzado'
                          };
                          return (
                            <button
                              key={sub}
                              onClick={() => {
                                setDesignSubSection(sub);
                                if (sub === 'banners' && localDesign.banners.length > 0) {
                                  setActiveBannerIndex(0);
                                }
                              }}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all",
                                designSubSection === sub 
                                  ? "bg-slate-900 text-white shadow-sm" 
                                  : "text-slate-400 hover:text-ink"
                              )}
                            >
                              {labels[sub]}
                            </button>
                          );
                        })}
                      </div>

                      {/* Branding Subsegment */}
                      {designSubSection === 'branding' && (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Comercial de la Marca</label>
                            <input
                              type="text"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink font-bold"
                              value={localDesign.logoText}
                              onChange={(e) => setLocalDesign({ ...localDesign, logoText: e.target.value })}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Eslogan o Subtítulo del Logo</label>
                            <input
                              type="text"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink"
                              value={localDesign.logoSubtitle}
                              onChange={(e) => setLocalDesign({ ...localDesign, logoSubtitle: e.target.value })}
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Logo URL (Imagen de marca)</label>
                            <input
                              type="text"
                              placeholder="Ej: https://tudominio.com/logo.png"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink font-mono text-xs"
                              value={localDesign.logoUrl}
                              onChange={(e) => setLocalDesign({ ...localDesign, logoUrl: e.target.value })}
                            />
                            <p className="text-[9px] text-slate-400 mt-1">Si dejas este campo en blanco, se creará un logo inicial abstracto a partir de la primera letra del nombre comercial.</p>
                          </div>
                        </div>
                      )}

                      {/* Styling & Corner Borders Subsegment */}
                      {designSubSection === 'styling' && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fuente Principal (Cuerpo)</label>
                              <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink font-semibold"
                                value={localDesign.fontSans}
                                onChange={(e) => setLocalDesign({ ...localDesign, fontSans: e.target.value })}
                              >
                                {AVAILABLE_FONTS.map((font) => (
                                  <option key={font} value={font}>{font}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fuente Titulares (H1, H2, Logo)</label>
                              <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink font-semibold"
                                value={localDesign.fontHeadings}
                                onChange={(e) => setLocalDesign({ ...localDesign, fontHeadings: e.target.value })}
                              >
                                {AVAILABLE_FONTS.map((font) => (
                                  <option key={font} value={font}>{font}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Esquinas y Redondeado (Borders)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {CORNER_PRESETS.map((preset) => {
                                const isActive = localDesign.radiusLg === preset.lg;
                                return (
                                  <button
                                    type="button"
                                    key={preset.name}
                                    onClick={() => setLocalDesign({
                                      ...localDesign,
                                      radiusLg: preset.lg,
                                      radiusMd: preset.md,
                                      radiusSm: preset.sm
                                    })}
                                    className={cn(
                                      "p-3 rounded-xl border text-center transition-all",
                                      isActive 
                                        ? "border-love bg-love/5 text-love font-bold shadow-sm" 
                                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                                    )}
                                  >
                                    <p className="text-[10px] font-bold uppercase">{preset.name}</p>
                                    <p className="text-[8px] opacity-75 mt-0.5">{preset.lg}</p>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Colors Subsegment */}
                      {designSubSection === 'colors' && (
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Paletas Rápidas Prediseñadas</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {COLOR_PRESETS.map((preset) => {
                                const isActive = localDesign.primaryColor.toLowerCase() === preset.primary.toLowerCase();
                                return (
                                  <button
                                    type="button"
                                    key={preset.name}
                                    onClick={() => setLocalDesign({
                                      ...localDesign,
                                      primaryColor: preset.primary,
                                      primaryColorHover: preset.hover,
                                      primaryColorRgb: preset.rgb
                                    })}
                                    className={cn(
                                      "p-2.5 rounded-xl border flex items-center gap-2 transition-all text-left",
                                      isActive 
                                        ? "border-slate-900 bg-white shadow-md text-ink font-bold" 
                                        : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100"
                                    )}
                                  >
                                    <span className="w-4 h-4 rounded-full shrink-0 shadow-inner" style={{ backgroundColor: preset.primary }} />
                                    <span className="text-[9px] font-bold uppercase tracking-tight leading-none overflow-hidden text-ellipsis whitespace-nowrap">{preset.name.split(' (')[0]}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Color Principal Customizado (HEX)</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  className="w-12 h-11 p-0.5 bg-white border border-slate-200 rounded-xl cursor-pointer"
                                  value={localDesign.primaryColor}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalDesign({
                                      ...localDesign,
                                      primaryColor: val,
                                      primaryColorHover: val,
                                      primaryColorRgb: hexToRgbStr(val)
                                    });
                                  }}
                                />
                                <input
                                  type="text"
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-ink"
                                  value={localDesign.primaryColor}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val.startsWith('#') && val.length <= 7) {
                                      setLocalDesign({
                                        ...localDesign,
                                        primaryColor: val,
                                        primaryColorHover: val,
                                        primaryColorRgb: hexToRgbStr(val)
                                      });
                                    }
                                  }}
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Variable RGB (Fondo Opacidad)</label>
                              <input
                                type="text"
                                disabled
                                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-400"
                                value={localDesign.primaryColorRgb}
                              />
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 space-y-4">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Fondos Clásicos vs Oscuros</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <h5 className="text-[10px] font-black uppercase tracking-wide text-ink">Estilo de Modo Claro</h5>
                                <div className="space-y-2">
                                  <div>
                                    <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Color Fondo de Página</label>
                                    <input
                                      type="text"
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono text-ink"
                                      value={localDesign.bgPaperLight}
                                      onChange={(e) => setLocalDesign({ ...localDesign, bgPaperLight: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Color Tarjetas (Cards)</label>
                                    <input
                                      type="text"
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono text-ink"
                                      value={localDesign.bgCardLight}
                                      onChange={(e) => setLocalDesign({ ...localDesign, bgCardLight: e.target.value })}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3 p-4 bg-slate-900 rounded-2xl border border-slate-850 text-white">
                                <h5 className="text-[10px] font-black uppercase tracking-wide text-slate-300">Estilo de Modo Oscuro</h5>
                                <div className="space-y-2">
                                  <div>
                                    <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Color Fondo de Página</label>
                                    <input
                                      type="text"
                                      className="w-full bg-slate-850 border border-slate-750 rounded-lg px-2 py-1 text-xs font-mono text-white bg-slate-800"
                                      value={localDesign.bgPaperDark}
                                      onChange={(e) => setLocalDesign({ ...localDesign, bgPaperDark: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Color Tarjetas (Cards)</label>
                                    <input
                                      type="text"
                                      className="w-full bg-slate-850 border border-slate-750 rounded-lg px-2 py-1 text-xs font-mono text-white bg-slate-800"
                                      value={localDesign.bgCardDark}
                                      onChange={(e) => setLocalDesign({ ...localDesign, bgCardDark: e.target.value })}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Advertising Banners Subsegment */}
                      {designSubSection === 'banners' && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Administrar Campañas Publicitarias</label>
                            <button
                              type="button"
                              onClick={() => {
                                const newId = `banner-${Date.now()}`;
                                const newBanner: BannerConfig = {
                                  id: newId,
                                  title: 'Nueva Promo Especial',
                                  subtitle: 'Consigue promociones exclusivas con tus puntos.',
                                  imageUrl: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=600&auto=format&fit=crop',
                                  linkUrl: '#/rewards',
                                  bgColor: '#065f46',
                                  textColor: '#ecfdf5',
                                  buttonText: 'Canjear YA'
                                };
                                const updatedBanners = [...localDesign.banners, newBanner];
                                setLocalDesign({ ...localDesign, banners: updatedBanners });
                                setActiveBannerIndex(updatedBanners.length - 1);
                              }}
                              className="text-[9px] font-black uppercase tracking-widest text-love border border-love/20 px-3 py-1 rounded-lg hover:bg-love/5 transition-all flex items-center gap-1"
                            >
                              <Plus size={12} /> Agregar Banner
                            </button>
                          </div>

                          {localDesign.banners.length === 0 ? (
                            <div className="py-8 text-center text-slate-400 text-xs italic">
                              No hay banners activos. Los clientes no verán anuncios en su app.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Sliders Selector */}
                              <div className="flex gap-1 overflow-x-auto pb-1 border-b border-slate-100">
                                {localDesign.banners.map((item, index) => {
                                  const isActive = index === activeBannerIndex;
                                  return (
                                    <button
                                      type="button"
                                      key={item.id}
                                      onClick={() => setActiveBannerIndex(index)}
                                      className={cn(
                                        "px-2.5 py-1.5 rounded-t-lg text-[9px] font-black uppercase tracking-tighter whitespace-nowrap transition-all border-t border-x",
                                        isActive 
                                          ? "border-slate-200 bg-slate-100 text-ink" 
                                          : "border-transparent bg-transparent text-slate-400 hover:text-slate-600"
                                      )}
                                    >
                                      Banner {index + 1}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Form detail of selected Banner */}
                              {localDesign.banners[activeBannerIndex] && (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 relative">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedList = localDesign.banners.filter((_, i) => i !== activeBannerIndex);
                                      setLocalDesign({ ...localDesign, banners: updatedList });
                                      setActiveBannerIndex(0);
                                    }}
                                    className="absolute top-4 right-4 text-slate-400 hover:text-love transition-colors"
                                    title="Eliminar Banner"
                                  >
                                    <Trash2 size={16} />
                                  </button>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Título Promocional</label>
                                      <input
                                        type="text"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-ink font-bold"
                                        value={localDesign.banners[activeBannerIndex].title}
                                        onChange={(e) => {
                                          const updated = [...localDesign.banners];
                                          updated[activeBannerIndex].title = e.target.value;
                                          setLocalDesign({ ...localDesign, banners: updated });
                                        }}
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Texto del Botón (CTA)</label>
                                      <input
                                        type="text"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-ink"
                                        value={localDesign.banners[activeBannerIndex].buttonText}
                                        onChange={(e) => {
                                          const updated = [...localDesign.banners];
                                          updated[activeBannerIndex].buttonText = e.target.value;
                                          setLocalDesign({ ...localDesign, banners: updated });
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Subtítulo o Descripción de Campaña</label>
                                    <input
                                      type="text"
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-ink"
                                      value={localDesign.banners[activeBannerIndex].subtitle}
                                      onChange={(e) => {
                                        const updated = [...localDesign.banners];
                                        updated[activeBannerIndex].subtitle = e.target.value;
                                        setLocalDesign({ ...localDesign, banners: updated });
                                      }}
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Imagen URL (Banner banner background o fotito)</label>
                                    <input
                                      type="text"
                                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-ink"
                                      value={localDesign.banners[activeBannerIndex].imageUrl}
                                      onChange={(e) => {
                                        const updated = [...localDesign.banners];
                                        updated[activeBannerIndex].imageUrl = e.target.value;
                                        setLocalDesign({ ...localDesign, banners: updated });
                                      }}
                                    />
                                  </div>

                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Color Fondo Banner</label>
                                      <input
                                        type="text"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono text-ink"
                                        value={localDesign.banners[activeBannerIndex].bgColor}
                                        onChange={(e) => {
                                          const updated = [...localDesign.banners];
                                          updated[activeBannerIndex].bgColor = e.target.value;
                                          setLocalDesign({ ...localDesign, banners: updated });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Color Letra Banner</label>
                                      <input
                                        type="text"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono text-ink"
                                        value={localDesign.banners[activeBannerIndex].textColor}
                                        onChange={(e) => {
                                          const updated = [...localDesign.banners];
                                          updated[activeBannerIndex].textColor = e.target.value;
                                          setLocalDesign({ ...localDesign, banners: updated });
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Link de Redirección</label>
                                      <input
                                        type="text"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-ink"
                                        value={localDesign.banners[activeBannerIndex].linkUrl}
                                        onChange={(e) => {
                                          const updated = [...localDesign.banners];
                                          updated[activeBannerIndex].linkUrl = e.target.value;
                                          setLocalDesign({ ...localDesign, banners: updated });
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Custom CSS Editor */}
                      {designSubSection === 'css' && (
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Código CSS de Marketing Personalizado</label>
                          <textarea
                            rows={8}
                            placeholder="/* Escribe tus overrides de CSS personalizados aquí */&#10;.bento-ad-card { border: 2px dashed #ff0000; }"
                            className="w-full bg-slate-900 border border-slate-950 font-mono text-xs text-emerald-400 p-4 rounded-2xl outline-none focus:border-love"
                            value={localDesign.customCss}
                            onChange={(e) => setLocalDesign({ ...localDesign, customCss: e.target.value })}
                          />
                          <p className="text-[9px] text-slate-400 leading-relaxed px-1">
                            Este código CSS se inyecta directamente en el &lt;head&gt; de todas las vistas del sistema. Permite cambiar colores específicos, degradados avanzados, o detalles tipográficos que no cuenten con un botón dedicado.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Live Mockup Preview */}
                  <div className="lg:col-span-5">
                    <div className="sticky top-28 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Previsualización en tiempo real</span>
                        <div className="flex gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                        </div>
                      </div>

                      {/* Mockup Frame Container */}
                      <div 
                        className="bg-slate-100 rounded-[2.5rem] p-4 border-4 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between max-w-sm mx-auto"
                        style={{ 
                          fontFamily: `"${localDesign.fontSans}", sans-serif`,
                          minHeight: '520px'
                        }}
                      >
                        {/* Status bar */}
                        <div className="flex justify-between items-center text-[8px] font-bold px-2 text-slate-500 mb-2">
                          <span>12:00 PM</span>
                          <span className="text-[9px]">RestoLoyalty 📶 🔋 100%</span>
                        </div>

                        {/* App header inside preview */}
                        <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200/50 shadow-sm flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            {localDesign.logoUrl ? (
                              <img referrerPolicy="no-referrer" src={localDesign.logoUrl} className="w-6 h-6 object-contain rounded" alt="" />
                            ) : (
                              <div className="w-6 h-6 rounded flex items-center justify-center font-black text-xs text-white" style={{ backgroundColor: localDesign.primaryColor }}>
                                {localDesign.logoText.charAt(0)}
                              </div>
                            )}
                            <div>
                              <h5 className="font-extrabold text-[10px] leading-none uppercase text-ink" style={{ fontFamily: `"${localDesign.fontHeadings}", sans-serif` }}>{localDesign.logoText || 'CRM RESTO'}</h5>
                              <p className="text-[6px] tracking-widest text-slate-400 uppercase mt-0.5">{localDesign.logoSubtitle || 'Loyalty'}</p>
                            </div>
                          </div>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: localDesign.primaryColor }} />
                        </div>

                        {/* Interactive Banner slider mockup inside phone */}
                        <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pb-12">
                          {localDesign.banners.length > 0 && (
                            <div 
                              className="rounded-2xl p-4 text-white relative overflow-hidden shadow-md flex flex-col justify-between"
                              style={{ 
                                backgroundColor: localDesign.banners[activeBannerIndex]?.bgColor || '#7c2d12',
                                color: localDesign.banners[activeBannerIndex]?.textColor || '#ffedd5',
                                minHeight: '130px'
                              }}
                            >
                              <div className="relative z-10">
                                <h4 className="text-xs font-black uppercase tracking-tight" style={{ fontFamily: `"${localDesign.fontHeadings}", sans-serif` }}>
                                  {localDesign.banners[activeBannerIndex]?.title}
                                </h4>
                                <p className="text-[8px] opacity-90 mt-1">
                                  {localDesign.banners[activeBannerIndex]?.subtitle}
                                </p>
                              </div>

                              <div className="flex justify-between items-end mt-4 relative z-10">
                                <span className="text-[7px] bg-white/20 px-2 py-1 rounded font-bold uppercase tracking-wider backdrop-blur-sm">
                                  {localDesign.banners[activeBannerIndex]?.buttonText}
                                </span>
                                <span className="text-[7px] opacity-50 font-mono">Promo {activeBannerIndex + 1}/{localDesign.banners.length}</span>
                              </div>

                              {/* Abstract shape */}
                              <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-30 pointer-events-none">
                                {localDesign.banners[activeBannerIndex]?.imageUrl && (
                                  <img referrerPolicy="no-referrer" src={localDesign.banners[activeBannerIndex]?.imageUrl} className="w-full h-full object-cover rounded-l-full" alt="" />
                                )}
                              </div>
                            </div>
                          )}

                          {/* App main Points Card inside phone */}
                          <div className="rounded-2xl p-4 text-white relative overflow-hidden flex flex-col justify-between" style={{ backgroundColor: localDesign.primaryColor, borderRadius: localDesign.radiusMd }}>
                            <div>
                              <p className="text-[7px] uppercase font-bold tracking-widest opacity-80">Saldo Actual Fidelidad</p>
                              <p className="text-3xl font-black italic mt-1" style={{ fontFamily: `"${localDesign.fontHeadings}", sans-serif` }}>7.450 <span className="text-xs uppercase font-normal tracking-tighter">pts</span></p>
                            </div>
                            <div className="flex justify-between text-[6px] uppercase tracking-wider opacity-60 mt-4">
                              <span>Socio Preferred</span>
                              <span>DNI: 34.567.890</span>
                            </div>
                          </div>

                          {/* Quick Bento card list mock */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white rounded-xl p-3 border border-slate-200/50 shadow-sm" style={{ borderRadius: localDesign.radiusSm }}>
                              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Premio Especial</p>
                              <p className="font-extrabold text-[10px] text-ink mt-1">Café de la casa</p>
                              <p className="text-[8px] font-black italic mt-1 text-slate-400">100 Pts</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-slate-200/50 shadow-sm" style={{ borderRadius: localDesign.radiusSm }}>
                              <p className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Siguiente Nivel</p>
                              <p className="font-extrabold text-[10px] text-ink mt-1">Gold VIP</p>
                              <div className="w-full bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: '75%', backgroundColor: localDesign.primaryColor }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Navigation Tab Bar Mockup inside phone */}
                        <div className="bg-white p-2 rounded-xl border border-slate-200/50 shadow-lg flex justify-around items-center text-[7px] font-black uppercase text-slate-400">
                          <span className="text-ink flex flex-col items-center gap-0.5">
                            <Home size={10} style={{ color: localDesign.primaryColor }} />
                            Inicio
                          </span>
                          <span className="flex flex-col items-center gap-0.5">
                            <Gift size={10} />
                            Premios
                          </span>
                          <span className="flex flex-col items-center gap-0.5">
                            <User size={10} />
                            Perfil
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Client Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-slate-200 p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setShowEditModal(false)}
                className="absolute top-6 right-6 text-slate-300 hover:text-love transition-colors"
              >
                <X size={24} />
              </button>

              <h3 className="text-xl font-black mb-6 uppercase tracking-tight italic text-ink">Editar <span className="text-love">Cliente</span></h3>
              <form onSubmit={handleUpdateClient} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink" 
                    value={editClientForm.fullName} 
                    onChange={e => setEditClientForm({...editClientForm, fullName: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">DNI (sin puntos)</label>
                    <input 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink" 
                      value={editClientForm.dni} 
                      onChange={e => setEditClientForm({...editClientForm, dni: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha de Nacimiento</label>
                    <input 
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink" 
                      value={editClientForm.birthDate} 
                      onChange={e => setEditClientForm({...editClientForm, birthDate: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                  <input 
                    type="email"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink" 
                    value={editClientForm.email} 
                    onChange={e => setEditClientForm({...editClientForm, email: e.target.value})} 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-ink text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-ink/20 mt-4 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border border-slate-200 p-8 rounded-[2rem] w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 text-slate-300 hover:text-love transition-colors"
              >
                <X size={24} />
              </button>

              <h3 className="text-xl font-black mb-6 uppercase tracking-tight italic text-ink">Nuevo <span className="text-love">Cliente</span></h3>
              <form onSubmit={handleManualAdd} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nombre Completo</label>
                  <input 
                    required
                    placeholder="Ej: Juan Pérez" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink" 
                    value={newClient.fullName} 
                    onChange={e => setNewClient({...newClient, fullName: e.target.value})} 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">DNI (sin puntos)</label>
                    <input 
                      required
                      placeholder="Ej: 37657683" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink" 
                      value={newClient.dni} 
                      onChange={e => setNewClient({...newClient, dni: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fecha de Nacimiento</label>
                    <input 
                      type="date"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink" 
                      value={newClient.birthDate} 
                      onChange={e => setNewClient({...newClient, birthDate: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                    <input 
                      type="email"
                      required
                      placeholder="cliente@ejemplo.com" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink" 
                      value={newClient.email} 
                      onChange={e => setNewClient({...newClient, email: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Contraseña</label>
                    <input 
                      type="password"
                      required
                      placeholder="Min. 6 carac." 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-love text-ink" 
                      value={newClient.password} 
                      onChange={e => setNewClient({...newClient, password: e.target.value})} 
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-love text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-love/20 mt-4 disabled:opacity-50"
                >
                  {loading ? 'Agregando...' : 'Registrar Cliente'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
