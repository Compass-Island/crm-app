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
      if (user) {
        loadClients();
        loadAuditLog();
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
      loadClients();
      loadAuditLog();
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
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadAuditLog = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAuditLog(data || []);
    } catch (error) {
      console.error('Error loading audit log:', error);
    }
  };

  const deleteClient = async (clientId) => {
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
      
      loadClients();
      loadAuditLog();
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
              <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative">
                <div className="flex flex-col items-center text-center">
                  <Users className="text-blue-600 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-500 mb-1">Total Onboardings</h3>
                  <p className="text-xl font-bold text-gray-900">{totalOnboardings}</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative">
                <div className="flex flex-col items-center text-center">
                  <Building className="text-green-600 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-500 mb-1">Total TMCs</h3>
                  <p className="text-xl font-bold text-gray-900">{totalTMCs}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative">
                <div className="flex flex-col items-center text-center">
                  <Shield className="text-purple-600 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-500 mb-1">Total SSOs</h3>
                  <p className="text-xl font-bold text-gray-900">{totalSSOs}</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative">
                <div className="flex flex-col items-center text-center">
                  <Building className="text-indigo-600 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-500 mb-1">Most Integrated TMC</h3>
                  <p className="text-sm font-bold text-gray-900">{mostIntegratedTMC}</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 cursor-pointer relative">
                <div className="flex flex-col items-center text-center">
                  <Shield className="text-orange-600 mb-2" size={20} />
                  <h3 className="text-xs font-medium text-gray-500 mb-1">Most Integrated SSO</h3>
                  <p className="text-sm font-bold text-gray-900">{mostIntegratedSSO}</p>
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
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
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {client.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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

      {showAuditLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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
                      <p className="text-sm text-gray-700">Value: {log.new_value}</p>
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