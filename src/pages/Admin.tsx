import React, { useEffect, useState } from 'react';
import { supabase, createIsolatedClient } from '@/src/lib/supabase';
import { Profile, Prize, Transaction, SystemSettings } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Gift, Settings, Search, Plus, Trash2, Pencil, Calendar, Award, History, DollarSign, Upload, Image as ImageIcon, FileSpreadsheet, UserPlus, X, Palette, Home, User, Star, MessageSquare, FileText, HelpCircle, LogOut, MapPin, ChevronLeft, ChevronRight, Package, Moon, Sun, Bell, Send } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import * as XLSX from 'xlsx';
import { useDesign, COLOR_PRESETS, CORNER_PRESETS, AVAILABLE_FONTS, type DesignConfig, type BannerConfig } from '@/src/components/DesignEngine';
import { useAuth, useTheme } from '@/src/App';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts';
import { 
  getRoles, 
  saveRoles, 
  getPermissions, 
  savePermissions, 
  getCustomUsers, 
  saveCustomUsers,
  type CustomUser,
  type CustomRole,
  type CustomPermission
} from '@/src/lib/permissions';

export function Admin() {
  const { isSimulatingClient, setIsSimulatingClient, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'prizes' | 'combos' | 'staff' | 'history' | 'settings' | 'design' | 'feedback' | 'notifications' | 'autonotif'>('dashboard');

  // Notificaciones (avisos)
  const [notifForm, setNotifForm] = useState({ title: '', message: '', target: 'all', clientId: '', alsoEmail: false });
  const [notifSending, setNotifSending] = useState(false);
  const [notifClientSearch, setNotifClientSearch] = useState('');
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);

  // Config de avisos automáticos (Grupo 2) — se edita y guarda en designConfig
  const defaultAutoNotif = {
    birthday: { enabled: true, message: '¡Feliz cumple, {nombre}! Que tengas un día genial. Te esperamos en CRAFT.', giftPoints: 0 },
    comboExpiring: { enabled: true, message: '¡Atención {nombre}! A tu combo "{combo}" le quedan {dias} días para usarlo. ¡Te esperamos en CRAFT!', daysBefore: 7 },
    inactive: { enabled: true, message: 'Hace tiempo que no te vemos, {nombre}. ¡Volvé a CRAFT y seguí sumando puntos!', daysInactive: 60, giftPoints: 0 },
    levelUp: { enabled: true, message: '¡Felicitaciones {nombre}! Subiste a la categoría {categoria}. ¡Gracias por ser parte de CRAFT!', giftPoints: 0 }
  };
  const [autoNotifForm, setAutoNotifForm] = useState<any>(defaultAutoNotif);
  const [autoNotifSaving, setAutoNotifSaving] = useState(false);

  // Campañas por fecha
  const [campaignForm, setCampaignForm] = useState({ title: '', message: '', send_date: '', target: 'all', channel: 'both', yearly: false });
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignsList, setCampaignsList] = useState<any[]>([]);
  
  // Custom permissions module states
  const [staffSubTab, setStaffSubTab] = useState<'usuarios' | 'roles' | 'permisos'>('usuarios');
  const [customUsersList, setCustomUsersList] = useState<CustomUser[]>(() => getCustomUsers());
  const [showAddCustomUserModal, setShowAddCustomUserModal] = useState(false);
  const [newCustomUser, setNewCustomUser] = useState({
    email: '',
    password: '',
    fullName: '',
    dni: '',
    role: 'waiter',
    birthDate: ''
  });

  const [customRolesList, setCustomRolesList] = useState<CustomRole[]>(() => getRoles());
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [newRoleForm, setNewRoleForm] = useState({
    id: '',
    name: '',
    permissions: [] as string[]
  });

  const [customPermissionsList, setCustomPermissionsList] = useState<CustomPermission[]>(() => getPermissions());
  const [showAddPermissionModal, setShowAddPermissionModal] = useState(false);
  const [newPermissionForm, setNewPermissionForm] = useState({
    id: '',
    name: '',
    description: ''
  });
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Profile[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
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
  // Nombres de sucursales para los filtros de reportes (todas, activas e inactivas,
  // para poder filtrar historiales de sucursales ya cerradas).
  const branchNames = (designConfig.branches || []).map(b => b.name);
  const [localDesign, setLocalDesign] = useState<DesignConfig | null>(null);
  const [pointsExpirationMonths, setPointsExpirationMonths] = useState<number>(3);
  const [categoryInactivityDays, setCategoryInactivityDays] = useState<number>(60);
  const [localLoyaltyTiers, setLocalLoyaltyTiers] = useState<any[]>([]);
  const [savingDesign, setSavingDesign] = useState(false);
  const [designSubSection, setDesignSubSection] = useState<'branding' | 'styling' | 'colors' | 'banners' | 'css'>('branding');
  const [activeBannerIndex, setActiveBannerIndex] = useState<number>(0);

  // Dynamic Settings / Ajustes tabs
  const [settingsSubTab, setSettingsSubTab] = useState<'points' | 'help' | 'branches'>('points');
  
  // FAQs form editing states
  const [editingFaqIndex, setEditingFaqIndex] = useState<number | null>(null);
  const [faqForm, setFaqForm] = useState({ q: '', a: '', category: 'General' });
  const [localTermsText, setLocalTermsText] = useState('');
  
  // Branches form editing states
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [branchForm, setBranchForm] = useState({
    id: '',
    name: '',
    address: '',
    city: 'Paraná',
    province: 'Entre Ríos',
    phone: '',
    hoursWeekday: '07:30 a 21:30 hs',
    hoursWeekend: '08:30 a 21:00 hs',
    specialty: '',
    features: [] as string[],
    coordinates: '',
    imageUrl: '',
    googleMapsUrl: '',
    active: true
  });
  const [newFeatureText, setNewFeatureText] = useState('');

  // Combos form editing states
  const [editingComboId, setEditingComboId] = useState<string | null>(null);
  const [comboForm, setComboForm] = useState({
    id: '',
    title: '',
    description: '',
    price: 65000,
    normalPrice: 80000,
    totalUses: 5,
    imageUrl: '',
    isActive: true,
    expirationDays: 30
  });

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Sincronizar bases y condiciones y reglas de lealtad cuando la configuración cargue
  useEffect(() => {
    if (designConfig?.terms) {
      setLocalTermsText(designConfig.terms);
    }
    if (designConfig) {
      if (designConfig.pointsExpirationMonths !== undefined) {
        setPointsExpirationMonths(designConfig.pointsExpirationMonths);
      }
      if (designConfig.categoryInactivityDays !== undefined) {
        setCategoryInactivityDays(designConfig.categoryInactivityDays);
      }
      if (designConfig.loyaltyTiers) {
        setLocalLoyaltyTiers(JSON.parse(JSON.stringify(designConfig.loyaltyTiers)));
      }
    }
  }, [designConfig]);

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

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen es muy pesada (máx 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (localDesign) {
        const updated = [...localDesign.banners];
        updated[index] = {
          ...updated[index],
          imageUrl: reader.result as string
        };
        setLocalDesign({ ...localDesign, banners: updated });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBranchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen es muy pesada (máx 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBranchForm(prev => ({
        ...prev,
        imageUrl: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleComboFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen es muy pesada (máx 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setComboForm(prev => ({
        ...prev,
        imageUrl: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
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
    } else if (activeTab === 'notifications') {
      fetchSentNotifications();
      fetchCampaigns();
      void fetchData(); // para tener la lista de clientes disponible
    } else if (activeTab === 'autonotif') {
      // Cargar la config guardada (o defaults) en el formulario
      const saved = (designConfig as any)?.autoNotif;
      if (saved) {
        setAutoNotifForm({
          birthday: { ...defaultAutoNotif.birthday, ...(saved.birthday || {}) },
          comboExpiring: { ...defaultAutoNotif.comboExpiring, ...(saved.comboExpiring || {}) },
          inactive: { ...defaultAutoNotif.inactive, ...(saved.inactive || {}) },
          levelUp: { ...defaultAutoNotif.levelUp, ...(saved.levelUp || {}) }
        });
      }
    } else if (activeTab === 'design' || activeTab === 'combos') {
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

      if (designConfig) {
        const updatedDesign = {
          ...designConfig,
          pointsExpirationMonths,
          categoryInactivityDays,
          loyaltyTiers: localLoyaltyTiers
        };
        await saveDesignConfig(updatedDesign);
      }

      alert("Configuración de puntos y reglas de lealtad actualizada correctamente");
    } catch (err: any) {
      alert("Error actualizando configuración: " + err.message);
    } finally {
      setUpdatingSettings(false);
    }
  };

  const safeSetItem = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e: any) {
      console.warn(`[LocalStorage] No se pudo guardar en caché el elemento "${key}" porque se superó la cuota de espacio disponible:`, e);
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
        else if (activeTab === 'feedback') setFeedbacks(parsed);
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
          safeSetItem(cacheKey, JSON.stringify(filtered));
        }
      } else if (activeTab === 'prizes') {
        const { data, error } = await supabase
          .from('catalogo_premios')
          .select('*')
          .order('points_cost', { ascending: true });
        
        if (error) throw error;
        
        setPrizes(data || []);
        safeSetItem(cacheKey, JSON.stringify(data || []));
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
        safeSetItem(cacheKey, JSON.stringify(filtered));
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
          safeSetItem(cacheKey, JSON.stringify(flatData || []));
        } else {
          setAllTransactions(data || []);
          safeSetItem(cacheKey, JSON.stringify(data || []));
        }
      } else if (activeTab === 'feedback') {
        let remoteFeedbacks: any[] = [];
        let remoteOk = false;
        try {
          const { data, error } = await supabase
            .from('program_feedback')
            .select('*')
            .order('created_at', { ascending: false });
          if (!error && data) {
            remoteFeedbacks = data;
            remoteOk = true;
          }
        } catch (e) {
          console.log("No program_feedback table, falling back to local cache");
        }

        if (remoteOk) {
          // La base respondio: es la fuente de verdad. No mezclamos cache vieja
          // ni sembramos comentarios de prueba.
          setFeedbacks(remoteFeedbacks);
          safeSetItem(cacheKey, JSON.stringify(remoteFeedbacks));
        } else {
          // La base no respondio (tabla aun no creada): mostramos lo cacheado real,
          // sin inventar comentarios de prueba.
          const localCached = localStorage.getItem('local_program_feedback');
          let localFeedbacks: any[] = [];
          if (localCached) {
            try {
              localFeedbacks = JSON.parse(localCached);
            } catch (e) {
              console.error("Local feedback parse error:", e);
            }
          }
          localFeedbacks.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setFeedbacks(localFeedbacks);
          safeSetItem(cacheKey, JSON.stringify(localFeedbacks));
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

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta valoración?")) return;
    try {
      await supabase.from('program_feedback').delete().eq('id', id);
    } catch (e) {
      console.warn("Could not delete from remote table", e);
    }
    try {
      const existingStr = localStorage.getItem('local_program_feedback');
      if (existingStr) {
        const parsed = JSON.parse(existingStr);
        const filtered = parsed.filter((f: any) => f.id !== id);
        safeSetItem('local_program_feedback', JSON.stringify(filtered));
      }
    } catch (e) {
      console.error(e);
    }
    setFeedbacks(prev => prev.filter(f => f.id !== id));
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

  const fetchSentNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) setSentNotifications(data);
    } catch (e) {
      console.warn('Error cargando notificaciones enviadas:', e);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifForm.title.trim() || !notifForm.message.trim()) {
      alert('Escribí un título y un mensaje.');
      return;
    }
    if (notifForm.target === 'one' && !notifForm.clientId) {
      alert('Elegí un cliente destinatario.');
      return;
    }
    setNotifSending(true);
    try {
      const row = {
        client_id: notifForm.target === 'all' ? null : notifForm.clientId,
        title: notifForm.title.trim(),
        message: notifForm.message.trim()
      };
      const { error } = await supabase.from('notifications').insert([row]);
      if (error) throw error;

      // Envío opcional por email
      let emailNote = '';
      if (notifForm.alsoEmail) {
        try {
          let recipients: string[] = [];
          if (notifForm.target === 'all') {
            recipients = clients
              .map(c => (c.email || '').trim())
              .filter(e => e && e.includes('@'));
          } else {
            const c = clients.find(cl => cl.id === notifForm.clientId);
            if (c?.email) recipients = [c.email.trim()];
          }

          if (recipients.length === 0) {
            emailNote = ' (No se enviaron emails: no había direcciones válidas)';
          } else {
            const resp = await fetch('/api/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: recipients,
                subject: notifForm.title.trim(),
                message: notifForm.message.trim()
              })
            });
            const data = await resp.json();
            if (resp.ok) {
              emailNote = ` (Emails enviados: ${data.sent})`;
            } else {
              emailNote = ` (Aviso guardado, pero el email falló: ${data.error || 'error desconocido'})`;
            }
          }
        } catch (mailErr: any) {
          emailNote = ` (Aviso guardado, pero el email falló: ${mailErr?.message || 'error'})`;
        }
      }

      alert((notifForm.target === 'all'
        ? '¡Aviso enviado a todos los clientes!'
        : '¡Aviso enviado al cliente seleccionado!') + emailNote);
      setNotifForm({ title: '', message: '', target: 'all', clientId: '', alsoEmail: false });
      setNotifClientSearch('');
      fetchSentNotifications();
    } catch (err: any) {
      alert('Error al enviar el aviso: ' + (err?.message || err));
    } finally {
      setNotifSending(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data } = await supabase.from('campaigns').select('*').order('send_date', { ascending: true });
      if (data) setCampaignsList(data);
    } catch (e) { console.warn('Error cargando campañas:', e); }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.title.trim() || !campaignForm.message.trim() || !campaignForm.send_date) {
      alert('Completá título, mensaje y fecha.');
      return;
    }
    setCampaignSaving(true);
    try {
      const { error } = await supabase.from('campaigns').insert([{
        title: campaignForm.title.trim(),
        message: campaignForm.message.trim(),
        send_date: campaignForm.send_date,
        target: campaignForm.target,
        channel: campaignForm.channel,
        yearly: campaignForm.yearly
      }]);
      if (error) throw error;
      alert('¡Campaña programada!');
      setCampaignForm({ title: '', message: '', send_date: '', target: 'all', channel: 'both', yearly: false });
      fetchCampaigns();
    } catch (err: any) {
      alert('Error al crear la campaña: ' + (err?.message || err));
    } finally {
      setCampaignSaving(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña programada?')) return;
    try {
      await supabase.from('campaigns').delete().eq('id', id);
      fetchCampaigns();
    } catch (err: any) {
      alert('Error al eliminar: ' + (err?.message || err));
    }
  };

  const handleSaveAutoNotif = async () => {
    setAutoNotifSaving(true);
    try {
      await saveDesignConfig({ ...designConfig, autoNotif: autoNotifForm } as any);
      alert('¡Configuración de avisos automáticos guardada!');
    } catch (err: any) {
      alert('Error al guardar: ' + (err?.message || err));
    } finally {
      setAutoNotifSaving(false);
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
    <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start w-full">
      {/* Menú Lateral Izquierdo (Admin Sidebar) */}
      <div className={cn(
        "shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-5 lg:sticky lg:top-6 transition-all duration-300",
        isSidebarExpanded 
          ? "w-full lg:w-64 xl:w-72 p-5 rounded-2xl" 
          : "w-full lg:w-20 p-4 rounded-2xl"
      )}>
        <div className={cn(
          "flex items-center justify-between",
          !isSidebarExpanded && "lg:flex-col lg:gap-3 lg:items-center"
        )}>
          {isSidebarExpanded ? (
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic text-ink dark:text-white">
                CLUB <span className="text-love">CRAFT</span>
              </h2>
              <p className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-slate-400 font-bold font-mono">
                Panel Administrativo
              </p>
            </div>
          ) : (
            <div className="w-10 h-10 bg-love rounded-xl flex items-center justify-center font-black text-lg text-white shadow-lg shadow-love/20 lg:mx-auto">
              C
            </div>
          )}
          
          <button
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-400 dark:text-slate-400 transition-colors border-none cursor-pointer flex items-center justify-center"
            title={isSidebarExpanded ? "Minimizar Menú" : "Expandir Menú"}
          >
            {isSidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
        
        <button
          onClick={() => {
            setIsSimulatingClient(true);
            window.location.hash = '#/';
          }}
          className={cn(
            "flex items-center justify-center bg-slate-950 hover:bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 text-white transition-all shadow-lg shadow-slate-950/15 active:scale-95 cursor-pointer",
            isSidebarExpanded 
              ? "w-full gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl" 
              : "w-11 h-11 p-0 rounded-xl lg:mx-auto"
          )}
          title="Ver la aplicación exactamente como la ve un cliente"
        >
          <User size={13} className="text-love animate-pulse" />
          {isSidebarExpanded && <span>Vista Cliente</span>}
        </button>

        <button
          onClick={() => {
            // No simulamos rol: el admin solo navega a la pantalla del mozo
            // para ver exactamente lo que el mozo usa. Vuelve al panel cuando quiera.
            setIsSimulatingClient(false);
            window.location.hash = '#/waiter';
          }}
          className={cn(
            "flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-ink dark:text-white transition-all shadow-sm active:scale-95 cursor-pointer mt-2",
            isSidebarExpanded
              ? "w-full gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl"
              : "w-11 h-11 p-0 rounded-xl lg:mx-auto"
          )}
          title="Ver la pantalla de carga de puntos tal como la usa el mozo"
        >
          <UserPlus size={13} className="text-love" />
          {isSidebarExpanded && <span>Vista Mozo</span>}
        </button>

        <div className={cn(
          "flex flex-row lg:flex-col p-1 lg:p-0 bg-slate-100 dark:bg-slate-950 lg:bg-transparent rounded-2xl border border-slate-200 dark:border-slate-800 lg:border-none overflow-x-auto lg:overflow-x-visible scrollbar-hide lg:w-full",
          isSidebarExpanded ? "lg:space-y-1" : "lg:space-y-3 lg:items-center"
        )}>
          {(() => {
            const labels: Record<string, string> = {
              dashboard: 'Dashboard',
              clients: 'Clientes',
              prizes: 'Premios',
              combos: 'Combos Prepago',
              staff: 'Staff',
              history: 'Movimientos',
              notifications: 'Notificaciones',
              autonotif: 'Avisos Automáticos',
              settings: 'Ajustes',
              design: 'Diseño',
              feedback: 'Opiniones'
            };
            const icons: Record<string, React.ReactNode> = {
              dashboard: <Award size={14} />,
              clients: <Users size={14} />,
              prizes: <Gift size={14} />,
              combos: <Package size={14} />,
              staff: <UserPlus size={14} />,
              history: <History size={14} />,
              notifications: <Bell size={14} />,
              autonotif: <Calendar size={14} />,
              settings: <Settings size={14} />,
              design: <Palette size={14} />,
              feedback: <MessageSquare size={14} />
            };
            // Menú agrupado por secciones (estilo sistema de gestión)
            const groups: { title: string; tabs: string[] }[] = [
              { title: 'General', tabs: ['dashboard', 'clients', 'history'] },
              { title: 'Programa', tabs: ['prizes', 'combos', 'feedback'] },
              { title: 'Comunicación', tabs: ['notifications', 'autonotif'] },
              { title: 'Configuración', tabs: ['staff', 'settings', 'design'] }
            ];

            const renderBtn = (tab: string) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "flex items-center rounded-lg text-[10px] md:text-[13px] font-bold tracking-wide transition-all whitespace-nowrap font-mono",
                  isSidebarExpanded
                    ? "gap-2.5 px-3 lg:px-4 py-2 lg:py-2.5 lg:w-full lg:justify-start"
                    : "justify-center p-3 lg:w-12 lg:h-12 lg:mx-auto",
                  activeTab === tab
                    ? "bg-love text-white shadow-md shadow-love/25"
                    : "text-slate-500 dark:text-slate-400 hover:text-ink dark:hover:text-white lg:hover:bg-slate-100 lg:dark:hover:bg-slate-800/50"
                )}
                title={labels[tab]}
              >
                {icons[tab]}
                {isSidebarExpanded && <span>{labels[tab]}</span>}
              </button>
            );

            // En móvil (fila horizontal) o menú colapsado: lista plana sin títulos
            return (
              <>
                {groups.map((g, gi) => (
                  <div key={g.title} className={cn("contents lg:block", isSidebarExpanded ? "lg:mb-2" : "")}>
                    {isSidebarExpanded && (
                      <p className={cn(
                        "hidden lg:block text-[8px] uppercase tracking-[0.2em] font-black text-slate-300 dark:text-slate-600 px-4 mb-1",
                        gi > 0 && "mt-3"
                      )}>
                        {g.title}
                      </p>
                    )}
                    {g.tabs.map(renderBtn)}
                  </div>
                ))}
              </>
            );
          })()}
        </div>

        {/* Acciones inferiores: modo oscuro y cerrar sesión (antes estaban en la barra superior) */}
        <div className={cn(
          "hidden lg:flex flex-col gap-1.5 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800",
          !isSidebarExpanded && "items-center"
        )}>
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center rounded-xl text-[10px] md:text-sm font-black uppercase tracking-wider transition-all whitespace-nowrap text-slate-405 dark:text-slate-400 hover:text-ink dark:hover:text-white lg:hover:bg-slate-50 lg:dark:hover:bg-slate-800/50",
              isSidebarExpanded
                ? "gap-2.5 px-4 lg:px-5 py-2.5 lg:py-3.5 lg:w-full lg:justify-start"
                : "justify-center p-3 lg:w-12 lg:h-12"
            )}
            title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            {isSidebarExpanded && <span>{theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}</span>}
          </button>
          <button
            onClick={signOut}
            className={cn(
              "flex items-center rounded-xl text-[10px] md:text-sm font-black uppercase tracking-wider transition-all whitespace-nowrap text-rose-500 hover:text-white hover:bg-rose-500",
              isSidebarExpanded
                ? "gap-2.5 px-4 lg:px-5 py-2.5 lg:py-3.5 lg:w-full lg:justify-start"
                : "justify-center p-3 lg:w-12 lg:h-12"
            )}
            title="Cerrar Sesión"
          >
            <LogOut size={14} />
            {isSidebarExpanded && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Área de Contenido Principal - Derecha */}
      <div className="flex-1 w-full space-y-6">
        {/* Encabezado de sección (estilo sistema de gestión) */}
        {(() => {
          const heads: Record<string, { t: string; s: string }> = {
            dashboard: { t: 'Dashboard', s: 'Resumen de ventas, canjes y clientes' },
            clients: { t: 'Clientes', s: 'Base de datos de miembros del programa' },
            prizes: { t: 'Premios', s: 'Catálogo de premios canjeables' },
            combos: { t: 'Combos Prepago', s: 'Productos prepagos y abonos' },
            staff: { t: 'Staff', s: 'Control de accesos y permisos' },
            history: { t: 'Movimientos', s: 'Registro de transacciones' },
            notifications: { t: 'Notificaciones', s: 'Avisos manuales y campañas' },
            autonotif: { t: 'Avisos Automáticos', s: 'Cumpleaños, vencimientos e inactividad' },
            settings: { t: 'Ajustes', s: 'Configuración general del programa' },
            design: { t: 'Diseño', s: 'Apariencia y contenido de la app' },
            feedback: { t: 'Opiniones', s: 'Valoraciones de los miembros' }
          };
          const h = heads[activeTab] || { t: '', s: '' };
          return (
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-2">
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic text-ink dark:text-white leading-none">{h.t}</h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold font-mono mt-1.5">{h.s}</p>
            </div>
          );
        })()}
        {loading ? (
          <div className="py-20 text-center animate-pulse text-slate-450 dark:text-slate-505 uppercase font-black tracking-widest text-[10px] italic bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm">Cargando datos del panel...</div>
        ) : (
          <>
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Grid de Métricas Rápidas (arriba) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Recaudado</p>
                  <p className="text-lg font-black text-ink mt-1 font-mono">
                    ${dashboardData.filteredTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0).toLocaleString('es-AR')}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Puntos Emitidos</p>
                  <p className="text-lg font-black text-love mt-1 font-mono">
                    {dashboardData.filteredTransactions.reduce((acc, tx) => acc + (tx.points_earned || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Prom Ticket</p>
                  <p className="text-lg font-black text-ink mt-1 font-mono">
                    ${dashboardData.filteredTransactions.length > 0 ? (dashboardData.filteredTransactions.reduce((acc, tx) => acc + (tx.amount || 0), 0) / dashboardData.filteredTransactions.length).toLocaleString('es-AR', { maximumFractionDigits: 0 }) : '0'}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                   <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Transacciones</p>
                   <p className="text-lg font-black text-ink mt-1 font-mono">{dashboardData.filteredTransactions.length}</p>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap gap-2 items-center">
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
                    {branchNames.map(branch => (
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

                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
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
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-ink flex items-center gap-2">
                       <Award size={16} className="text-love" />
                       Ranking de Ventas (Top Clientes)
                    </h3>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.clientData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          angle={-25}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          type="number"
                          tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v: number) => `$${(v / 1000).toLocaleString('es-AR')}k`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 800 }}
                          formatter={(val: number) => [`$${val.toLocaleString('es-AR')}`, 'Total Gastado']}
                        />
                        <Bar dataKey="total" fill="#FF4757" radius={[4, 4, 0, 0]} barSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
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

                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm md:col-span-2">
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
            </div>
          )}
          {activeTab === 'clients' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-love text-white p-6 rounded-xl flex items-center justify-between shadow-sm hover:scale-[1.02] transition-all"
                >
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Nuevo</p>
                    <h4 className="text-xl font-black italic">Cliente Manual</h4>
                  </div>
                  <UserPlus size={32} />
                </button>

                <div className="relative group overflow-hidden bg-ink text-white p-6 rounded-xl flex items-center justify-between shadow-sm hover:scale-[1.02] transition-all cursor-pointer">
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

                <div className="bg-white p-6 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total en Base</p>
                    <h4 className="text-xl font-black italic text-ink">{clients.length} Clientes</h4>
                  </div>
                  <Users size={32} className="text-slate-200" />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
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
              <div className="md:col-span-1 bg-white rounded-xl p-6 border border-slate-100 shadow-sm h-fit">
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
                  <div className="bg-white p-12 rounded-xl border border-dashed border-slate-200 text-center shadow-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 italic">No hay premios cargados</p>
                    <p className="text-[10px] text-slate-300 max-w-xs mx-auto font-bold uppercase tracking-tight">Si no puedes agregar, consulta con soporte técnico de Supabase.</p>
                  </div>
                )}
                {prizes.map(prize => (
                  <div key={prize.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 group transition-all shadow-sm">
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
                    CLUB CRAFT v1.0.6-FIX-DATABASE • DB Status: Connected
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'combos' && (
            <div className="w-full space-y-6">
              <div className="space-y-8 text-left animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-6">
                  <h4 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-love animate-ping" />
                    Gestión de Combos Prepago
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">
                    Ofrece a tus clientes paquetes de productos prepagos (Pases o Tarjetas de Abono) que pueden comprar desde la app y consumir gradualmente.
                  </p>

                  {/* Combos Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {((designConfig as any).combos || []).map((combo: any) => (
                      <div key={combo.id} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-4">
                        <div className="flex gap-4">
                          {combo.imageUrl ? (
                            <img src={combo.imageUrl} alt={combo.title} className="w-20 h-20 rounded-2xl object-cover shrink-0 animate-in fade-in zoom-in-50" />
                          ) : (
                            <div className="w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">Sin Foto</div>
                          )}
                          <div className="space-y-1 align-top">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
                                combo.isActive ? "bg-green-500/10 text-green-500" : "bg-slate-200 text-slate-400 dark:bg-slate-800"
                              )}>
                                {combo.isActive ? 'Activo' : 'Pausado'}
                              </span>
                              <span className="text-[8px] bg-love/10 text-love px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{combo.totalUses} Usos</span>
                            </div>
                            <h5 className="text-xs font-black text-ink dark:text-white uppercase tracking-tight">{combo.title}</h5>
                            <p className="text-[10px] text-slate-400 font-semibold line-clamp-2 leading-relaxed">{combo.description}</p>
                            <p className="text-xs font-black text-love">${combo.price.toLocaleString('es-AR')}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingComboId(combo.id);
                              setComboForm({ ...combo, expirationDays: (combo as any).expirationDays || 30, normalPrice: (combo as any).normalPrice || combo.price });
                            }}
                            className="flex-1 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-ink dark:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border-none"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`¿Estás seguro de eliminar el combo "${combo.title}"?`)) {
                                const updatedCombos = ((designConfig as any).combos || []).filter((c: any) => c.id !== combo.id);
                                const updated = { ...designConfig, combos: updatedCombos };
                                await saveDesignConfig(updated);
                                alert("Combo eliminado exitosamente");
                              }
                            }}
                            className="py-2 px-3 bg-red-500/10 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border-none"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Combos Form */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800 mt-6 text-left">
                    <h4 className="text-xs font-black uppercase tracking-widest text-love mb-6">
                      {editingComboId ? `✏️ Editar Combo: ${comboForm.title}` : '✨ Crear Nuevo Combo Prepago'}
                    </h4>

                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const updatedCombos = [...((designConfig as any).combos || [])];
                        if (editingComboId) {
                          const idx = updatedCombos.findIndex((c: any) => c.id === editingComboId);
                          if (idx !== -1) updatedCombos[idx] = comboForm;
                        } else {
                          const newCombo = {
                            ...comboForm,
                            id: 'combo-' + Date.now()
                          };
                          updatedCombos.push(newCombo);
                        }

                        const updated = { ...designConfig, combos: updatedCombos };
                        await saveDesignConfig(updated);
                        alert(editingComboId ? "Combo actualizado correctamente" : "Combo creado exitosamente");

                        // Reset Form
                        setEditingComboId(null);
                        setComboForm({
                          id: '',
                          title: '',
                          description: '',
                          price: 65000,
                          normalPrice: 80000,
                          totalUses: 5,
                          imageUrl: '',
                          isActive: true,
                          expirationDays: 30
                        });
                      }} 
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Título del Combo</label>
                          <input
                            required
                            placeholder="Ej: Pase 5 Almuerzos Mediodía"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-bold transition-all"
                            value={comboForm.title}
                            onChange={(e) => setComboForm({ ...comboForm, title: e.target.value })}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Precio Normal ($) — tachado</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="80000"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-bold transition-all"
                            value={comboForm.normalPrice}
                            onChange={(e) => setComboForm({ ...comboForm, normalPrice: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Precio con Descuento ($) — se cobra</label>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="65000"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-bold transition-all"
                            value={comboForm.price}
                            onChange={(e) => setComboForm({ ...comboForm, price: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Cantidad de Usos/Consumos</label>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="5"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-bold transition-all"
                            value={comboForm.totalUses}
                            onChange={(e) => setComboForm({ ...comboForm, totalUses: parseInt(e.target.value) || 1 })}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Vencimiento (días para consumir)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="30"
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-bold transition-all"
                            value={comboForm.expirationDays}
                            onChange={(e) => setComboForm({ ...comboForm, expirationDays: parseInt(e.target.value) || 1 })}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Estado</label>
                          <select
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-bold transition-all"
                            value={comboForm.isActive ? "true" : "false"}
                            onChange={(e) => setComboForm({ ...comboForm, isActive: e.target.value === "true" })}
                          >
                            <option value="true">Activo (Para Venta)</option>
                            <option value="false">Pausado (Inactivo / Ocultar)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Descripción corta y condiciones</label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Describe qué comidas o artículos incluye el combo, y si tiene restricciones horarias o de días..."
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-bold transition-all leading-relaxed"
                          value={comboForm.description}
                          onChange={(e) => setComboForm({ ...comboForm, description: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Foto Ilustrativa (Upload Directo)</label>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          {comboForm.imageUrl ? (
                            <img src={comboForm.imageUrl} alt="Vista previa del combo" className="w-24 h-24 rounded-2xl object-cover border border-slate-200 dark:border-slate-800" />
                          ) : (
                            <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-bold text-slate-400 text-xs text-center p-2 shrink-0">
                              Sin Imagen
                            </div>
                          )}
                          <div className="flex-1 space-y-2 w-full">
                            <div className="flex gap-2">
                              <label className="flex-1 py-3 px-4 bg-slate-250 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest text-center cursor-pointer transition-all border-none">
                                📂 Seleccionar FOTO del Combo
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={handleComboFileChange}
                                />
                              </label>
                            </div>
                            <input
                              placeholder="O introduce una URL de foto..."
                              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-[10px] outline-none focus:border-love text-ink dark:text-white font-semibold transition-all"
                              value={comboForm.imageUrl}
                              onChange={(e) => setComboForm({ ...comboForm, imageUrl: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-4">
                        <button
                          type="submit"
                          className="px-6 py-3 bg-love text-white rounded-xl text-xs uppercase font-black tracking-widest hover:scale-[1.02] transition-colors cursor-pointer border-none"
                        >
                          {editingComboId ? 'Guardar Cambios' : 'Crear Combo'}
                        </button>
                        {editingComboId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingComboId(null);
                              setComboForm({
                                id: '',
                                title: '',
                                description: '',
                                price: 65000,
                                normalPrice: 80000,
                                totalUses: 5,
                                imageUrl: '',
                                isActive: true,
                                expirationDays: 30
                              });
                            }}
                            className="px-6 py-3 bg-slate-200 dark:bg-slate-850 text-slate-500 rounded-xl text-xs uppercase font-black tracking-widest hover:bg-slate-350 cursor-pointer border-none"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staff' && (() => {
            const handleAddCustomUser = async (e: React.FormEvent) => {
              e.preventDefault();
              if (!newCustomUser.email || !newCustomUser.password || !newCustomUser.fullName || !newCustomUser.dni) {
                alert("Por favor, rellene todos los campos requeridos.");
                return;
              }

              const email = newCustomUser.email.trim();
              const dni = newCustomUser.dni.trim();
              const fullName = newCustomUser.fullName.trim();
              const role = newCustomUser.role;

              try {
                // Creamos el usuario REAL en Supabase con un cliente aislado,
                // para que la cuenta funcione desde cualquier dispositivo y sin
                // cerrar la sesión del admin.
                const iso = createIsolatedClient();
                const { data: authData, error: authError } = await iso.auth.signUp({
                  email,
                  password: newCustomUser.password,
                  options: { data: { full_name: fullName, dni } }
                });

                if (authError) {
                  alert("No se pudo crear la cuenta: " + authError.message);
                  return;
                }

                const userId = authData.user?.id;
                if (userId) {
                  // Guardamos el perfil con el rol elegido (mozo/staff/etc.)
                  const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                      id: userId,
                      full_name: fullName,
                      email,
                      dni,
                      role,
                      points: 0
                    }, { onConflict: 'id' });

                  if (profileError) {
                    alert("Cuenta creada pero el perfil falló: " + profileError.message);
                    return;
                  }
                }

                // Mantenemos la lista local solo para mostrarla en el panel.
                const newUserObj: CustomUser = {
                  id: userId || ('custom-' + Date.now()),
                  email,
                  password: newCustomUser.password,
                  full_name: fullName,
                  dni,
                  role,
                  birth_date: newCustomUser.birthDate || undefined,
                  created_at: new Date().toISOString()
                };
                const updated = [...customUsersList, newUserObj];
                setCustomUsersList(updated);
                saveCustomUsers(updated);

                setNewCustomUser({ email: '', password: '', fullName: '', dni: '', role: 'waiter', birthDate: '' });
                setShowAddCustomUserModal(false);
                alert("¡Cuenta creada! El usuario ya puede iniciar sesión desde cualquier dispositivo.");
              } catch (err: any) {
                alert("Error al crear la cuenta: " + (err?.message || err));
              }
            };

            const handleDeleteCustomUser = (userId: string) => {
              if (window.confirm("¿Está seguro de eliminar esta cuenta de usuario? Ya no podrá ingresar con estas credenciales.")) {
                const updated = customUsersList.filter(u => u.id !== userId);
                setCustomUsersList(updated);
                saveCustomUsers(updated);
              }
            };

            const handleCreateRole = (e: React.FormEvent) => {
              e.preventDefault();
              if (!newRoleForm.id || !newRoleForm.name) {
                alert("Por favor, ingrese ID de rol y nombre descriptivo.");
                return;
              }
              const cleanId = newRoleForm.id.toLowerCase().replace(/\s+/g, '-').trim();
              if (customRolesList.some(r => r.id === cleanId)) {
                alert("Ya existe un rol con este código ID de rol.");
                return;
              }
              const newRoleObj: CustomRole = {
                id: cleanId,
                name: newRoleForm.name.toUpperCase().trim(),
                permissions: newRoleForm.permissions
              };
              const updated = [...customRolesList, newRoleObj];
              setCustomRolesList(updated);
              saveRoles(updated);

              setNewRoleForm({ id: '', name: '', permissions: [] });
              setShowAddRoleModal(false);
            };

            const handleUpdateRolePermissions = (roleId: string, permId: string, enabled: boolean) => {
              const updated = customRolesList.map(r => {
                if (r.id === roleId) {
                  let perms = [...r.permissions];
                  if (enabled && !perms.includes(permId)) {
                    perms.push(permId);
                  } else if (!enabled) {
                    perms = perms.filter(p => p !== permId);
                  }
                  return { ...r, permissions: perms };
                }
                return r;
              });
              setCustomRolesList(updated);
              saveRoles(updated);
            };

            const handleCreatePermission = (e: React.FormEvent) => {
              e.preventDefault();
              if (!newPermissionForm.id || !newPermissionForm.name) {
                alert("Por favor, ingrese ID de permiso y nombre descriptivo.");
                return;
              }
              const cleanId = newPermissionForm.id.toLowerCase().replace(/\s+/g, '_').trim();
              if (customPermissionsList.some(p => p.id === cleanId)) {
                alert("Ya existe un permiso con este código ID.");
                return;
              }
              const newPermObj: CustomPermission = {
                id: cleanId,
                name: newPermissionForm.name.trim(),
                description: newPermissionForm.description.trim()
              };
              const updated = [...customPermissionsList, newPermObj];
              setCustomPermissionsList(updated);
              savePermissions(updated);

              setNewPermissionForm({ id: '', name: '', description: '' });
              setShowAddPermissionModal(false);
            };

            return (
              <div className="space-y-6">
                {/* Cabecera del Módulo con Sub-pestañas */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm dark:shadow-none">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter italic text-ink dark:text-white flex items-center gap-2">
                        Control de Accesos y Permisos
                      </h2>
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">
                        Usuarios directos, definición de Roles dinámicos y asignación de Permisos
                      </p>
                    </div>

                    {/* Botón dinámico según sub-pestaña */}
                    <div>
                      {staffSubTab === 'usuarios' && (
                        <button 
                          onClick={() => setShowAddCustomUserModal(true)}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-love text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-love/20 hover:scale-102 transition-all cursor-pointer border-none"
                        >
                          <UserPlus size={12} />
                          Crear Cuenta de Acceso
                        </button>
                      )}
                      {staffSubTab === 'roles' && (
                        <button 
                          onClick={() => setShowAddRoleModal(true)}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-love text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-love/20 hover:scale-102 transition-all cursor-pointer border-none"
                        >
                          <Plus size={12} />
                          Nuevo Rol
                        </button>
                      )}
                      {staffSubTab === 'permisos' && (
                        <button 
                          onClick={() => setShowAddPermissionModal(true)}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-love text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-love/20 hover:scale-102 transition-all cursor-pointer border-none"
                        >
                          <Plus size={12} />
                          Nuevo Permiso
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selector de Sub-pestañas */}
                  <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 mt-6 pb-1">
                    {(['usuarios', 'roles', 'permisos'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setStaffSubTab(tab)}
                        className={cn(
                          "px-4 py-2.5 rounded-t-xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all border-none cursor-pointer",
                          staffSubTab === tab
                            ? "bg-love text-white shadow-md shadow-love/10"
                            : "text-slate-400 bg-transparent hover:text-ink dark:hover:text-white"
                        )}
                      >
                        {tab === 'usuarios' && '👥 Usuarios y Cuentas'}
                        {tab === 'roles' && '🛡️ Roles del Sistema'}
                        {tab === 'permisos' && '🔑 Llaves de Permiso'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-pestaña 1: USUARIOS Y CUENTAS */}
                {staffSubTab === 'usuarios' && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm dark:shadow-none space-y-6">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white">Cuentas creadas por el Administrador</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-normal mt-0.5">Permiten acceso directo mediante email y contraseña sin pre-registro</p>
                    </div>

                    <div className="space-y-3">
                      {customUsersList.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay cuentas de acceso creadas directamente todavía.</p>
                        </div>
                      ) : (
                        customUsersList.map((user) => (
                          <div key={user.id} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black uppercase tracking-tight text-ink dark:text-white text-xs">{user.full_name}</p>
                                <span className="text-[8px] font-black uppercase tracking-widest bg-love/15 text-love border border-love/20 px-2 py-0.5 rounded-full">
                                  CON CONTRASEÑA
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[10px] text-slate-400">
                                <span>📧 {user.email}</span>
                                <span>💳 DNI: {user.dni}</span>
                                <span className="font-bold underline text-love">Rol: {customRolesList.find(r => r.id === user.role)?.name || user.role.toUpperCase()}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteCustomUser(user.id)}
                              className="p-2 rounded-lg bg-love/5 text-love border border-love/10 hover:bg-love/15 transition-all text-[10px] font-black uppercase cursor-pointer shrink-0"
                              title="Eliminar Cuenta"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Personal del Personal en DB (Registered Accounts) */}
                    <div className="pt-6 border-t border-slate-150 dark:border-slate-800">
                      <div className="mb-4">
                        <h3 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white">Personal Registrado en Base de Datos</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Usuarios que han completado el registro en la base de datos de producción</p>
                      </div>

                      <div className="space-y-3">
                        {staff.length === 0 ? (
                          <div className="p-4 text-center text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                            No hay cuentas de personal registradas en base de datos.
                          </div>
                        ) : (
                          staff.map(member => (
                            <div key={member.id} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div>
                                <p className="font-black uppercase tracking-tight text-ink dark:text-white text-xs">{member.full_name}</p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-slate-405 dark:text-slate-400 mt-1 uppercase font-bold tracking-wider">
                                  <span>📧 {member.email}</span>
                                  <span>💳 DNI: {member.dni}</span>
                                  <span className="text-indigo-500 font-black">PRODUCCIÓN: {member.role}</span>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <button 
                                  onClick={() => updateUserRole(member.id, member.role === 'admin' ? 'waiter' : 'admin')} 
                                  className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-300 hover:bg-love hover:text-white transition-all border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer"
                                >
                                  {member.role === 'admin' ? 'Hacer Mozo' : 'Hacer Admin'}
                                </button>
                                <button 
                                  onClick={() => updateUserRole(member.id, 'client')} 
                                  className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded bg-white dark:bg-slate-900 text-slate-400 hover:text-love hover:border-love/30 transition-all border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer"
                                >
                                  Quitar Acceso
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-pestaña 2: ROLES */}
                {staffSubTab === 'roles' && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm dark:shadow-none space-y-6">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white">Matriz de Roles de Acceso</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-normal mt-0.5">Asigne permisos directamente a cada rol del sistema en tiempo real</p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      {customRolesList.map((role) => (
                        <div key={role.id} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4 shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-2.5">
                            <div>
                              <h4 className="font-black uppercase tracking-tight text-ink dark:text-white text-sm">{role.name}</h4>
                              <p className="text-[10px] font-mono text-slate-400">Cod ID: {role.id}</p>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20 px-2.5 py-1 rounded border border-emerald-100 dark:border-emerald-900/30">
                              {role.permissions.length} Permisos Activos
                            </span>
                          </div>

                          <div className="space-y-2 mt-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Permisos del Sistema asignados:</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {customPermissionsList.map((perm) => {
                                const isAssigned = role.permissions.includes(perm.id);
                                return (
                                  <label 
                                    key={perm.id} 
                                    className={cn(
                                      "flex items-start gap-1.5 p-2 rounded-lg border text-[10px] font-bold cursor-pointer transition-all uppercase tracking-tight select-none",
                                      isAssigned
                                        ? "bg-white dark:bg-slate-900 border-love/20 text-ink dark:text-white"
                                        : "bg-transparent border-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      className="accent-love cursor-pointer mt-0.5"
                                      checked={isAssigned}
                                      onChange={(e) => handleUpdateRolePermissions(role.id, perm.id, e.target.checked)}
                                    />
                                    <div>
                                      <p className="font-extrabold leading-none">{perm.name}</p>
                                      <p className="text-[8px] font-black text-slate-400 normal-case tracking-tight mt-0.5 truncate max-w-[150px]">{perm.description}</p>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-pestaña 3: PERMISOS */}
                {staffSubTab === 'permisos' && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm dark:shadow-none space-y-6">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white">Llaves de Bloqueo Integradas (Permisos)</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-normal mt-0.5">Permisos específicos utilizados en los componentes y navegación para validar accesos</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {customPermissionsList.map((perm) => (
                        <div key={perm.id} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="p-1 px-2 text-[8px] font-mono font-black uppercase tracking-widest bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded">
                              {perm.id}
                            </span>
                            <span className="font-black text-ink dark:text-white text-xs uppercase tracking-tight">{perm.name}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight mt-1 ml-0.5 border-l-2 border-love/20 pl-2">
                            {perm.description || 'Sin descripción adicional'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MODAL PARA AGREGAR USUARIO DIRECTO */}
                {showAddCustomUserModal && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                    <form 
                      onSubmit={handleAddCustomUser}
                      className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-2xl relative"
                    >
                      <button 
                        type="button"
                        onClick={() => setShowAddCustomUserModal(false)}
                        className="absolute right-4 top-4 p-2 text-slate-305 hover:text-ink cursor-pointer border-none bg-transparent"
                      >
                        <X size={18} />
                      </button>

                      <div className="pr-8">
                        <h4 className="font-black text-ink dark:text-white text-base uppercase tracking-tight">Crear Nueva Cuenta de Acceso</h4>
                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-450">Agregue credenciales listas para ingresar a la plataforma</p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 block">Nombre Completo</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. Rodrigo Fernández"
                            value={newCustomUser.fullName}
                            onChange={(e) => setNewCustomUser({ ...newCustomUser, fullName: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:border-love outline-none text-ink dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 block">DNI (Identificación)</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. 12345678"
                            value={newCustomUser.dni}
                            onChange={(e) => setNewCustomUser({ ...newCustomUser, dni: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:border-love outline-none text-ink dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 block">Correo Electrónico (Login)</label>
                          <input 
                            type="email" 
                            required
                            placeholder="Ej. roderigo@craftfan.com"
                            value={newCustomUser.email}
                            onChange={(e) => setNewCustomUser({ ...newCustomUser, email: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:border-love outline-none text-ink dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 block">Contraseña de Ingreso</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Contraseña del usuario"
                            value={newCustomUser.password}
                            onChange={(e) => setNewCustomUser({ ...newCustomUser, password: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:border-love outline-none text-ink dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 block">Rol Asignado</label>
                          <select 
                            value={newCustomUser.role}
                            onChange={(e) => setNewCustomUser({ ...newCustomUser, role: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:border-love outline-none text-ink dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          >
                            {customRolesList.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end gap-2">
                        <button 
                          type="button" 
                          onClick={() => setShowAddCustomUserModal(false)}
                          className="px-4 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all border-none cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit"
                          className="px-4 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl bg-love text-white shadow-lg shadow-love/15 transition-all border-none cursor-pointer"
                        >
                          Guardar Cuenta
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* MODAL PARA AGREGAR ROL */}
                {showAddRoleModal && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                    <form 
                      onSubmit={handleCreateRole}
                      className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-2xl relative"
                    >
                      <button 
                        type="button"
                        onClick={() => setShowAddRoleModal(false)}
                        className="absolute right-4 top-4 p-2 text-slate-305 hover:text-ink cursor-pointer border-none bg-transparent"
                      >
                        <X size={18} />
                      </button>

                      <div>
                        <h4 className="font-black text-ink dark:text-white text-base uppercase tracking-tight">Crear Nuevo Rol</h4>
                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-450">Defina un rol contenedor de privilegios en el sistema</p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 block">Código ID de Rol</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. cajero, supervisor"
                            value={newRoleForm.id}
                            onChange={(e) => setNewRoleForm({ ...newRoleForm, id: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:border-love outline-none text-ink dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 block">Nombre del Rol</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. Personal de Caja"
                            value={newRoleForm.name}
                            onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:border-love outline-none text-ink dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end gap-2">
                        <button 
                          type="button" 
                          onClick={() => setShowAddRoleModal(false)}
                          className="px-4 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all border-none cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit"
                          className="px-4 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl bg-love text-white shadow-lg shadow-love/15 transition-all border-none cursor-pointer"
                        >
                          Crear Rol
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* MODAL PARA AGREGAR PERMISO */}
                {showAddPermissionModal && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                    <form 
                      onSubmit={handleCreatePermission}
                      className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl border border-slate-100 dark:border-slate-800 p-6 space-y-4 shadow-2xl relative"
                    >
                      <button 
                        type="button"
                        onClick={() => setShowAddPermissionModal(false)}
                        className="absolute right-4 top-4 p-2 text-slate-305 hover:text-ink cursor-pointer border-none bg-transparent"
                      >
                        <X size={18} />
                      </button>

                      <div>
                        <h4 className="font-black text-ink dark:text-white text-base uppercase tracking-tight">Crear Nuevo Permiso</h4>
                        <p className="text-[9px] uppercase font-black tracking-widest text-slate-450">Defina un privilegio granular en el sistema</p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 block">Código ID de l Permiso</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. ver_cocina"
                            value={newPermissionForm.id}
                            onChange={(e) => setNewPermissionForm({ ...newPermissionForm, id: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:border-love outline-none text-ink dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 block">Nombre del Permiso</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Ej. Ver Panel Cocineros"
                            value={newPermissionForm.name}
                            onChange={(e) => setNewPermissionForm({ ...newPermissionForm, name: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:border-love outline-none text-ink dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-2 block">Descripción del Permiso</label>
                          <textarea 
                            rows={3}
                            placeholder="Ej. Permite visualizar e imprimir comandos para cocina"
                            value={newPermissionForm.description}
                            onChange={(e) => setNewPermissionForm({ ...newPermissionForm, description: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-sm focus:border-love outline-none text-ink dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none"
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end gap-2">
                        <button 
                          type="button" 
                          onClick={() => setShowAddPermissionModal(false)}
                          className="px-4 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all border-none cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit"
                          className="px-4 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl bg-love text-white shadow-lg shadow-love/15 transition-all border-none cursor-pointer"
                        >
                          Crear Permiso
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
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
                    {branchNames.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
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
            <div className="w-full space-y-6">
              {/* Subtab selection */}
              <div className="flex border-b border-slate-100 dark:border-slate-800 pb-0.5 overflow-x-auto no-scrollbar gap-1 mb-6">
                <button 
                  onClick={() => setSettingsSubTab('points')}
                  className={cn(
                    "px-5 py-3 text-xs uppercase font-extrabold tracking-wider border-b-2 transition-all cursor-pointer bg-transparent outline-none shrink-0",
                    settingsSubTab === 'points' 
                      ? "border-love text-love" 
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  Reglas de Puntos
                </button>
                <button 
                  onClick={() => setSettingsSubTab('help')}
                  className={cn(
                    "px-5 py-3 text-xs uppercase font-extrabold tracking-wider border-b-2 transition-all cursor-pointer bg-transparent outline-none shrink-0",
                    settingsSubTab === 'help' 
                      ? "border-love text-love" 
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  Centro de Ayuda (FAQ & Términos)
                </button>
                <button 
                  onClick={() => setSettingsSubTab('branches')}
                  className={cn(
                    "px-5 py-3 text-xs uppercase font-extrabold tracking-wider border-b-2 transition-all cursor-pointer bg-transparent outline-none shrink-0",
                    settingsSubTab === 'branches' 
                      ? "border-love text-love" 
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  Sucursales
                </button>
              </div>

              {settingsSubTab === 'points' && (
                <div className="w-full">
                  {!settings ? (
                    <div className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                      Cargando configuración...
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 bg-love/10 rounded-2xl flex items-center justify-center text-love">
                          <Settings size={21} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black uppercase tracking-tighter text-ink dark:text-white">Configuración del <span className="text-love">Sistema</span></h3>
                          <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Personaliza las reglas de lealtad</p>
                        </div>
                      </div>

                      <form onSubmit={handleUpdateSettings} className="space-y-8">
                        {/* Conversión y Tasa */}
                        <div className="space-y-3">
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-500 pl-1">Tasa de Conversión de Puntos</label>
                          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-xl flex items-center justify-between group transition-all hover:border-love/30">
                            <div className="flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-ink dark:text-slate-300">$</span>
                                <input 
                                  type="number" 
                                  className="bg-transparent text-4xl font-black text-love outline-none w-full border-b-2 border-transparent focus:border-love transition-all"
                                  value={settings.points_conversion_rate}
                                  onChange={e => setSettings({...settings, points_conversion_rate: parseInt(e.target.value) || 0})}
                                />
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">equivale a 1 punto</p>
                            </div>
                            <div className="w-16 h-16 bg-white dark:bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm text-love animate-pulse">
                              <Award size={32} />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium px-2 leading-relaxed">
                            Este valor define cuántos pesos argentinos debe consumir el cliente para sumar 1 punto. Por ejemplo, si pones 1000, un consumo de $10.000 sumará 10 puntos.
                          </p>
                        </div>

                        {/* Vencimiento y Expiración */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 pl-1">📅 Vencimiento de Puntos (Meses)</label>
                            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-xl flex items-center gap-3">
                              <input 
                                type="number" 
                                min="1"
                                max="120"
                                className="bg-transparent text-2xl font-black text-ink dark:text-white outline-none w-full border-b border-transparent focus:border-love/30 transition-all font-mono"
                                value={pointsExpirationMonths}
                                onChange={e => setPointsExpirationMonths(parseInt(e.target.value) || 3)}
                              />
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">meses</span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium px-2 leading-relaxed">
                              Plazo de vigencia para que los clientes puedan canjear sus puntos por premios antes de que expiren automáticamente.
                            </p>
                          </div>

                          <div className="space-y-3">
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 pl-1">⚡ Ventana de Inactividad de Categoría</label>
                            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-xl flex items-center gap-3">
                              <input 
                                type="number" 
                                min="1"
                                max="365"
                                className="bg-transparent text-2xl font-black text-ink dark:text-white outline-none w-full border-b border-transparent focus:border-love/30 transition-all font-mono"
                                value={categoryInactivityDays}
                                onChange={e => setCategoryInactivityDays(parseInt(e.target.value) || 60)}
                              />
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">días</span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-medium px-2 leading-relaxed">
                              Periodo máximo de inactividad de recargas de puntos tras el cual la categoría de beneficios del cliente desciende o se restablece por inactividad.
                            </p>
                          </div>
                        </div>

                        {/* Niveles de Lealtad (Tiers) */}
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white flex items-center gap-2">
                              🛡️ Niveles de Lealtad y Beneficios (Tiers)
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                              Configura los requisitos de puntos totales y los beneficios/multiplicadores de cada categoría.
                            </p>
                          </div>

                          <div className="space-y-6">
                            {(localLoyaltyTiers || []).map((tier, idx) => (
                              <div key={tier.id || idx} className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/80 p-6 rounded-xl space-y-4 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-love/50" />
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase bg-love/10 text-love px-3 py-1 rounded-full">
                                    NIVEL {idx + 1}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                                    ID: {tier.id}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400/90 pl-1">Nombre de Nivel</label>
                                    <input 
                                      type="text" 
                                      className="w-full bg-slate-100/50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-3 py-2.5 rounded-2xl text-xs font-bold text-ink dark:text-white focus:border-love outline-none"
                                      value={tier.name}
                                      onChange={e => {
                                        const updated = [...localLoyaltyTiers];
                                        updated[idx].name = e.target.value;
                                        setLocalLoyaltyTiers(updated);
                                      }}
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400/90 pl-1">Puntos Requeridos</label>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <input 
                                        type="number" 
                                        placeholder="Min"
                                        className="w-full bg-slate-100/50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-3 py-2.5 rounded-2xl text-xs font-mono font-bold text-ink dark:text-white focus:border-love outline-none"
                                        value={tier.minPoints}
                                        onChange={e => {
                                          const updated = [...localLoyaltyTiers];
                                          updated[idx].minPoints = parseInt(e.target.value) || 0;
                                          setLocalLoyaltyTiers(updated);
                                        }}
                                      />
                                      <span className="text-slate-300 dark:text-slate-700 text-xs">-</span>
                                      <input 
                                        type="number" 
                                        placeholder="Max"
                                        className="w-full bg-slate-100/50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-3 py-2.5 rounded-2xl text-xs font-mono font-bold text-ink dark:text-white focus:border-love outline-none"
                                        value={tier.maxPoints}
                                        onChange={e => {
                                          const updated = [...localLoyaltyTiers];
                                          updated[idx].maxPoints = parseInt(e.target.value) || 0;
                                          setLocalLoyaltyTiers(updated);
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400/90 pl-1">Multiplicador de Carga</label>
                                    <input 
                                      type="number" 
                                      step="0.1"
                                      min="1.0"
                                      max="10.0"
                                      className="w-full bg-slate-100/50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-3 py-2.5 rounded-2xl text-xs font-mono font-bold text-love dark:text-love focus:border-love outline-none"
                                      value={tier.multiplier}
                                      onChange={e => {
                                        const updated = [...localLoyaltyTiers];
                                        updated[idx].multiplier = parseFloat(e.target.value) || 1.0;
                                        setLocalLoyaltyTiers(updated);
                                      }}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400/90 pl-1">Descripción de Beneficios del Nivel</label>
                                  <textarea 
                                    rows={2}
                                    className="w-full bg-slate-100/50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 p-3 rounded-2xl text-xs font-semibold text-slate-650 dark:text-slate-300 focus:border-love outline-none leading-relaxed"
                                    value={tier.benefits}
                                    onChange={e => {
                                      const updated = [...localLoyaltyTiers];
                                      updated[idx].benefits = e.target.value;
                                      setLocalLoyaltyTiers(updated);
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("¿Seguro que deseas restaurar los 3 niveles a la configuración de fábrica (FAN, GOLD, BLACK)?")) {
                                  setLocalLoyaltyTiers([
                                    {
                                      id: 'tier-fan',
                                      name: 'CRAFT FAN',
                                      minPoints: 1,
                                      maxPoints: 499,
                                      multiplier: 1.0,
                                      benefits: 'Acceso a Club Craft. Sumas 1 punto base por cada peso consumido según la tasa.'
                                    },
                                    {
                                      id: 'tier-gold',
                                      name: 'CRAFT GOLD',
                                      minPoints: 500,
                                      maxPoints: 999,
                                      multiplier: 1.5,
                                      benefits: 'Multiplicador de puntos x1.5 de regalo en consumos. Premios especiales.'
                                    },
                                    {
                                      id: 'tier-black',
                                      name: 'CRAFT BLACK',
                                      minPoints: 1000,
                                      maxPoints: 999999,
                                      multiplier: 2.0,
                                      benefits: 'Multiplicador de puntos x2.0 de regalo en consumos. Atención ultra premium y sorpresas.'
                                    }
                                  ]);
                                }
                              }}
                              className="text-[9px] font-black uppercase text-slate-400 hover:text-love tracking-widest transition-colors cursor-pointer bg-transparent border-none outline-none"
                            >
                              🔄 Restablecer Niveles de Fábrica
                            </button>
                          </div>
                        </div>

                        <button 
                          type="submit" 
                          disabled={updatingSettings}
                          className="w-full bg-ink text-white dark:bg-love py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-sm hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                        >
                          {updatingSettings ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {settingsSubTab === 'help' && (
                <div className="space-y-8">
                  {/* Bases y Condiciones */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none text-left">
                    <h4 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white mb-4 flex items-center gap-2">
                      <FileText size={18} className="text-love" /> Bases y Condiciones (Reglamento)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Modifica el texto entero del reglamento del Club de lealtad</p>
                    <textarea
                      value={localTermsText}
                      onChange={(e) => setLocalTermsText(e.target.value)}
                      rows={8}
                      className="w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-650 dark:text-slate-300 font-semibold leading-relaxed focus:border-love outline-none transition-all"
                      placeholder="Introduce el reglamento aquí..."
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const updated = {
                            ...designConfig,
                            terms: localTermsText
                          };
                          await saveDesignConfig(updated);
                          alert("Bases y Condiciones guardadas correctamente");
                        } catch (err: any) {
                          alert("Error guardando bases: " + err.message);
                        }
                      }}
                      className="mt-4 px-6 py-3 bg-love text-white rounded-xl text-xs uppercase font-black tracking-widest hover:scale-[1.02] transition-all cursor-pointer border-none"
                    >
                      Guardar Bases y Condiciones
                    </button>
                  </div>

                  {/* Preguntas Frecuentes */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-6 text-left">
                    <h4 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white flex items-center gap-2">
                      <HelpCircle size={18} className="text-love" /> Preguntas Frecuentes (FAQs)
                    </h4>
                    
                    {/* FAQ List */}
                    <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto no-scrollbar pr-1">
                      {(designConfig.faqs || []).map((faq, index) => (
                        <div key={index} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                          <div className="text-left">
                            <span className="text-[8px] bg-love/10 text-love px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{faq.category}</span>
                            <h5 className="text-xs font-black text-ink dark:text-white mt-1.5">{faq.q}</h5>
                            <p className="text-[10px] text-slate-400 font-semibold truncate max-w-sm md:max-w-md mt-0.5">{faq.a}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingFaqIndex(index);
                                setFaqForm({ q: faq.q, a: faq.a, category: faq.category });
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded transition-all bg-transparent border-none cursor-pointer"
                              title="Editar pregunta"
                            >
                              <Palette size={14} />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm("¿Estás seguro de eliminar esta pregunta frecuente?")) {
                                  const updatedFaqs = (designConfig.faqs || []).filter((_, i) => i !== index);
                                  const updated = { ...designConfig, faqs: updatedFaqs };
                                  await saveDesignConfig(updated);
                                  alert("Pregunta eliminada de forma correcta");
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-550/10 rounded transition-all bg-transparent border-none cursor-pointer"
                              title="Eliminar pregunta"
                            >
                              <LogOut size={14} className="rotate-180 text-rose-500" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* FAQ Add/Edit Form */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <h5 className="text-xs font-black uppercase tracking-widest text-love mb-4 pl-0.5">
                        {editingFaqIndex !== null ? 'Editar Pregunta Frecuente' : 'Agregar Nueva Pregunta'}
                      </h5>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const updatedFaqs = [...(designConfig.faqs || [])];
                        if (editingFaqIndex !== null) {
                          updatedFaqs[editingFaqIndex] = faqForm;
                        } else {
                          updatedFaqs.push(faqForm);
                        }
                        const updated = { ...designConfig, faqs: updatedFaqs };
                        await saveDesignConfig(updated);
                        setFaqForm({ q: '', a: '', category: 'General' });
                        setEditingFaqIndex(null);
                        alert("Preguntas Frecuentes actualizadas");
                      }} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-0.5">Pregunta</label>
                          <input
                            type="text"
                            required
                            value={faqForm.q}
                            onChange={e => setFaqForm({ ...faqForm, q: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs text-ink dark:text-white font-bold outline-none focus:border-love"
                            placeholder="¿Cómo canjear mis puntos?"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-0.5">Respuesta</label>
                          <textarea
                            required
                            value={faqForm.a}
                            onChange={e => setFaqForm({ ...faqForm, a: e.target.value })}
                            rows={3}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs text-ink dark:text-white font-semibold outline-none focus:border-love"
                            placeholder="Escribe la respuesta detallada..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-0.5">Categoría</label>
                          <input
                            type="text"
                            required
                            value={faqForm.category}
                            onChange={e => setFaqForm({ ...faqForm, category: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs text-ink dark:text-white font-bold outline-none focus:border-love"
                            placeholder="General, Puntos, Canjes, etc."
                          />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <button
                            type="submit"
                            className="px-5 py-3 bg-ink text-white dark:bg-love rounded-xl text-xs uppercase font-black tracking-widest hover:scale-105 transition-all cursor-pointer border-none"
                          >
                            {editingFaqIndex !== null ? 'Guardar Cambios' : 'Agregar Pregunta'}
                          </button>
                          {editingFaqIndex !== null && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFaqIndex(null);
                                setFaqForm({ q: '', a: '', category: 'General' });
                              }}
                              className="px-5 py-3 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-xl text-xs uppercase font-black tracking-widest hover:bg-slate-300 cursor-pointer border-none"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {settingsSubTab === 'branches' && (
                <div className="space-y-8 text-left">
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-6">
                    <h4 className="text-sm font-black uppercase tracking-wider text-ink dark:text-white flex items-center gap-2">
                      <MapPin size={18} className="text-love animate-bounce" /> Gestión de Sucursales
                    </h4>

                    {/* Branches List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(designConfig.branches || []).map((branch) => (
                        <div key={branch.id} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-sm hover:border-love/30 transition-all">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="text-xs font-black text-ink dark:text-white uppercase tracking-tight">
                                {branch.name}
                                {branch.active === false && (
                                  <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 text-[8px] font-black uppercase tracking-widest">Inactiva</span>
                                )}
                              </h5>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingBranchId(branch.id);
                                    setBranchForm({ ...branch, active: branch.active !== false });
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-500 transition-colors bg-transparent border-none cursor-pointer"
                                  title="Editar sucursal"
                                >
                                  <Palette size={12} />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(`¿Estás seguro de eliminar la sucursal "${branch.name}"?`)) {
                                      const updatedBranches = (designConfig.branches || []).filter(b => b.id !== branch.id);
                                      const updated = { ...designConfig, branches: updatedBranches };
                                      await saveDesignConfig(updated);
                                      alert("Sucursal eliminada de forma exitosa");
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-500 transition-colors bg-transparent border-none cursor-pointer"
                                  title="Eliminar sucursal"
                                >
                                  <LogOut size={12} className="rotate-180 text-rose-500" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-1">
                              <MapPin size={10} /> {branch.address}, {branch.city}
                            </p>
                            <p className="text-[10px] text-slate-500 font-semibold mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded-lg">
                              {branch.specialty}
                            </p>
                          </div>
                          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex flex-wrap gap-1">
                            {branch.features.map(f => (
                              <span key={f} className="text-[8px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded-full font-bold text-slate-500">{f}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Branch Form */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-100 dark:border-slate-800 text-left">
                      <h5 className="text-xs font-black uppercase tracking-widest text-[#B45309] dark:text-amber-400 mb-4 font-black">
                        {editingBranchId ? `Editar Sucursal: ${branchForm.name}` : 'Agregar Nueva Sucursal'}
                      </h5>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const updatedBranches = [...(designConfig.branches || [])];
                        const branchData = {
                          ...branchForm,
                          id: branchForm.id || Math.random().toString(36).substr(2, 9)
                        };
                        if (editingBranchId) {
                          const idx = updatedBranches.findIndex(b => b.id === editingBranchId);
                          if (idx !== -1) {
                            updatedBranches[idx] = branchData;
                          }
                        } else {
                          updatedBranches.push(branchData);
                        }
                        const updated = { ...designConfig, branches: updatedBranches };
                        await saveDesignConfig(updated);
                        setEditingBranchId(null);
                        setBranchForm({
                          id: '', name: '', address: '', city: 'Paraná', province: 'Entre Ríos',
                          phone: '', hoursWeekday: '07:30 a 21:30 hs', hoursWeekend: '08:30 a 21:00 hs',
                          specialty: '', features: [], coordinates: '', imageUrl: '', googleMapsUrl: '', active: true
                        });
                        alert("Sucursal guardada correctamente");
                      }} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Nombre de la Sucursal</label>
                            <input
                              type="text" required value={branchForm.name}
                              onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs text-ink dark:text-white font-bold outline-none focus:border-love"
                              placeholder="e.g. CRAFT Paraná"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Dirección</label>
                            <input
                              type="text" required value={branchForm.address}
                              onChange={e => setBranchForm({ ...branchForm, address: e.target.value })}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs text-ink dark:text-white font-bold outline-none focus:border-love"
                              placeholder="e.g. Pellegrini 450"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Ciudad</label>
                            <input
                              type="text" required value={branchForm.city}
                              onChange={e => setBranchForm({ ...branchForm, city: e.target.value })}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs text-ink dark:text-white font-bold outline-none focus:border-love"
                              placeholder="Paraná, Gualeguaychú, Concordia"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Teléfono Corporativo</label>
                            <input
                              type="text" value={branchForm.phone}
                              onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs text-ink dark:text-white font-bold outline-none focus:border-love"
                              placeholder="e.g. +54 343 456789"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Horarios (Semana)</label>
                            <input
                              type="text" value={branchForm.hoursWeekday}
                              onChange={e => setBranchForm({ ...branchForm, hoursWeekday: e.target.value })}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs text-ink dark:text-white font-bold outline-none focus:border-love"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Horarios (Finde)</label>
                            <input
                              type="text" value={branchForm.hoursWeekend}
                              onChange={e => setBranchForm({ ...branchForm, hoursWeekend: e.target.value })}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs text-ink dark:text-white font-bold outline-none focus:border-love"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Especialidad</label>
                            <input
                              type="text" value={branchForm.specialty}
                              onChange={e => setBranchForm({ ...branchForm, specialty: e.target.value })}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs text-ink dark:text-white font-bold outline-none focus:border-love"
                              placeholder="e.g. Pastelería fina y Brunch"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Coordenadas del Mapa (Lat, Lng)</label>
                            <input
                              type="text" value={branchForm.coordinates}
                              onChange={e => setBranchForm({ ...branchForm, coordinates: e.target.value })}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs text-ink dark:text-white font-bold outline-none focus:border-love"
                              placeholder="e.g. -31.721,-60.521"
                            />
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Foto de la Sucursal</label>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start pt-1">
                              {/* Drag & Drop or Upload Box */}
                              <div className="md:col-span-2">
                                <label 
                                  htmlFor="branch-photo-file-input"
                                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-love dark:hover:border-love rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/20 text-center h-full min-h-[96px]"
                                >
                                  <Upload size={18} className="text-slate-400" />
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-350">Subir una foto de la sucursal</span>
                                  <span className="text-[9px] text-slate-400">Formatos: PNG, JPG, WEBP (Máx 5MB)</span>
                                </label>
                                <input 
                                  type="file" 
                                  id="branch-photo-file-input"
                                  accept="image/*"
                                  onChange={handleBranchFileChange}
                                  className="hidden"
                                />
                              </div>

                              {/* Preview Area */}
                              <div className="flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50 dark:bg-slate-950/40 h-full min-h-[96px] relative overflow-hidden group">
                                {branchForm.imageUrl ? (
                                  <>
                                    <img 
                                      src={branchForm.imageUrl} 
                                      alt="Vista previa sucursal" 
                                      className="w-full h-16 object-cover rounded-xl"
                                      referrerPolicy="no-referrer"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setBranchForm(prev => ({ ...prev, imageUrl: '' }))}
                                      className="absolute top-1.5 right-1.5 bg-rose-500 hover:bg-rose-600 text-white p-1 rounded-full shadow-md transition-all active:scale-90 border-none cursor-pointer"
                                      title="Quitar foto"
                                    >
                                      <X size={10} />
                                    </button>
                                  </>
                                ) : (
                                  <div className="text-center p-3 text-slate-400">
                                    <ImageIcon size={20} className="mx-auto opacity-40 mb-1" />
                                    <p className="text-[8px] font-black uppercase tracking-tight">Sin Foto Cargada</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Manual URL link input as alternative */}
                            <div className="space-y-1 mt-2">
                              <label className="text-[9px] uppercase font-bold tracking-wider text-slate-400">O ingresa URL de la foto sucursal</label>
                              <input
                                type="text" value={branchForm.imageUrl}
                                onChange={e => setBranchForm({ ...branchForm, imageUrl: e.target.value })}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs text-ink dark:text-white font-bold outline-none focus:border-love"
                                placeholder="https://"
                              />
                            </div>
                          </div>
                          <div className="space-y-1 col-span-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Link de Google Maps</label>
                            <input
                              type="text" value={branchForm.googleMapsUrl}
                              onChange={e => setBranchForm({ ...branchForm, googleMapsUrl: e.target.value })}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs text-ink dark:text-white font-bold outline-none focus:border-love"
                              placeholder="https://maps.google.com/?q=..."
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg">
                            <div>
                              <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">Sucursal Activa</label>
                              <span className="text-[9px] text-slate-400">Si está apagada, no aparece para cargar consumos.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setBranchForm({ ...branchForm, active: !branchForm.active })}
                              className={cn(
                                "relative w-12 h-6 rounded-full transition-all flex-shrink-0",
                                branchForm.active ? "bg-love" : "bg-slate-300 dark:bg-slate-700"
                              )}
                              title={branchForm.active ? "Activa" : "Inactiva"}
                            >
                              <span className={cn(
                                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all",
                                branchForm.active ? "left-[26px]" : "left-0.5"
                              )} />
                            </button>
                          </div>
                        </div>

                        {/* Servicio pills list builder */}
                        <div className="space-y-2 text-left">
                          <label className="text-[10px] uppercase font-black tracking-widest text-slate-400">Servicios Incluidos</label>
                          <div className="flex gap-2">
                            <input
                              type="text" value={newFeatureText}
                              onChange={e => setNewFeatureText(e.target.value)}
                              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg text-xs outline-none focus:border-love"
                              placeholder="e.g. Workspace Silencioso, Deck Río"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (newFeatureText.trim()) {
                                  setBranchForm({
                                    ...branchForm,
                                    features: [...branchForm.features, newFeatureText.trim()]
                                  });
                                  setNewFeatureText('');
                                }
                              }}
                              className="bg-ink hover:bg-black text-white dark:bg-love px-5 py-2.5 rounded-lg text-xs uppercase font-extrabold tracking-wider transition-all cursor-pointer border-none"
                            >
                              Agregar
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {branchForm.features.map((feature, i) => (
                              <span key={i} className="text-[9px] bg-love/10 text-love px-2 py-1 rounded-full flex items-center gap-1 font-bold">
                                {feature}
                                <button
                                  type="button"
                                  onClick={() => setBranchForm({
                                    ...branchForm,
                                    features: branchForm.features.filter((_, fIdx) => fIdx !== i)
                                  })}
                                  className="text-[8px] text-rose-500 font-extrabold ml-1 bg-transparent border-none shrink-0 cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-4">
                          <button
                            type="submit"
                            className="px-6 py-3 bg-ink text-white dark:bg-love rounded-xl text-xs uppercase font-black tracking-widest hover:bg-black transition-all cursor-pointer border-none"
                          >
                            {editingBranchId ? 'Guardar Cambios' : 'Crear Sucursal'}
                          </button>
                          {editingBranchId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBranchId(null);
                                setBranchForm({
                                  id: '', name: '', address: '', city: 'Paraná', province: 'Entre Ríos',
                                  phone: '', hoursWeekday: '07:30 a 21:30 hs', hoursWeekend: '08:30 a 21:00 hs',
                                  specialty: '', features: [], coordinates: '', imageUrl: '', googleMapsUrl: '', active: true
                                });
                              }}
                              className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-xl text-xs uppercase font-black tracking-widest hover:bg-slate-350 cursor-pointer border-none"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </div>
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
                    <div className="bg-white rounded-xl p-6 md:p-8 border border-slate-100 shadow-sm">
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

                                  <div className="space-y-4">
                                    <div className="p-4 bg-love/5 border border-love/20 rounded-2xl">
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-love mb-1">📢 Banner con diseño incluido</p>
                                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                                        Sube tu banner diseñado completo con títulos y tipografías incluidos. En la app del cliente se mostrará la gráfica limpia y solo se configurará y posicionará el botón interactivo sobre ella.
                                      </p>
                                    </div>

                                    <div className="space-y-3">
                                      <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Importar Archivo de Gráfica (Alta Calidad)</label>
                                        
                                        {/* Drag & Drop high-fidelity Uploader Zone */}
                                        <div className="relative">
                                          <input 
                                            type="file" 
                                            accept="image/*" 
                                            id={`banner-file-input-${activeBannerIndex}`}
                                            onChange={(e) => handleBannerFileChange(e, activeBannerIndex)}
                                            className="hidden" 
                                          />
                                          
                                          {localDesign.banners[activeBannerIndex].imageUrl ? (
                                            <div className="relative group rounded-2xl border-2 border-emerald-500/30 overflow-hidden bg-slate-50 dark:bg-slate-900 aspect-video flex flex-col justify-end p-4">
                                              <img 
                                                src={localDesign.banners[activeBannerIndex].imageUrl} 
                                                className="absolute inset-0 w-full h-full object-cover" 
                                                alt="Banner subido" 
                                                referrerPolicy="no-referrer"
                                              />
                                              {/* Ambient overlay */}
                                              <label 
                                                htmlFor={`banner-file-input-${activeBannerIndex}`}
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white gap-2 cursor-pointer"
                                              >
                                                <Upload size={24} className="animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Reemplazar Archivo</span>
                                              </label>
                                              
                                              {/* Beautiful status pill */}
                                              <div className="relative z-10 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 self-start backdrop-blur-xs">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                                Gráfica Cargada Correctamente (Alta Calidad)
                                              </div>
                                            </div>
                                          ) : (
                                            <label 
                                              htmlFor={`banner-file-input-${activeBannerIndex}`}
                                              className="w-full aspect-video rounded-2xl border-2 border-dashed border-slate-300 hover:border-love/60 dark:border-slate-700 dark:hover:border-love/50 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-900/50 p-6 text-center hover:bg-love/5 group"
                                            >
                                              <div className="w-12 h-12 rounded-2xl bg-love/10 dark:bg-love/25 text-love flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                                                <Upload size={20} />
                                              </div>
                                              <p className="text-xs font-bold text-ink dark:text-white uppercase tracking-tight mb-1">Cargar Imagen de Banner</p>
                                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold max-w-xs leading-relaxed">
                                                Arrastra tu diseño o <span className="text-love font-bold underline">haz clic para buscar</span> en tu computadora. Soporta PNG, JPG (Más alta calidad).
                                              </p>
                                            </label>
                                          )}
                                        </div>

                                        <div className="flex justify-between items-center px-1">
                                          <label htmlFor={`banner-file-input-${activeBannerIndex}`} className="text-[9px] font-black text-love uppercase tracking-widest cursor-pointer hover:underline flex items-center gap-1">
                                            <Upload size={10} /> {localDesign.banners[activeBannerIndex].imageUrl ? "Reemplazar Gráfica" : "Elegir archivo"}
                                          </label>
                                          {localDesign.banners[activeBannerIndex].imageUrl && (
                                            <button 
                                              onClick={() => {
                                                const updated = [...localDesign.banners];
                                                updated[activeBannerIndex].imageUrl = "";
                                                setLocalDesign({ ...localDesign, banners: updated });
                                              }}
                                              className="text-[9px] font-black text-slate-400 hover:text-love uppercase tracking-widest transition-colors"
                                            >
                                              Quitar Imagen
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Texto del Botón Acción</label>
                                          <input
                                            type="text"
                                            placeholder="Canjear Premio"
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-ink font-bold"
                                            value={localDesign.banners[activeBannerIndex].buttonText}
                                            onChange={(e) => {
                                              const updated = [...localDesign.banners];
                                              updated[activeBannerIndex].buttonText = e.target.value;
                                              setLocalDesign({ ...localDesign, banners: updated });
                                            }}
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Enlace o Link de Destino</label>
                                          <input
                                            type="text"
                                            placeholder="#/rewards"
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-ink font-bold"
                                            value={localDesign.banners[activeBannerIndex].linkUrl}
                                            onChange={(e) => {
                                              const updated = [...localDesign.banners];
                                              updated[activeBannerIndex].linkUrl = e.target.value;
                                              setLocalDesign({ ...localDesign, banners: updated });
                                            }}
                                          />
                                        </div>
                                      </div>

                                      {/* Collapsible reference fields */}
                                      <div className="border-t border-slate-100 pt-3 mt-3">
                                        <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-2">⚙️ Campos de Referencia Interna u Opcionales (No tapan el banner)</p>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1">
                                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Referencia Título</label>
                                            <input
                                              type="text"
                                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-500 font-semibold"
                                              value={localDesign.banners[activeBannerIndex].title}
                                              onChange={(e) => {
                                                const updated = [...localDesign.banners];
                                                updated[activeBannerIndex].title = e.target.value;
                                                setLocalDesign({ ...localDesign, banners: updated });
                                              }}
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Sugerencia Color de Botón</label>
                                            <input
                                              type="text"
                                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-500 font-semibold"
                                              value={localDesign.banners[activeBannerIndex].bgColor || '#E63946'}
                                              onChange={(e) => {
                                                const updated = [...localDesign.banners];
                                                updated[activeBannerIndex].bgColor = e.target.value;
                                                setLocalDesign({ ...localDesign, banners: updated });
                                              }}
                                            />
                                          </div>
                                        </div>
                                        <p className="text-[8px] text-slate-400 mt-1 pl-0.5">El título descriptivo sirve para identificar campañas publicitarias en tu listado interno.</p>
                                      </div>
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
                              <h5 className="font-extrabold text-[10px] leading-none uppercase text-ink" style={{ fontFamily: `"${localDesign.fontHeadings}", sans-serif` }}>{localDesign.logoText || 'CLUB CRAFT'}</h5>
                              <p className="text-[6px] tracking-widest text-slate-400 uppercase mt-0.5">{localDesign.logoSubtitle || 'Loyalty'}</p>
                            </div>
                          </div>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: localDesign.primaryColor }} />
                        </div>

                        {/* Interactive Banner slider mockup inside phone */}
                        <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pb-12">
                          {localDesign.banners.length > 0 && (
                            <div 
                              className="rounded-2xl relative overflow-hidden shadow-md flex items-end p-3"
                              style={{ 
                                minHeight: '130px',
                                backgroundColor: '#1e293b'
                              }}
                            >
                              {/* Designed Image Full Background */}
                              {localDesign.banners[activeBannerIndex]?.imageUrl ? (
                                <>
                                  <img 
                                    referrerPolicy="no-referrer" 
                                    src={localDesign.banners[activeBannerIndex]?.imageUrl} 
                                    className="absolute inset-0 w-full h-full object-cover" 
                                    alt="Banner promocional" 
                                  />
                                  {/* Gentle shadow overlay for text/button readability */}
                                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                                </>
                              ) : (
                                <div className="absolute inset-0 flex flex-col justify-center p-3 text-center" style={{ backgroundColor: localDesign.banners[activeBannerIndex]?.bgColor || '#7c2d12', color: localDesign.banners[activeBannerIndex]?.textColor || '#ffedd5' }}>
                                  <p className="text-[10px] font-black uppercase text-white">{localDesign.banners[activeBannerIndex]?.title}</p>
                                </div>
                              )}

                              {/* Interactivo overlay button and indicators */}
                              <div className="relative z-10 w-full flex justify-between items-center">
                                {localDesign.banners[activeBannerIndex]?.buttonText ? (
                                  <span className="text-[7.5px] bg-red-500 text-white font-black uppercase tracking-wider px-2.5 py-1.5 rounded-md shadow-md">
                                    {localDesign.banners[activeBannerIndex]?.buttonText}
                                  </span>
                                ) : (
                                  <span className="text-[7.5px] bg-white/20 text-white font-black uppercase tracking-wider px-2 py-1 rounded-md">
                                    Ver más
                                  </span>
                                )}
                                <span className="text-[6.5px] text-white/90 font-mono bg-black/40 px-1.5 py-0.5 rounded font-black">
                                  PROMO {activeBannerIndex + 1}/{localDesign.banners.length}
                                </span>
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

          {activeTab === 'autonotif' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={18} className="text-love" />
                  <h3 className="text-sm font-black uppercase tracking-wider !text-slate-900">Avisos Automáticos</h3>
                </div>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Se envían solos cada día (campanita + email)</p>
                <p className="text-[10px] text-slate-400 mb-5">Podés usar <span className="font-black">{'{nombre}'}</span>, <span className="font-black">{'{combo}'}</span>, <span className="font-black">{'{dias}'}</span> y <span className="font-black">{'{puntos}'}</span> en los textos; se reemplazan solos.</p>

                {/* CUMPLEAÑOS */}
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-4">
                  <label className="flex items-center justify-between mb-3 cursor-pointer">
                    <span className="text-xs font-black uppercase tracking-wider !text-slate-900">🎂 Cumpleaños</span>
                    <input type="checkbox" className="w-4 h-4 accent-love cursor-pointer"
                      checked={autoNotifForm.birthday.enabled}
                      onChange={(e) => setAutoNotifForm({ ...autoNotifForm, birthday: { ...autoNotifForm.birthday, enabled: e.target.checked } })} />
                  </label>
                  <textarea rows={2} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-love text-ink dark:text-white resize-none mb-2"
                    value={autoNotifForm.birthday.message}
                    onChange={(e) => setAutoNotifForm({ ...autoNotifForm, birthday: { ...autoNotifForm.birthday, message: e.target.value } })} />
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Puntos de regalo:</label>
                    <input type="number" min="0" className="w-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold"
                      value={autoNotifForm.birthday.giftPoints}
                      onChange={(e) => setAutoNotifForm({ ...autoNotifForm, birthday: { ...autoNotifForm.birthday, giftPoints: parseInt(e.target.value) || 0 } })} />
                  </div>
                </div>

                {/* COMBO POR VENCER */}
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-4">
                  <label className="flex items-center justify-between mb-3 cursor-pointer">
                    <span className="text-xs font-black uppercase tracking-wider !text-slate-900">⏳ Combo por vencer</span>
                    <input type="checkbox" className="w-4 h-4 accent-love cursor-pointer"
                      checked={autoNotifForm.comboExpiring.enabled}
                      onChange={(e) => setAutoNotifForm({ ...autoNotifForm, comboExpiring: { ...autoNotifForm.comboExpiring, enabled: e.target.checked } })} />
                  </label>
                  <textarea rows={2} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-love text-ink dark:text-white resize-none mb-2"
                    value={autoNotifForm.comboExpiring.message}
                    onChange={(e) => setAutoNotifForm({ ...autoNotifForm, comboExpiring: { ...autoNotifForm.comboExpiring, message: e.target.value } })} />
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Avisar cuántos días antes:</label>
                    <input type="number" min="1" className="w-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold"
                      value={autoNotifForm.comboExpiring.daysBefore}
                      onChange={(e) => setAutoNotifForm({ ...autoNotifForm, comboExpiring: { ...autoNotifForm.comboExpiring, daysBefore: parseInt(e.target.value) || 1 } })} />
                  </div>
                </div>

                {/* INACTIVIDAD */}
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-5">
                  <label className="flex items-center justify-between mb-3 cursor-pointer">
                    <span className="text-xs font-black uppercase tracking-wider !text-slate-900">💔 Inactividad</span>
                    <input type="checkbox" className="w-4 h-4 accent-love cursor-pointer"
                      checked={autoNotifForm.inactive.enabled}
                      onChange={(e) => setAutoNotifForm({ ...autoNotifForm, inactive: { ...autoNotifForm.inactive, enabled: e.target.checked } })} />
                  </label>
                  <textarea rows={2} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-love text-ink dark:text-white resize-none mb-2"
                    value={autoNotifForm.inactive.message}
                    onChange={(e) => setAutoNotifForm({ ...autoNotifForm, inactive: { ...autoNotifForm.inactive, message: e.target.value } })} />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Días sin actividad:</label>
                      <input type="number" min="1" className="w-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold"
                        value={autoNotifForm.inactive.daysInactive}
                        onChange={(e) => setAutoNotifForm({ ...autoNotifForm, inactive: { ...autoNotifForm.inactive, daysInactive: parseInt(e.target.value) || 1 } })} />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Puntos para volver:</label>
                      <input type="number" min="0" className="w-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold"
                        value={autoNotifForm.inactive.giftPoints}
                        onChange={(e) => setAutoNotifForm({ ...autoNotifForm, inactive: { ...autoNotifForm.inactive, giftPoints: parseInt(e.target.value) || 0 } })} />
                    </div>
                  </div>
                </div>

                {/* SUBIÓ DE CATEGORÍA */}
                <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-5">
                  <label className="flex items-center justify-between mb-3 cursor-pointer">
                    <span className="text-xs font-black uppercase tracking-wider !text-slate-900">⭐ Subió de categoría</span>
                    <input type="checkbox" className="w-4 h-4 accent-love cursor-pointer"
                      checked={autoNotifForm.levelUp?.enabled ?? true}
                      onChange={(e) => setAutoNotifForm({ ...autoNotifForm, levelUp: { ...autoNotifForm.levelUp, enabled: e.target.checked } })} />
                  </label>
                  <p className="text-[9px] text-slate-400 mb-2 pl-1">Se envía al instante cuando el cliente sube de nivel (FAN → GOLD → BLACK). Podés usar <span className="font-black">{'{categoria}'}</span>.</p>
                  <textarea rows={2} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:border-love text-ink dark:text-white resize-none mb-2"
                    value={autoNotifForm.levelUp?.message ?? ''}
                    onChange={(e) => setAutoNotifForm({ ...autoNotifForm, levelUp: { ...autoNotifForm.levelUp, message: e.target.value } })} />
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Puntos de regalo al subir:</label>
                    <input type="number" min="0" className="w-24 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold"
                      value={autoNotifForm.levelUp?.giftPoints ?? 0}
                      onChange={(e) => setAutoNotifForm({ ...autoNotifForm, levelUp: { ...autoNotifForm.levelUp, giftPoints: parseInt(e.target.value) || 0 } })} />
                  </div>
                </div>

                <button type="button" onClick={handleSaveAutoNotif} disabled={autoNotifSaving}
                  className="w-full py-3 bg-love text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer border-none shadow-lg shadow-love/15 disabled:opacity-50">
                  {autoNotifSaving ? 'Guardando...' : 'Guardar configuración'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-2 mb-1">
                  <Bell size={18} className="text-love" />
                  <h3 className="text-sm font-black uppercase tracking-wider !text-slate-900">Enviar un aviso</h3>
                </div>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-5">Llega a la campanita del cliente dentro de la app</p>

                <form onSubmit={handleSendNotification} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Título</label>
                    <input
                      type="text"
                      maxLength={80}
                      placeholder="Ej: ¡Nueva promo de café!"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-bold"
                      value={notifForm.title}
                      onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Mensaje</label>
                    <textarea
                      maxLength={300}
                      rows={3}
                      placeholder="Escribí el aviso que verá el cliente..."
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-bold resize-none"
                      value={notifForm.message}
                      onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Destinatario</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNotifForm({ ...notifForm, target: 'all', clientId: '' })}
                        className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border cursor-pointer transition-all",
                          notifForm.target === 'all' ? "bg-love text-white border-love" : "bg-white dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800")}
                      >
                        Todos los clientes
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifForm({ ...notifForm, target: 'one' })}
                        className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border cursor-pointer transition-all",
                          notifForm.target === 'one' ? "bg-love text-white border-love" : "bg-white dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800")}
                      >
                        Un cliente puntual
                      </button>
                    </div>
                  </div>

                  {notifForm.target === 'one' && (
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Buscar cliente (nombre, email o DNI)</label>
                      <input
                        type="text"
                        placeholder="Escribí para buscar..."
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-bold"
                        value={notifClientSearch}
                        onChange={(e) => setNotifClientSearch(e.target.value)}
                      />
                      {notifClientSearch.trim().length >= 2 && (
                        <div className="max-h-44 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl mt-1">
                          {clients
                            .filter(c => {
                              const q = notifClientSearch.toLowerCase();
                              return (c.full_name || '').toLowerCase().includes(q) ||
                                (c.email || '').toLowerCase().includes(q) ||
                                (c.dni || '').toLowerCase().includes(q);
                            })
                            .slice(0, 20)
                            .map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => { setNotifForm({ ...notifForm, clientId: c.id }); setNotifClientSearch(c.full_name || c.email || ''); }}
                                className={cn("w-full text-left px-3 py-2 text-xs border-b border-slate-50 dark:border-slate-800/50 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 border-x-0 border-t-0 bg-transparent",
                                  notifForm.clientId === c.id ? "bg-love/10" : "")}
                              >
                                <span className="font-black !text-slate-900">{c.full_name || 'Sin nombre'}</span>
                                <span className="text-slate-400 ml-2">{c.email} · DNI {c.dni}</span>
                              </button>
                            ))}
                        </div>
                      )}
                      {notifForm.clientId && (
                        <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wide pl-1 mt-1">Cliente seleccionado ✓</p>
                      )}
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer select-none pl-1">
                    <input
                      type="checkbox"
                      checked={notifForm.alsoEmail}
                      onChange={(e) => setNotifForm({ ...notifForm, alsoEmail: e.target.checked })}
                      className="w-4 h-4 accent-love cursor-pointer"
                    />
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Enviar también por email</span>
                  </label>

                  <button
                    type="submit"
                    disabled={notifSending}
                    className="w-full py-3 bg-love text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer border-none shadow-lg shadow-love/15 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send size={13} /> {notifSending ? 'Enviando...' : 'Enviar aviso'}
                  </button>
                </form>
              </div>

              {/* Avisos enviados */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none">
                <h3 className="text-sm font-black uppercase tracking-wider !text-slate-900 mb-4">Últimos avisos enviados</h3>
                {sentNotifications.length === 0 ? (
                  <p className="text-center py-6 text-[10px] uppercase tracking-widest text-slate-400 font-bold">Todavía no enviaste avisos</p>
                ) : (
                  <div className="space-y-2">
                    {sentNotifications.map((n) => (
                      <div key={n.id} className="border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black !text-slate-900">{n.title}</p>
                          <span className={cn("text-[8px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full",
                            n.client_id ? "bg-amber-500/10 text-amber-600" : "bg-love/10 text-love")}>
                            {n.client_id ? 'Cliente puntual' : 'Todos'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Campañas por fecha */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={18} className="text-love" />
                  <h3 className="text-sm font-black uppercase tracking-wider !text-slate-900">Campañas programadas</h3>
                </div>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-5">Se envían solas en la fecha elegida (las revisa el sistema cada día)</p>

                <form onSubmit={handleCreateCampaign} className="space-y-3">
                  <input type="text" maxLength={80} placeholder="Título (ej: ¡Feliz Navidad!)"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-bold"
                    value={campaignForm.title}
                    onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })} />

                  <textarea rows={3} maxLength={300} placeholder="Mensaje... (podés usar {nombre})"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-love text-ink dark:text-white font-bold resize-none"
                    value={campaignForm.message}
                    onChange={(e) => setCampaignForm({ ...campaignForm, message: e.target.value })} />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Fecha de envío</label>
                      <input type="date"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold"
                        value={campaignForm.send_date}
                        onChange={(e) => setCampaignForm({ ...campaignForm, send_date: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Destinatarios</label>
                      <select
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold"
                        value={campaignForm.target}
                        onChange={(e) => setCampaignForm({ ...campaignForm, target: e.target.value })}>
                        <option value="all">Todos</option>
                        <option value="fan">Solo CRAFT FAN</option>
                        <option value="gold">Solo CRAFT GOLD</option>
                        <option value="black">Solo CRAFT BLACK</option>
                        <option value="inactive">Solo inactivos (60 días)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest pl-1">Canal</label>
                      <select
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-love text-ink dark:text-white font-bold"
                        value={campaignForm.channel}
                        onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}>
                        <option value="both">Campanita + Email</option>
                        <option value="app">Solo campanita</option>
                        <option value="email">Solo email</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none pb-2.5">
                      <input type="checkbox" className="w-4 h-4 accent-love cursor-pointer"
                        checked={campaignForm.yearly}
                        onChange={(e) => setCampaignForm({ ...campaignForm, yearly: e.target.checked })} />
                      <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Repetir cada año</span>
                    </label>
                  </div>

                  <button type="submit" disabled={campaignSaving}
                    className="w-full py-3 bg-love text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer border-none shadow-lg shadow-love/15 flex items-center justify-center gap-2 disabled:opacity-50">
                    <Calendar size={13} /> {campaignSaving ? 'Programando...' : 'Programar campaña'}
                  </button>
                </form>

                {campaignsList.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400">Programadas</h4>
                    {campaignsList.map((c) => (
                      <div key={c.id} className="border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black !text-slate-900">{c.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{c.message}</p>
                          <p className="text-[8px] uppercase tracking-widest text-slate-400 font-bold mt-1.5">
                            {c.send_date}{c.yearly ? ' · cada año' : ''} · {c.target} · {c.channel}
                          </p>
                        </div>
                        <button type="button" onClick={() => handleDeleteCampaign(c.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 border-none bg-transparent cursor-pointer shrink-0">
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-6">
              {/* Header block with statistics cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Puntuación de Miembros</p>
                    <h4 className="text-4xl font-black text-ink mt-2 leading-none font-mono">
                      {feedbacks.length > 0 
                        ? (feedbacks.reduce((acc, current) => acc + current.rating, 0) / feedbacks.length).toFixed(1) 
                        : '5.0'}
                      <span className="text-sm font-bold text-slate-400"> / 5.0</span>
                    </h4>
                  </div>
                  <div className="flex items-center gap-1 mt-4">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const avg = feedbacks.length > 0 
                        ? (feedbacks.reduce((acc, current) => acc + current.rating, 0) / feedbacks.length) 
                        : 5;
                      return (
                        <Star 
                          key={star} 
                          size={20} 
                          className={cn(
                            star <= Math.round(avg) 
                              ? "fill-yellow-400 text-yellow-400" 
                              : "text-slate-200"
                          )} 
                        />
                      );
                    })}
                    <span className="text-xs font-bold text-slate-400 ml-2">Promedio General</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total de Opiniones</p>
                    <h4 className="text-4xl font-black text-love mt-2 leading-none font-mono">
                      {feedbacks.length}
                    </h4>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
                    Calificaciones enviadas por clientes al canjear
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Índice de Recomendación</p>
                    <h4 className="text-4xl font-black text-ink mt-2 leading-none font-mono">
                      {feedbacks.length > 0 
                        ? Math.round((feedbacks.filter(f => f.rating >= 4).length / feedbacks.length) * 100) 
                        : '100'}%
                    </h4>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
                    Clientes que puntuaron con 4 o 5 estrellas
                  </p>
                </div>
              </div>

              {/* Feedbacks reviews table/cards */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-love/10 rounded-xl flex items-center justify-center text-love">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-ink">Registro de <span className="text-love">Valoraciones</span></h3>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-1">Comentarios recibidos del Club CRAFT en tiempo real</p>
                  </div>
                </div>

                {feedbacks.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                    No se han registrado valoraciones aún.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedbacks.map((f, idx) => (
                      <motion.div
                        key={f.id || idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-2xl bg-slate-50 border border-slate-200/60 hover:border-love/30 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-love/10 text-love text-xs font-black flex items-center justify-center uppercase shrink-0">
                              {(f.client_name || 'C').charAt(0)}
                            </span>
                            <div>
                              <h5 className="font-extrabold text-sm text-ink leading-tight">{f.client_name}</h5>
                              <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">
                                Canjeado: <span className="text-love font-bold">{f.prize_title || 'General'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 pl-10">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                size={14} 
                                className={cn(
                                  star <= f.rating 
                                    ? "fill-yellow-400 text-yellow-400" 
                                    : "text-slate-200"
                                )} 
                              />
                            ))}
                            <span className="text-[10px] font-mono text-slate-400 ml-2">
                              {new Date(f.created_at).toLocaleDateString('es-AR')} - {new Date(f.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                            </span>
                          </div>

                          {f.comment && (
                            <div className="pl-10">
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium italic border-l-2 border-slate-200 pl-3 py-1">
                                "{f.comment}"
                              </p>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleDeleteFeedback(f.id)}
                          className="self-center p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-love hover:border-love/20 shadow-sm transition-all shrink-0 cursor-pointer self-start sm:self-center bg-transparent"
                          title="Eliminar comentario"
                          type="button"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
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
              className="bg-white border border-slate-200 p-8 rounded-xl w-full max-w-md shadow-2xl relative"
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
              className="bg-white border border-slate-200 p-8 rounded-xl w-full max-w-md shadow-2xl relative"
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
    </div>
  );
}
