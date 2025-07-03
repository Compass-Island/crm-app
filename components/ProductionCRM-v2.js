import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Eye, BarChart3, Users, Building, Shield, History, LogOut } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { createClient } from '@supabase/supabase-js';

// Bulletproof Supabase configuration with fallbacks
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lyjknyqycyvudhkgohqv.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5amtueXF5Y3l2dWRoa2dvaHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0Njg0MDgsImV4cCI6MjA2NzA0NDQwOH0.Uu7pGeWUv9hrv2cS6dgZu5HumgvNFRDAosENf4tRzxw';

console.log('🚀 CI360 CRM Starting...');
console.log('📍 Supabase URL:', SUPABASE_URL);
console.log('🔑 Supabase Key exists:', !!SUPABASE_ANON_KEY);

let supabase;
try {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing required Supabase environment variables');
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase client created successfully');
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error);
}

// Debounced Search Hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// Memoized Dashboard Stats Hook
const useDashboardStats = (clients) => {
  return useMemo(() => {
    const totalOnboardings = clients.length;
    
    // Case-insensitive TMC counting
    const tmcCounts = clients.flatMap(c => c.tmcs?.map(t => t.value) || [])
      .reduce((acc, tmc) => {
        const lowerTmc = tmc.toLowerCase();
        const existingKey = Object.keys(acc).find(key => key.toLowerCase() === lowerTmc);
        if (existingKey) {
          acc[existingKey] = acc[existingKey] + 1;
        } else {
          acc[tmc] = 1;
        }
        return acc;
      }, {});
    
    // Case-insensitive SSO counting
    const ssoCounts = clients.flatMap(c => c.sso_systems?.map(s => s.value) || [])
      .reduce((acc, sso) => {
        const lowerSso = sso.toLowerCase();
        const existingKey = Object.keys(acc).find(key => key.toLowerCase() === lowerSso);
        if (existingKey) {
          acc[existingKey] = acc[existingKey] + 1;
        } else {
          acc[sso] = 1;
        }
        return acc;
      }, {});
    
    const statusBreakdown = clients.reduce((acc, client) => {
      acc[client.status] = (acc[client.status] || 0) + 1;
      return acc;
    }, {});
    
    const totalTMCs = [...new Set(clients.flatMap(c => c.tmcs?.map(t => t.value.toLowerCase()) || []))].length;
    const totalSSOs = [...new Set(clients.flatMap(c => c.sso_systems?.map(s => s.value.toLowerCase()) || []))].length;
    const mostIntegratedTMC = Object.keys(tmcCounts).reduce((a, b) => tmcCounts[a] > tmcCounts[b] ? a : b, '') || 'None';
    const mostIntegratedSSO = Object.keys(ssoCounts).reduce((a, b) => ssoCounts[a] > ssoCounts[b] ? a : b, '') || 'None';
    
    return {
      totalOnboardings,
      totalTMCs,
      totalSSOs,
      mostIntegratedTMC,
      mostIntegratedSSO,
      statusChartData: Object.entries(statusBreakdown).map(([status, count]) => ({ name: status, value: count })),
      tmcChartData: Object.entries(tmcCounts).map(([tmc, count]) => ({ name: tmc, value: count })),
      ssoChartData: Object.entries(ssoCounts).map(([sso, count]) => ({ name: sso, value: count }))
    };
  }, [clients]);
};

// Optimized Client Filtering Hook
const useFilteredClients = (clients, searchTerm, sortField, sortDirection) => {
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms debounce
  
  return useMemo(() => {
    let filtered = clients;
    
    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = clients.filter(client => 
        client.name.toLowerCase().includes(searchLower) ||
        client.status.toLowerCase().includes(searchLower) ||
        (client.sso_systems || []).some(sso => sso.value.toLowerCase().includes(searchLower)) ||
        (client.tmcs || []).some(tmc => tmc.value.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [clients, debouncedSearchTerm, sortField, sortDirection]);
};

// Pagination Hook
const usePagination = (items, itemsPerPage = 50) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = items.slice(startIndex, endIndex);
  
  const goToPage = useCallback((page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);
  
  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);
  
  const goToPrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);
  
  // Reset to page 1 when items change
  useEffect(() => {
    setCurrentPage(1);
  }, [items.length]);
  
  return {
    currentItems,
    currentPage,
    totalPages,
    totalItems: items.length,
    goToPage,
    goToNextPage,
    goToPrevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    startIndex: startIndex + 1,
    endIndex: Math.min(endIndex, items.length)
  };
};

const ProductionCRM = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [clientComments, setClientComments] = useState({});

  // Authentication
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Load client comments
  const loadClientComments = async (clientId) => {
    try {
      if (!supabase?.from) {
        console.log('⚠️ Supabase client not available for comments');
        return [];
      }

      const { data, error } = await supabase
        .from('client_comments')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('❌ Error loading comments:', error);
        return [];
      }
      
      console.log('✅ Loaded', data?.length || 0, 'comments for client', clientId);
      return data || [];
    } catch (error) {
      console.error('❌ Comments loading failed:', error);
      return [];
    }
  };

  // Updated color palette with vibrant colors
  const COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6366F1'  // Indigo
  ];

  useEffect(() => {
    console.log('🔄 Starting authentication check...');
    
    // Set timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ Loading timeout reached, forcing login screen');
      setLoading(false);
      setError('Connection timeout - please try logging in');
    }, 10000); // 10 second timeout

    checkUserWithFallback().finally(() => {
      clearTimeout(loadingTimeout);
    });

    // Auth state listener with error handling
    let subscription;
    try {
      if (supabase?.auth) {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('🔄 Auth state changed:', event, 'User:', session?.user?.id);
          clearTimeout(loadingTimeout);
          
          if (session?.user?.id) {
            setUser(session.user);
            setError(null);
            await loadDataSafely();
          } else {
            setUser(null);
            setClients([]);
            setAuditLog([]);
          }
          setLoading(false);
        });
        subscription = data.subscription;
      }
    } catch (error) {
      console.error('❌ Auth listener setup failed:', error);
      setLoading(false);
    }

    return () => {
      clearTimeout(loadingTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  const checkUserWithFallback = async () => {
    try {
      console.log('🔍 Checking current user session...');
      
      if (!supabase?.auth) {
        throw new Error('Supabase client not available');
      }

      const { data: { session }, error } = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 8000)
        )
      ]);

      if (error) {
        console.error('❌ Session check error:', error);
        throw error;
      }

      console.log('📋 Session check result:', session?.user?.id ? 'Found user' : 'No session');

      if (session?.user?.id) {
        setUser(session.user);
        setError(null);
        await loadDataSafely();
      }
    } catch (error) {
      console.error('❌ User check failed:', error);
      setError('Authentication check failed - please try logging in');
    } finally {
      setLoading(false);
    }
  };

  const loadDataSafely = async () => {
    console.log('📊 Loading shared data...');
    try {
      await Promise.all([
        loadClientsSafely(),
        loadAuditLogSafely()
      ]);
      console.log('✅ Data loading completed');
    } catch (error) {
      console.error('❌ Data loading failed:', error);
    }
  };

  const signIn = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);
    
    console.log('🔐 Attempting sign in...');
    
    try {
      if (!supabase?.auth) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await Promise.race([
        supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign in timeout')), 10000)
        )
      ]);

      if (error) {
        console.error('❌ Sign in error:', error);
        throw error;
      }

      if (data?.user?.id) {
        console.log('✅ Sign in successful:', data.user.id);
        setError(null);
      } else {
        throw new Error('No user returned from sign in');
      }
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      setError('Sign in failed: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      if (supabase?.auth) {
        await supabase.auth.signOut();
      }
      setUser(null);
      setClients([]);
      setAuditLog([]);
      setError(null);
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const loadClientsSafely = async () => {
    try {
      if (!supabase?.from) {
        console.log('⚠️ Supabase client not available for clients');
        return;
      }

      // Load ALL clients for ALL users - no user filtering
      const { data, error } = await Promise.race([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Clients query timeout')), 8000)
        )
      ]);
      
      if (error) {
        console.error('❌ Error loading clients:', error);
        if (!error.message.includes('relation')) {
          setError('Failed to load clients: ' + error.message);
        }
        return;
      }
      
      console.log('✅ Loaded', data?.length || 0, 'clients');
      setClients(data || []);
    } catch (error) {
      console.error('❌ Clients loading failed:', error);
    }
  };

  const loadAuditLogSafely = async () => {
    try {
      if (!supabase?.from) {
        console.log('⚠️ Supabase client not available for audit log');
        return;
      }

      // Load ALL audit logs for ALL users - no user filtering
      const { data, error } = await Promise.race([
        supabase.from('audit_log').select('*').order('created_at', { ascending: false }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Audit log query timeout')), 8000)
        )
      ]);
      
      if (error) {
        console.error('❌ Error loading audit log:', error);
        if (!error.message.includes('relation')) {
          setError('Failed to load audit log: ' + error.message);
        }
        return;
      }
      
      console.log('✅ Loaded', data?.length || 0, 'audit log entries');
      setAuditLog(data || []);
    } catch (error) {
      console.error('❌ Audit log loading failed:', error);
    }
  };

  const saveClient = async (clientData) => {
    if (!user?.id) {
      setError('User not authenticated');
      return;
    }
    
    try {
      console.log('💾 Saving client:', clientData.name);
      
      const clientToSave = {
        name: clientData.name,
        status: clientData.status || 'Onboarding',
        sso_systems: clientData.sso_systems || [],
        hr_integrations: clientData.hr_integrations || [],
        tenants: clientData.tenants || [],
        tmcs: clientData.tmcs || [],
        notes: clientData.notes || '',
        comments: clientData.comments || '',
        user_id: user.id // Keep for audit purposes, but doesn't restrict access
      };

      let result;
      if (clientData.id && clientData.id !== 'new') {
        result = await supabase
          .from('clients')
          .update({
            ...clientToSave,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientData.id);
      } else {
        result = await supabase
          .from('clients')
          .insert([{
            ...clientToSave,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
      }
      
      if (result.error) {
        throw result.error;
      }
      
      console.log('✅ Client saved successfully');
      await loadClientsSafely();
      
      // Add audit log entry
      try {
        await supabase.from('audit_log').insert([{
          client_id: clientData.id === 'new' ? null : clientData.id,
          action: clientData.id && clientData.id !== 'new' ? 'Client Updated' : 'Client Created',
          field_name: 'All Fields',
          old_value: '',
          new_value: `Client: ${clientData.name} (by ${user.email})`,
          user_id: user.id,
          created_at: new Date().toISOString()
        }]);
        await loadAuditLogSafely();
      } catch (auditError) {
        console.log('⚠️ Audit log failed:', auditError);
      }
      
    } catch (error) {
      console.error('❌ Error saving client:', error);
      setError('Failed to save client: ' + error.message);
    }
  };

  const deleteClient = async (clientId) => {
    if (!user?.id) return;
    
    try {
      const clientToDelete = clients.find(c => c.id === clientId);
      const clientName = clientToDelete?.name || 'Unknown';
      console.log('🗑️ Deleting client:', clientName);
      
      // Add audit log entry BEFORE deletion (so we have the data)
      try {
        await supabase.from('audit_log').insert([{
          client_id: clientId,
          action: 'Client Deleted',
          field_name: 'All Fields',
          old_value: `${clientName} - Status: ${clientToDelete?.status}, SSO: ${(clientToDelete?.sso_systems || []).map(s => s.value).join(', ')}, TMCs: ${(clientToDelete?.tmcs || []).map(t => t.value).join(', ')}`,
          new_value: `Deleted by ${user.email}`,
          user_id: user.id,
          created_at: new Date().toISOString()
        }]);
      } catch (auditError) {
        console.log('⚠️ Pre-deletion audit log failed:', auditError);
      }
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
      
      if (error) throw error;
      
      console.log('✅ Client deleted successfully');
      await loadClientsSafely();
      await loadAuditLogSafely();
      
    } catch (error) {
      console.error('❌ Error deleting client:', error);
      setError('Failed to delete client: ' + error.message);
    }
  };

  // Add a new comment to a client
  const addComment = async (clientId, commentText) => {
    if (!user?.id || !commentText.trim()) return;
    
    try {
      console.log('💬 Adding comment to client:', clientId);
      
      const { error } = await supabase.from('client_comments').insert([{
        client_id: clientId,
        comment: commentText.trim(),
        user_id: user.id,
        user_email: user.email,
        created_at: new Date().toISOString()
      }]);
      
      if (error) throw error;
      
      console.log('✅ Comment added successfully');
      
      // Also add to audit log
      await supabase.from('audit_log').insert([{
        client_id: clientId,
        action: 'Comment Added',
        field_name: 'Comments',
        old_value: '',
        new_value: `"${commentText.trim()}" by ${user.email}`,
        user_id: user.id,
        created_at: new Date().toISOString()
      }]);
      
      await loadAuditLogSafely();
      
    } catch (error) {
      console.error('❌ Error adding comment:', error);
      setError('Failed to add comment: ' + error.message);
    }
  };

  // Dashboard stats - Now using memoized hook
  const dashboardStats = useDashboardStats(clients);
  const {
    totalOnboardings,
    totalTMCs,
    totalSSOs,
    mostIntegratedTMC,
    mostIntegratedSSO,
    statusChartData,
    tmcChartData,
    ssoChartData
  } = dashboardStats;

  // Optimized client filtering and pagination
  const filteredClients = useFilteredClients(clients, searchTerm, sortField, sortDirection);
  const pagination = usePagination(filteredClients, 50); // 50 clients per page

  // Custom Pie Chart Component using SVG
  const CustomPieChart = ({ data, size = 200 }) => {
    if (!data || data.length === 0) return null;
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    const radius = size / 2 - 10;
    const centerX = size / 2;
    const centerY = size / 2;
    
    const createPath = (startAngle, endAngle, radius, centerX, centerY) => {
      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (endAngle * Math.PI) / 180;
      
      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);
      
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;
      
      return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    };
    
    return (
      <div className="flex flex-col items-center">
        <svg width={size} height={size} className="drop-shadow-lg">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const angle = (item.value / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;
            
            const path = createPath(startAngle, endAngle, radius, centerX, centerY);
            currentAngle += angle;
            
            return (
              <path
                key={index}
                d={path}
                fill={COLORS[index % COLORS.length]}
                stroke="#1f2937"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity"
              />
            );
          })}
          
          {/* Center circle for donut effect */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.4}
            fill="#1f2937"
            stroke="#374151"
            strokeWidth="2"
          />
        </svg>
        
        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 max-w-xs">
          {data.map((entry, index) => {
            const percentage = ((entry.value / total) * 100).toFixed(1);
            return (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-xs text-gray-300 truncate">{entry.name}</span>
                <span className="text-xs font-medium text-gray-100">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const HoverTooltip = ({ data, title, type }) => {
    if (!data || data.length === 0) return null;
    
    return (
      <div 
        className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-6 pointer-events-none"
        style={{ 
          zIndex: 10000,
          width: '400px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        <h4 className="font-semibold text-gray-200 mb-4 text-center">{title}</h4>
        {type === 'count' ? (
          <div className="space-y-3">
            {data.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-sm text-gray-300">{item.name}</span>
                </div>
                <span className="font-medium text-gray-100">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <CustomPieChart data={data} size={280} />
          </div>
        )}
      </div>
    );
  };

  const filteredClients = useFilteredClients(clients, searchTerm, sortField, sortDirection);
  const pagination = usePagination(filteredClients, 50); // 50 clients per page

  // Pagination Component
  const PaginationControls = () => {
    const { currentPage, totalPages, totalItems, goToPage, goToNextPage, goToPrevPage, hasNextPage, hasPrevPage, startIndex, endIndex } = pagination;
    
    // Generate page numbers to show
    const getPageNumbers = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];
      
      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }
      
      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }
      
      rangeWithDots.push(...range);
      
      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }
      
      return rangeWithDots;
    };
    
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center text-sm text-gray-400">
          Showing {startIndex} to {endIndex} of {totalItems} clients
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPrevPage}
            disabled={!hasPrevPage}
            className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
          >
            Previous
          </button>
          
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && goToPage(page)}
              disabled={page === '...'}
              className={`px-3 py-1 text-sm rounded ${
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : page === '...'
                  ? 'text-gray-500 cursor-default'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {page}
            </button>
          ))}
          
          <button
            onClick={goToNextPage}
            disabled={!hasNextPage}
            className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  const TagInput = ({ tags, onTagsChange, placeholder }) => {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault();
        const newTag = { value: inputValue.trim(), comment: '' };
        onTagsChange([...tags, newTag]);
        setInputValue('');
      }
    };

    const removeTag = (index) => {
      onTagsChange(tags.filter((_, i) => i !== index));
    };

    const updateTagComment = (index, comment) => {
      const updatedTags = [...tags];
      updatedTags[index] = { ...updatedTags[index], comment };
      onTagsChange(updatedTags);
    };

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 p-2 border border-gray-600 rounded-md min-h-[40px] bg-gray-700">
          {tags.map((tag, index) => (
            <div key={index} className="flex items-center bg-gray-600 text-gray-200 px-2 py-1 rounded-md text-sm">
              <span>{tag.value}</span>
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-1 text-gray-300 hover:text-gray-100"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-gray-100 placeholder-gray-400"
          />
        </div>
        {tags.map((tag, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-300">{tag.value}:</span>
            <input
              type="text"
              value={tag.comment}
              onChange={(e) => updateTagComment(index, e.target.value)}
              placeholder="Add comment..."
              className="flex-1 px-2 py-1 border border-gray-600 rounded text-sm bg-gray-700 text-gray-100 placeholder-gray-400"
            />
          </div>
        ))}
      </div>
    );
  };

  const ClientForm = ({ client, onSave, onCancel }) => {
    const [formData, setFormData] = useState(() => {
      if (client) {
        return {
          name: client.name || '',
          status: client.status || 'Onboarding',
          sso_systems: client.sso_systems || [],
          hr_integrations: client.hr_integrations || [],
          tenants: client.tenants || [],
          tmcs: client.tmcs || [],
          notes: client.notes || '',
          comments: client.comments || ''
        };
      }
      return {
        name: '',
        status: 'Onboarding',
        sso_systems: [],
        hr_integrations: [],
        tenants: [],
        tmcs: [],
        notes: '',
        comments: ''
      };
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (!formData.name || formData.name.trim() === '') {
        alert('Please enter a client name');
        return;
      }
      
      const clientData = {
        ...formData,
        name: formData.name.trim(),
        id: client?.id || 'new'
      };
      
      await saveClient(clientData);
      onSave();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full my-8 max-h-screen overflow-y-auto border border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-gray-100">{client ? 'Edit Client' : 'Add New Client'}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Client Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-700 text-gray-100 placeholder-gray-400"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-700 text-gray-100"
                >
                  <option value="Onboarding">Onboarding</option>
                  <option value="Active">Active</option>
                  <option value="Offboarded">Offboarded</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">SSO Systems</label>
              <TagInput
                tags={formData.sso_systems}
                onTagsChange={(tags) => setFormData({...formData, sso_systems: tags})}
                placeholder="Type SSO system and press Enter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">HR Integrations</label>
              <TagInput
                tags={formData.hr_integrations}
                onTagsChange={(tags) => setFormData({...formData, hr_integrations: tags})}
                placeholder="Type HR integration and press Enter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tenants</label>
              <TagInput
                tags={formData.tenants}
                onTagsChange={(tags) => setFormData({...formData, tenants: tags})}
                placeholder="Type tenant and press Enter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">TMCs</label>
              <TagInput
                tags={formData.tmcs}
                onTagsChange={(tags) => setFormData({...formData, tmcs: tags})}
                placeholder="Type TMC and press Enter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-700 text-gray-100 placeholder-gray-400"
                placeholder="General notes about this client..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Comments</label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({...formData, comments: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-700 text-gray-100 placeholder-gray-400"
                placeholder="Overall comments..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
              >
                {client ? 'Update Client' : 'Add Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ClientDetails = ({ client, onClose, onEdit }) => {
    const clientAuditLog = auditLog.filter(log => log.client_id === client.id);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [addingComment, setAddingComment] = useState(false);
    
    // Load comments when component mounts
    useEffect(() => {
      const loadComments = async () => {
        setLoadingComments(true);
        const commentsData = await loadClientComments(client.id);
        setComments(commentsData);
        setLoadingComments(false);
      };
      
      loadComments();
    }, [client.id]);
    
    const handleAddComment = async (e) => {
      e.preventDefault();
      if (!newComment.trim()) return;
      
      setAddingComment(true);
      await addComment(client.id, newComment);
      
      // Reload comments to show the new one
      const updatedComments = await loadClientComments(client.id);
      setComments(updatedComments);
      setNewComment('');
      setAddingComment(false);
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-gray-800 rounded-lg p-6 max-w-6xl w-full my-8 max-h-screen overflow-y-auto border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-100">{client.name}</h2>
            <div className="flex space-x-2">
              <button
                onClick={onEdit}
                className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors flex items-center gap-1"
              >
                <Edit3 size={14} />
                Edit
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Client Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Status</h3>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    client.status === 'Active' ? 'bg-green-800 text-green-200' :
                    client.status === 'Onboarding' ? 'bg-blue-800 text-blue-200' :
                    client.status === 'Offboarded' ? 'bg-red-800 text-red-200' :
                    'bg-gray-600 text-gray-200'
                  }`}>
                    {client.status}
                  </span>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Last Updated</h3>
                  <p className="text-gray-400">{new Date(client.updated_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">SSO Systems</h3>
                  <div className="space-y-2">
                    {(client.sso_systems || []).map((sso, index) => (
                      <div key={index} className="bg-gray-700 p-2 rounded">
                        <span className="font-medium text-gray-200">{sso.value}</span>
                        {sso.comment && <p className="text-sm text-gray-400">{sso.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">HR Integrations</h3>
                  <div className="space-y-2">
                    {(client.hr_integrations || []).map((hr, index) => (
                      <div key={index} className="bg-gray-700 p-2 rounded">
                        <span className="font-medium text-gray-200">{hr.value}</span>
                        {hr.comment && <p className="text-sm text-gray-400">{hr.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Tenants</h3>
                  <div className="space-y-2">
                    {(client.tenants || []).map((tenant, index) => (
                      <div key={index} className="bg-gray-700 p-2 rounded">
                        <span className="font-medium text-gray-200">{tenant.value}</span>
                        {tenant.comment && <p className="text-sm text-gray-400">{tenant.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">TMCs</h3>
                  <div className="space-y-2">
                    {(client.tmcs || []).map((tmc, index) => (
                      <div key={index} className="bg-gray-700 p-2 rounded">
                        <span className="font-medium text-gray-200">{tmc.value}</span>
                        {tmc.comment && <p className="text-sm text-gray-400">{tmc.comment}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Notes</h3>
                  <p className="text-gray-400 bg-gray-700 p-3 rounded">{client.notes}</p>
                </div>
              </div>
            </div>

            {/* Right Column - Timeline */}
            <div className="space-y-6">
              {/* Comments Timeline */}
              <div>
                <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  💬 Comments Timeline
                </h3>
                
                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="mb-4">
                  <div className="flex flex-col gap-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-700 text-gray-100 placeholder-gray-400 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || addingComment}
                      className="self-end px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {addingComment ? 'Adding...' : 'Add Comment'}
                    </button>
                  </div>
                </form>

                {/* Comments Display */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {loadingComments ? (
                    <div className="text-gray-400 text-center py-4">Loading comments...</div>
                  ) : comments.length > 0 ? (
                    comments.map((comment, index) => (
                      <div key={index} className="bg-gray-700 p-3 rounded-lg border-l-4 border-blue-500">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-blue-300 text-sm">{comment.user_email}</span>
                          <span className="text-gray-400 text-xs">{new Date(comment.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-200 text-sm leading-relaxed">{comment.comment}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-center py-4">No comments yet. Be the first to add one!</div>
                  )}
                </div>
              </div>

              {/* Audit Log */}
              <div>
                <h3 className="font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <History size={16} />
                  Activity Log
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {clientAuditLog.length > 0 ? clientAuditLog.map((log, index) => (
                    <div key={index} className="bg-gray-700 p-3 rounded text-sm border-l-4 border-gray-500">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-200">{log.action}</span>
                        <span className="text-gray-400 text-xs">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-gray-300">
                        <span className="font-medium">Field:</span> {log.field_name}
                      </div>
                      {log.old_value && (
                        <div className="text-gray-400 text-xs">
                          <span className="font-medium">Previous:</span> {log.old_value}
                        </div>
                      )}
                      <div className="text-gray-200 text-xs">
                        <span className="font-medium">New:</span> {log.new_value}
                      </div>
                    </div>
                  )) : (
                    <p className="text-gray-400 text-center py-4">No activity recorded for this client yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading state with timeout
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-4 text-gray-100">Loading CI360 CRM...</div>
          {error && (
            <div className="text-red-400 text-sm mb-4">{error}</div>
          )}
          <div className="text-gray-400 text-sm">
            If this takes more than 10 seconds, please refresh the page
          </div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-100">CI360</h1>
            <h2 className="text-xl font-semibold text-gray-300 mt-2">Client CRM</h2>
            <p className="text-gray-400 mt-2">Sign in to your account</p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900 border border-red-700 text-red-200 rounded">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {(!SUPABASE_URL || !SUPABASE_ANON_KEY) && (
            <div className="mb-4 p-3 bg-yellow-900 border border-yellow-700 text-yellow-200 rounded">
              <p className="text-sm">⚠️ Configuration issue detected</p>
            </div>
          )}
          
          <form onSubmit={signIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-700 text-gray-100 placeholder-gray-400"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-gray-700 text-gray-100 placeholder-gray-400"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-cyan-600 text-white py-2 px-4 rounded-md hover:bg-cyan-500 disabled:opacity-50 transition-colors font-medium"
            >
              {authLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 text-sm">
          {error} 
          <button 
            onClick={() => setError(null)} 
            className="ml-2 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-gray-800 shadow-sm border-b border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-100">CI360 Client CRM</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">Welcome, {user.email}</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 rounded-md ${activeTab === 'dashboard' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  <BarChart3 size={18} className="inline mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('clients')}
                  className={`px-4 py-2 rounded-md ${activeTab === 'clients' ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                  <Users size={18} className="inline mr-2" />
                  Clients
                </button>
                <button
                  onClick={() => setShowAuditLog(true)}
                  className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md"
                >
                  <History size={18} className="inline mr-2" />
                  Audit Log
                </button>
                <button
                  onClick={signOut}
                  className="px-4 py-2 text-red-400 hover:bg-red-900 rounded-md"
                >
                  <LogOut size={18} className="inline mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col flex-1 overflow-hidden">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-100">Dashboard Overview</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div 
                className="bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative hover:bg-gray-750"
                onMouseEnter={() => setHoveredCard('onboardings')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex flex-col items-center text-center">
                  <Users className="text-gray-400 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-400 mb-1">Total Onboardings</h3>
                  <p className="text-xl font-bold text-gray-100">{totalOnboardings}</p>
                </div>
              </div>
              
              <div 
                className="bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative hover:bg-gray-750"
                onMouseEnter={() => setHoveredCard('tmcs')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex flex-col items-center text-center">
                  <Building className="text-gray-400 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-400 mb-1">Total TMCs</h3>
                  <p className="text-xl font-bold text-gray-100">{totalTMCs}</p>
                </div>
              </div>

              <div 
                className="bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative hover:bg-gray-750"
                onMouseEnter={() => setHoveredCard('ssos')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex flex-col items-center text-center">
                  <Shield className="text-gray-400 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-400 mb-1">Total SSOs</h3>
                  <p className="text-xl font-bold text-gray-100">{totalSSOs}</p>
                </div>
              </div>
              
              <div 
                className="bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative hover:bg-gray-750"
                onMouseEnter={() => setHoveredCard('mostTmc')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex flex-col items-center text-center">
                  <Building className="text-gray-400 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-400 mb-1">Most Integrated TMC</h3>
                  <p className="text-sm font-bold text-gray-100">{mostIntegratedTMC}</p>
                </div>
              </div>
              
              <div 
                className="bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative hover:bg-gray-750"
                onMouseEnter={() => setHoveredCard('mostSso')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex flex-col items-center text-center">
                  <Shield className="text-gray-400 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-400 mb-1">Most Integrated SSO</h3>
                  <p className="text-sm font-bold text-gray-100">{mostIntegratedSSO}</p>
                </div>
              </div>
              
              {/* Pagination */}
              <PaginationControls />
            </div>

            {/* Floating tooltip overlay */}
            {hoveredCard === 'onboardings' && statusChartData.length > 0 && (
              <HoverTooltip 
                data={statusChartData} 
                title="Status Breakdown" 
                type="chart"
              />
            )}
            {hoveredCard === 'tmcs' && tmcChartData.length > 0 && (
              <HoverTooltip 
                data={tmcChartData} 
                title="TMC Distribution" 
                type="chart"
              />
            )}
            {hoveredCard === 'ssos' && ssoChartData.length > 0 && (
              <HoverTooltip 
                data={ssoChartData} 
                title="SSO Distribution" 
                type="chart"
              />
            )}
            {hoveredCard === 'mostTmc' && tmcChartData.length > 0 && (
              <HoverTooltip 
                data={tmcChartData} 
                title="TMC Usage Count" 
                type="count"
              />
            )}
            {hoveredCard === 'mostSso' && ssoChartData.length > 0 && (
              <HoverTooltip 
                data={ssoChartData} 
                title="SSO Usage Count" 
                type="count"
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 text-gray-100">Recent Activity</h3>
                <div className="space-y-3">
                  {auditLog.slice(0, 5).map((log, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                      <div>
                        <p className="font-medium text-sm text-gray-200">{log.action}</p>
                        <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xs bg-gray-600 text-gray-200 px-2 py-1 rounded">
                        {clients.find(c => c.id === log.client_id)?.name || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 text-gray-100">Status Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">{status}</span>
                      <span className="text-sm font-medium text-gray-100">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-100">Client Management</h2>
              <button
                onClick={() => {
                  console.log('🔄 Add Client button clicked');
                  setSelectedClient(null);
                  setIsEditing(true);
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-500 transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                Add Client
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg shadow flex-1 flex flex-col">
              <div className="p-6 border-b border-gray-700 flex-shrink-0">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-700 text-gray-100 placeholder-gray-400"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value)}
                      className="px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 bg-gray-700 text-gray-100"
                    >
                      <option value="name">Name</option>
                      <option value="status">Status</option>
                      <option value="updated_at">Last Updated</option>
                    </select>
                    <button
                      onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-2 border border-gray-600 rounded-md hover:bg-gray-700 text-gray-300"
                    >
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
                
                {/* Results info */}
                <div className="mt-4 text-sm text-gray-400">
                  {filteredClients.length !== clients.length && (
                    <>Showing {filteredClients.length} of {clients.length} clients</>
                  )}
                  {filteredClients.length > 50 && (
                    <> • Page {pagination.currentPage} of {pagination.totalPages}</>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-48">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-40">SSO Systems</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-48">TMCs</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-32">Last Updated</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-700">
                          <td className="px-6 py-4 w-48">
                            <div className="text-sm font-medium text-gray-100 break-words">{client.name}</div>
                          </td>
                          <td className="px-6 py-4 w-32">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              client.status === 'Active' ? 'bg-green-800 text-green-200' :
                              client.status === 'Onboarding' ? 'bg-blue-800 text-blue-200' :
                              client.status === 'Offboarded' ? 'bg-red-800 text-red-200' :
                              'bg-gray-600 text-gray-200'
                            }`}>
                              {client.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 w-40">
                            <div className="text-sm text-gray-300 break-words leading-relaxed">
                              {(client.sso_systems || []).map(sso => sso.value).join(', ')}
                            </div>
                          </td>
                          <td className="px-6 py-4 w-48">
                            <div className="text-sm text-gray-300 break-words leading-relaxed">
                              {(client.tmcs || []).map(tmc => tmc.value).join(', ')}
                            </div>
                          </td>
                          <td className="px-6 py-4 w-32 text-sm text-gray-400">
                            {new Date(client.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 w-24 text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setSelectedClient(client)}
                                className="text-gray-400 hover:text-gray-200"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedClient(client);
                                  setIsEditing(true);
                                }}
                                className="text-gray-400 hover:text-gray-200"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this client?')) {
                                    deleteClient(client.id);
                                  }
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isEditing && (
        <ClientForm
          client={selectedClient}
          onSave={() => {
            setIsEditing(false);
            setSelectedClient(null);
          }}
          onCancel={() => {
            setIsEditing(false);
            setSelectedClient(null);
          }}
        />
      )}

      {selectedClient && !isEditing && (
        <ClientDetails
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onEdit={() => setIsEditing(true)}
        />
      )}

      {showAuditLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full my-8 max-h-screen overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-100">Audit Log</h2>
              <button
                onClick={() => setShowAuditLog(false)}
                className="px-3 py-1 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 transition-colors"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-3">
              {auditLog.map((log, index) => (
                <div key={index} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-100">{log.action}</h3>
                      <p className="text-sm text-gray-300">Field: {log.field_name}</p>
                      {log.old_value && <p className="text-sm text-gray-400">Old: {log.old_value}</p>}
                      <p className="text-sm text-gray-200">New: {log.new_value}</p>
                      <p className="text-sm text-gray-400">Client: {clients.find(c => c.id === log.client_id)?.name || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionCRM;
