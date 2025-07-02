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
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase client created successfully');
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error);
}

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

  // Authentication
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

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
        status: clientData.status || 'In Progress',
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
      const clientName = clients.find(c => c.id === clientId)?.name || 'Unknown';
      console.log('🗑️ Deleting client:', clientName);
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
      
      if (error) throw error;
      
      console.log('✅ Client deleted successfully');
      await loadClientsSafely();
      
      // Add audit log entry
      try {
        await supabase.from('audit_log').insert([{
          client_id: clientId,
          action: 'Client Deleted',
          field_name: 'All Fields',
          old_value: clientName,
          new_value: `Deleted by ${user.email}`,
          user_id: user.id,
          created_at: new Date().toISOString()
        }]);
        await loadAuditLogSafely();
      } catch (auditError) {
        console.log('⚠️ Audit log failed:', auditError);
      }
    } catch (error) {
      console.error('❌ Error deleting client:', error);
      setError('Failed to delete client: ' + error.message);
    }
  };

  // Dashboard stats
  const totalOnboardings = clients.length;
  const totalTMCs = [...new Set(clients.flatMap(c => c.tmcs?.map(t => t.value) || []))].length;
  const totalSSOs = [...new Set(clients.flatMap(c => c.sso_systems?.map(s => s.value) || []))].length;
  
  const statusBreakdown = clients.reduce((acc, client) => {
    acc[client.status] = (acc[client.status] || 0) + 1;
    return acc;
  }, {});
  const statusChartData = Object.entries(statusBreakdown).map(([status, count]) => ({
    name: status,
    value: count
  }));

  const tmcCounts = clients.flatMap(c => c.tmcs?.map(t => t.value) || [])
    .reduce((acc, tmc) => {
      acc[tmc] = (acc[tmc] || 0) + 1;
      return acc;
    }, {});
  const mostIntegratedTMC = Object.keys(tmcCounts).reduce((a, b) => tmcCounts[a] > tmcCounts[b] ? a : b, '') || 'None';
  const tmcChartData = Object.entries(tmcCounts).map(([tmc, count]) => ({
    name: tmc,
    value: count
  }));

  const ssoCounts = clients.flatMap(c => c.sso_systems?.map(s => s.value) || [])
    .reduce((acc, sso) => {
      acc[sso] = (acc[sso] || 0) + 1;
      return acc;
    }, {});
  const mostIntegratedSSO = Object.keys(ssoCounts).reduce((a, b) => ssoCounts[a] > ssoCounts[b] ? a : b, '') || 'None';
  const ssoChartData = Object.entries(ssoCounts).map(([sso, count]) => ({
    name: sso,
    value: count
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

  const HoverTooltip = ({ data, title, type }) => {
    return (
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-[100]">
        <h4 className="font-semibold text-gray-800 mb-3 text-center">{title}</h4>
        {type === 'count' ? (
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          data.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )
        )}
      </div>
    );
  };

  const filteredClients = clients
    .filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.status.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
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
        <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[40px] bg-white">
          {tags.map((tag, index) => (
            <div key={index} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
              <span>{tag.value}</span>
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-1 text-blue-600 hover:text-blue-800"
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
            className="flex-1 min-w-[120px] outline-none"
          />
        </div>
        {tags.map((tag, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-700">{tag.value}:</span>
            <input
              type="text"
              value={tag.comment}
              onChange={(e) => updateTagComment(index, e.target.value)}
              placeholder="Add comment..."
              className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
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
          status: client.status || 'In Progress',
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
        status: 'In Progress',
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
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8 max-h-screen overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6">{client ? 'Edit Client' : 'Add New Client'}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="In Progress">In Progress</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SSO Systems</label>
              <TagInput
                tags={formData.sso_systems}
                onTagsChange={(tags) => setFormData({...formData, sso_systems: tags})}
                placeholder="Type SSO system and press Enter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">HR Integrations</label>
              <TagInput
                tags={formData.hr_integrations}
                onTagsChange={(tags) => setFormData({...formData, hr_integrations: tags})}
                placeholder="Type HR integration and press Enter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenants</label>
              <TagInput
                tags={formData.tenants}
                onTagsChange={(tags) => setFormData({...formData, tenants: tags})}
                placeholder="Type tenant and press Enter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TMCs</label>
              <TagInput
                tags={formData.tmcs}
                onTagsChange={(tags) => setFormData({...formData, tmcs: tags})}
                placeholder="Type TMC and press Enter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="General notes about this client..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
              <textarea
                value={formData.comments}
                onChange={(e) => setFormData({...formData, comments: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Overall comments..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8 max-h-screen overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{client.name}</h2>
            <div className="flex space-x-2">
              <button
                onClick={onEdit}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                <Edit3 size={14} />
                Edit
              </button>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
              <span className={`px-2 py-1 rounded-full text-sm ${
                client.status === 'Active' ? 'bg-green-100 text-green-800' :
                client.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                client.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {client.status}
              </span>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Last Updated</h3>
              <p className="text-gray-600">{new Date(client.updated_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">SSO Systems</h3>
              <div className="space-y-2">
                {(client.sso_systems || []).map((sso, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded">
                    <span className="font-medium">{sso.value}</span>
                    {sso.comment && <p className="text-sm text-gray-600">{sso.comment}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">HR Integrations</h3>
              <div className="space-y-2">
                {(client.hr_integrations || []).map((hr, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded">
                    <span className="font-medium">{hr.value}</span>
                    {hr.comment && <p className="text-sm text-gray-600">{hr.comment}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Tenants</h3>
              <div className="space-y-2">
                {(client.tenants || []).map((tenant, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded">
                    <span className="font-medium">{tenant.value}</span>
                    {tenant.comment && <p className="text-sm text-gray-600">{tenant.comment}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">TMCs</h3>
              <div className="space-y-2">
                {(client.tmcs || []).map((tmc, index) => (
