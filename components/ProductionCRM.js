import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, Eye, BarChart3, Users, Building, Shield, History, LogOut } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { createClient } from '@supabase/supabase-js';

// 🔥 REPLACE THESE WITH YOUR ACTUAL SUPABASE VALUES FROM STEP 5
const SUPABASE_URL = 'https://lyjknyqycyvudhkgohqv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5amtueXF5Y3l2dWRoa2dvaHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0Njg0MDgsImV4cCI6MjA2NzA0NDQwOH0.Uu7pGeWUv9hrv2cS6dgZu5HumgvNFRDAosENf4tRzxw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ProductionCRM = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user?.id) {
        await loadClients();
        await loadAuditLog();
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      setUser(data.user);
      if (data.user?.id) {
        await loadClients();
        await loadAuditLog();
      }
    } catch (error) {
      alert('Error signing in: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setClients([]);
      setAuditLog([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const loadClients = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadAuditLog = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAuditLog(data || []);
    } catch (error) {
      console.error('Error loading audit log:', error);
    }
  };

  const saveClient = async (clientData) => {
    if (!user?.id) return;
    
    try {
      if (clientData.id && clientData.id !== 'new') {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update({
            ...clientData,
            updated_at: new Date().toISOString(),
            user_id: user.id
          })
          .eq('id', clientData.id);
        
        if (error) throw error;
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert([{
            ...clientData,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        if (error) throw error;
      }
      
      // Reload clients
      await loadClients();
      
      // Add audit log entry
      await supabase
        .from('audit_log')
        .insert([{
          client_id: clientData.id,
          action: clientData.id && clientData.id !== 'new' ? 'Client Updated' : 'Client Created',
          field_name: 'All Fields',
          old_value: '',
          new_value: `Client: ${clientData.name}`,
          user_id: user.id
        }]);
      
      await loadAuditLog();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error saving client: ' + error.message);
    }
  };

  const deleteClient = async (clientId) => {
    if (!user?.id) return;
    
    try {
      const clientName = clients.find(c => c.id === clientId)?.name || 'Unknown';
      
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
      
      if (error) throw error;
      
      // Add audit log entry
      await supabase
        .from('audit_log')
        .insert([{
          client_id: clientId,
          action: 'Client Deleted',
          field_name: 'All Fields',
          old_value: clientName,
          new_value: '',
          user_id: user.id
        }]);
      
      await loadClients();
      await loadAuditLog();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error deleting client: ' + error.message);
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
          <div>
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
          </div>
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
                  <div key={index} className="bg-gray-50 p-2 rounded">
                    <span className="font-medium">{tmc.value}</span>
                    {tmc.comment && <p className="text-sm text-gray-600">{tmc.comment}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
              <p className="text-gray-600 bg-gray-50 p-3 rounded">{client.notes}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Comments</h3>
              <p className="text-gray-600 bg-gray-50 p-3 rounded">{client.comments}</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <History size={16} />
                Audit Log for this Client
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-50 p-3 rounded">
                {clientAuditLog.length > 0 ? clientAuditLog.map((log, index) => (
                  <div key={index} className="bg-white p-3 rounded text-sm border-l-4 border-blue-200">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-blue-800">{log.action}</span>
                      <span className="text-gray-500 text-xs">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-700">
                      <span className="font-medium">Field:</span> {log.field_name}
                    </div>
                    {log.old_value && (
                      <div className="text-gray-600 text-xs">
                        <span className="font-medium">Previous:</span> {log.old_value}
                      </div>
                    )}
                    <div className="text-gray-800 text-xs">
                      <span className="font-medium">New:</span> {log.new_value}
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-center py-4">No changes recorded for this client yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">CRM Login</h1>
          <form onSubmit={signIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {authLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Client Onboarding CRM</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 rounded-md ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <BarChart3 size={18} className="inline mr-2" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('clients')}
                  className={`px-4 py-2 rounded-md ${activeTab === 'clients' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Users size={18} className="inline mr-2" />
                  Clients
                </button>
                <button
                  onClick={() => setShowAuditLog(true)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <History size={18} className="inline mr-2" />
                  Audit Log
                </button>
                <button
                  onClick={signOut}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <LogOut size={18} className="inline mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Dashboard Overview</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div 
                className={`bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative ${hoveredCard === 'onboardings' ? 'z-[90]' : 'z-10'}`}
                style={{ zIndex: hoveredCard === 'onboardings' ? 9998 : 10 }}
                onMouseEnter={() => setHoveredCard('onboardings')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex flex-col items-center text-center">
                  <Users className="text-blue-600 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-500 mb-1">Total Onboardings</h3>
                  <p className="text-xl font-bold text-gray-900">{totalOnboardings}</p>
                </div>
                {hoveredCard === 'onboardings' && statusChartData.length > 0 && (
                  <HoverTooltip 
                    data={statusChartData} 
                    title="Onboarding Status Breakdown" 
                    type="chart"
                  />
                )}
              </div>
              
              <div 
                className={`bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative ${hoveredCard === 'tmcs' ? 'z-[90]' : 'z-10'}`}
                style={{ zIndex: hoveredCard === 'tmcs' ? 9998 : 10 }}
                onMouseEnter={() => setHoveredCard('tmcs')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex flex-col items-center text-center">
                  <Building className="text-green-600 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-500 mb-1">Total TMCs</h3>
                  <p className="text-xl font-bold text-gray-900">{totalTMCs}</p>
                </div>
                {hoveredCard === 'tmcs' && tmcChartData.length > 0 && (
                  <HoverTooltip 
                    data={tmcChartData} 
                    title="TMC Distribution" 
                    type="chart"
                  />
                )}
              </div>

              <div 
                className={`bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative ${hoveredCard === 'ssos' ? 'z-[90]' : 'z-10'}`}
                style={{ zIndex: hoveredCard === 'ssos' ? 9998 : 10 }}
                onMouseEnter={() => setHoveredCard('ssos')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex flex-col items-center text-center">
                  <Shield className="text-purple-600 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-500 mb-1">Total SSOs</h3>
                  <p className="text-xl font-bold text-gray-900">{totalSSOs}</p>
                </div>
                {hoveredCard === 'ssos' && ssoChartData.length > 0 && (
                  <HoverTooltip 
                    data={ssoChartData} 
                    title="SSO Distribution" 
                    type="chart"
                  />
                )}
              </div>
              
              <div 
                className={`bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative ${hoveredCard === 'mostTmc' ? 'z-[90]' : 'z-10'}`}
                style={{ zIndex: hoveredCard === 'mostTmc' ? 9998 : 10 }}
                onMouseEnter={() => setHoveredCard('mostTmc')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex flex-col items-center text-center">
                  <Building className="text-indigo-600 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-500 mb-1">Most Integrated TMC</h3>
                  <p className="text-sm font-bold text-gray-900">{mostIntegratedTMC}</p>
                </div>
                {hoveredCard === 'mostTmc' && tmcChartData.length > 0 && (
                  <HoverTooltip 
                    data={tmcChartData} 
                    title="TMC Usage Count" 
                    type="count"
                  />
                )}
              </div>
              
              <div 
                className={`bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative ${hoveredCard === 'mostSso' ? 'z-[90]' : 'z-10'}`}
                style={{ zIndex: hoveredCard === 'mostSso' ? 9998 : 10 }}
                onMouseEnter={() => setHoveredCard('mostSso')}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="flex flex-col items-center text-center">
                  <Shield className="text-orange-600 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-500 mb-1">Most Integrated SSO</h3>
                  <p className="text-sm font-bold text-gray-900">{mostIntegratedSSO}</p>
                </div>
                {hoveredCard === 'mostSso' && ssoChartData.length > 0 && (
                  <HoverTooltip 
                    data={ssoChartData} 
                    title="SSO Usage Count" 
                    type="count"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {auditLog.slice(0, 5).map((log, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{log.action}</p>
                        <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {clients.find(c => c.id === log.client_id)?.name || 'Unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
                <div className="space-y-2">
                  {Object.entries(statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm">{status}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Client Management</h2>
              <button
                onClick={() => {
                  setSelectedClient(null);
                  setIsEditing(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                Add Client
              </button>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="name">Name</option>
                      <option value="status">Status</option>
                      <option value="updated_at">Last Updated</option>
                    </select>
                    <button
                      onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SSO Systems</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TMCs</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            client.status === 'Active' ? 'bg-green-100 text-green-800' :
                            client.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                            client.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {(client.sso_systems || []).map(sso => sso.value).join(', ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {(client.tmcs || []).map(tmc => tmc.value).join(', ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(client.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setSelectedClient(client)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClient(client);
                                setIsEditing(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this client?')) {
                                  deleteClient(client.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
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
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full my-8 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Audit Log</h2>
              <button
                onClick={() => setShowAuditLog(false)}
                className="px-3 py-1 bg-gray-200 text-gray-600 rounded-md hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
            
            <div className="space-y-3">
              {auditLog.map((log, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{log.action}</h3>
                      <p className="text-sm text-gray-600">Field: {log.field_name}</p>
                      {log.old_value && <p className="text-sm text-gray-500">Old: {log.old_value}</p>}
                      <p className="text-sm text-gray-700">New: {log.new_value}</p>
                      <p className="text-sm text-gray-500">Client: {clients.find(c => c.id === log.client_id)?.name || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
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
