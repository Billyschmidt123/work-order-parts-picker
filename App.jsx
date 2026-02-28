import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  Loader2, Search, Menu, X, ChevronDown, ChevronUp, 
  Plus, Trash2, Save, Archive, RotateCcw, Download,
  Upload, UserPlus, Settings, FolderOpen
} from 'lucide-react';

// Mock Database Service (simulates Base44 API)
class MockDatabase {
  constructor() {
    this.parts = this.generateMockParts(15000); // Generate 15,000 mock parts
    this.technicians = [
      { id: '1', name: 'John Doe', active: true },
      { id: '2', name: 'Jane Smith', active: true },
      { id: '3', name: 'Bob Johnson', active: true },
    ];
    this.statuses = [
      { id: '1', name: 'Open', color: '#3b82f6' },
      { id: '2', name: 'In Progress', color: '#eab308' },
      { id: '3', name: 'Completed', color: '#22c55e' },
      { id: '4', name: 'On Hold', color: '#ef4444' },
    ];
    this.workOrders = this.generateMockWorkOrders(50);
    this.lineItems = [];
  }

  generateMockParts(count) {
    const divisions = ['Division1', 'Division2'];
    const parts = [];
    for (let i = 1; i <= count; i++) {
      parts.push({
        id: `part-${i}`,
        partNumber: `P-${String(i).padStart(6, '0')}`,
        description: `Sample Part ${i} - ${Math.random().toString(36).substring(7)}`,
        division: divisions[Math.floor(Math.random() * divisions.length)],
        quantity: Math.floor(Math.random() * 100) + 1,
        status: 'Available',
        notes: `Notes for part ${i}`,
      });
    }
    return parts;
  }

  generateMockWorkOrders(count) {
    const wos = [];
    for (let i = 1; i <= count; i++) {
      wos.push({
        id: `wo-${i}`,
        woNumber: `WO-${String(i).padStart(3, '0')}`,
        woDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        customerName: `Customer ${i}`,
        customerPhone: `(555) ${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        technicianId: Math.random() > 0.5 ? ['1', '2', '3'][Math.floor(Math.random() * 3)] : '',
        status: ['Open', 'In Progress', 'Completed', 'On Hold'][Math.floor(Math.random() * 4)],
        complaint: `Sample complaint description for work order ${i}`,
        archived: Math.random() > 0.8,
      });
    }
    return wos.sort((a, b) => new Date(b.woDate) - new Date(a.woDate));
  }

  async listParts(filters = {}, pageSize = 1000, skip = 0) {
    let filtered = [...this.parts];
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.partNumber.toLowerCase().includes(search) || 
        p.description.toLowerCase().includes(search)
      );
    }
    
    if (filters.division && filters.division !== 'All Divisions') {
      filtered = filtered.filter(p => p.division === filters.division);
    }
    
    return filtered.slice(skip, skip + pageSize);
  }

  async listTechnicians() {
    return this.technicians;
  }

  async listStatuses() {
    return this.statuses;
  }

  async listWorkOrders(sortBy = '-created_date') {
    return this.workOrders;
  }

  async filterLineItems(filter) {
    if (!filter.workOrderId) return [];
    return this.lineItems.filter(item => item.workOrderId === filter.workOrderId);
  }

  async createWorkOrder(data) {
    const newWO = {
      id: `wo-${Date.now()}`,
      ...data,
      archived: false,
    };
    this.workOrders.unshift(newWO);
    return newWO;
  }

  async updateWorkOrder(id, data) {
    const index = this.workOrders.findIndex(wo => wo.id === id);
    if (index !== -1) {
      this.workOrders[index] = { ...this.workOrders[index], ...data };
      return this.workOrders[index];
    }
    throw new Error('Work order not found');
  }

  async createLineItem(data) {
    const newItem = {
      id: `line-${Date.now()}-${Math.random()}`,
      ...data,
    };
    this.lineItems.push(newItem);
    return newItem;
  }

  async updateLineItem(id, data) {
    const index = this.lineItems.findIndex(item => item.id === id);
    if (index !== -1) {
      this.lineItems[index] = { ...this.lineItems[index], ...data };
      return this.lineItems[index];
    }
    throw new Error('Line item not found');
  }

  async deleteLineItem(id) {
    const index = this.lineItems.findIndex(item => item.id === id);
    if (index !== -1) {
      this.lineItems.splice(index, 1);
      return true;
    }
    throw new Error('Line item not found');
  }

  async importPartsCSV(division, file) {
    // Simulate CSV import
    return new Promise((resolve) => {
      setTimeout(() => {
        const newParts = [];
        for (let i = 0; i < 100; i++) {
          newParts.push({
            id: `part-import-${Date.now()}-${i}`,
            partNumber: `IMP-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            description: `Imported Part ${i}`,
            division: division,
            quantity: Math.floor(Math.random() * 50) + 1,
            status: 'Available',
            notes: 'Imported from CSV',
          });
        }
        this.parts = [...this.parts, ...newParts];
        resolve(newParts);
      }, 1000);
    });
  }

  async clearAllParts() {
    this.parts = [];
    return true;
  }
}

const db = new MockDatabase();

// Components
const PartsImport = ({ partCounts, onImportComplete }) => {
  const [division1File, setDivision1File] = useState(null);
  const [division2File, setDivision2File] = useState(null);
  const [loading, setLoading] = useState({ d1: false, d2: false });

  const handleFileChange = (division, e) => {
    const file = e.target.files[0];
    if (division === 'Division1') {
      setDivision1File(file);
    } else {
      setDivision2File(file);
    }
  };

  const handleImport = async (division) => {
    const file = division === 'Division1' ? division1File : division2File;
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setLoading(prev => ({ ...prev, [division === 'Division1' ? 'd1' : 'd2']: true }));
    try {
      await db.importPartsCSV(division, file);
      toast.success(`Successfully imported parts for ${division === 'Division1' ? 'Water Systems' : 'Hot Tubs'}`);
      onImportComplete();
      if (division === 'Division1') {
        setDivision1File(null);
      } else {
        setDivision2File(null);
      }
    } catch (error) {
      toast.error('Import failed');
    } finally {
      setLoading(prev => ({ ...prev, [division === 'Division1' ? 'd1' : 'd2']: false }));
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all parts? This cannot be undone.')) {
      try {
        await db.clearAllParts();
        toast.success('All parts cleared');
        onImportComplete();
      } catch (error) {
        toast.error('Failed to clear parts');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-700">Division 1: Water Systems</div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange('Division1', e)}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={() => handleImport('Division1')}
            disabled={loading.d1}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading.d1 ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-700">Division 2: Hot Tubs</div>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => handleFileChange('Division2', e)}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={() => handleImport('Division2')}
            disabled={loading.d2}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading.d2 ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
          </button>
        </div>
      </div>

      <div className="pt-2 flex justify-between items-center border-t border-slate-200">
        <div className="text-xs text-slate-500">
          Water Systems: {partCounts.division1} | Hot Tubs: {partCounts.division2}
        </div>
        <button
          onClick={handleClearAll}
          className="px-3 py-1.5 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
        >
          Clear All Parts
        </button>
      </div>
    </div>
  );
};

const TechnicianManager = ({ technicians, onUpdate }) => {
  const [newTechName, setNewTechName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleAddTech = async () => {
    if (!newTechName.trim()) {
      toast.error('Please enter a technician name');
      return;
    }

    try {
      const newTech = {
        id: `tech-${Date.now()}`,
        name: newTechName,
        active: true,
      };
      technicians.push(newTech);
      setNewTechName('');
      onUpdate();
      toast.success('Technician added');
    } catch (error) {
      toast.error('Failed to add technician');
    }
  };

  const handleUpdateTech = async (id) => {
    if (!editName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    try {
      const tech = technicians.find(t => t.id === id);
      if (tech) {
        tech.name = editName;
        setEditingId(null);
        onUpdate();
        toast.success('Technician updated');
      }
    } catch (error) {
      toast.error('Failed to update technician');
    }
  };

  const handleToggleActive = async (id) => {
    try {
      const tech = technicians.find(t => t.id === id);
      if (tech) {
        tech.active = !tech.active;
        onUpdate();
        toast.success(tech.active ? 'Technician activated' : 'Technician deactivated');
      }
    } catch (error) {
      toast.error('Failed to update technician');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newTechName}
          onChange={(e) => setNewTechName(e.target.value)}
          placeholder="Tech name"
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyPress={(e) => e.key === 'Enter' && handleAddTech()}
        />
        <button
          onClick={handleAddTech}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {technicians.map(tech => (
          <div key={tech.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            {editingId === tech.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleUpdateTech(tech.id)}
                />
                <button
                  onClick={() => handleUpdateTech(tech.id)}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                >
                  <Save className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className={`flex-1 text-sm ${!tech.active ? 'text-slate-400 line-through' : ''}`}>
                  {tech.name}
                </span>
                <button
                  onClick={() => {
                    setEditingId(tech.id);
                    setEditName(tech.name);
                  }}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleActive(tech.id)}
                  className={`p-1 rounded ${tech.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                >
                  {tech.active ? <X className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const StatusManager = ({ statuses, onUpdate }) => {
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#3b82f6');

  const handleAddStatus = async () => {
    if (!newStatusName.trim()) {
      toast.error('Please enter a status name');
      return;
    }

    try {
      const newStatus = {
        id: `status-${Date.now()}`,
        name: newStatusName,
        color: newStatusColor,
      };
      statuses.push(newStatus);
      setNewStatusName('');
      onUpdate();
      toast.success('Status added');
    } catch (error) {
      toast.error('Failed to add status');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={newStatusName}
          onChange={(e) => setNewStatusName(e.target.value)}
          placeholder="Status name"
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="color"
          value={newStatusColor}
          onChange={(e) => setNewStatusColor(e.target.value)}
          className="w-10 h-10 p-1 border border-slate-200 rounded-lg"
        />
        <button
          onClick={handleAddStatus}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {statuses.map(status => (
          <div key={status.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: status.color }} />
            <span className="flex-1 text-sm">{status.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const WorkOrderList = ({ workOrders, currentWOId, onSelect }) => {
  return (
    <div className="divide-y divide-slate-200">
      {workOrders.length === 0 ? (
        <div className="p-4 text-center text-slate-500 text-sm">
          No work orders found
        </div>
      ) : (
        workOrders.map(wo => (
          <button
            key={wo.id}
            onClick={() => onSelect(wo)}
            className={`w-full p-3 text-left hover:bg-slate-50 transition-colors ${
              currentWOId === wo.id ? 'bg-blue-50' : ''
            } ${wo.archived ? 'opacity-50' : ''}`}
          >
            <div className="font-medium text-sm">{wo.woNumber}</div>
            <div className="text-xs text-slate-500 mt-0.5">{wo.customerName}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                wo.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                wo.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                wo.status === 'Completed' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
                {wo.status}
              </span>
              {wo.archived && (
                <span className="text-xs text-slate-400">Archived</span>
              )}
            </div>
          </button>
        ))
      )}
    </div>
  );
};

const WorkOrderForm = ({
  woNumber, setWoNumber,
  woDate, setWoDate,
  woCustomer, setWoCustomer,
  woPhone, setWoPhone,
  woTech, setWoTech,
  woStatus, setWoStatus,
  woComplaint, setWoComplaint,
  technicians, statuses,
  currentWOId, isSaving,
  onSave, onNew, onArchive, isArchived
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Work Order Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Work Order #</label>
            <input
              type="text"
              value={woNumber}
              onChange={(e) => setWoNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="WO-001"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={woDate}
              onChange={(e) => setWoDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={woStatus}
              onChange={(e) => setWoStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statuses.map(status => (
                <option key={status.id} value={status.name}>{status.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
            <input
              type="text"
              value={woCustomer}
              onChange={(e) => setWoCustomer(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Smith"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer Phone</label>
            <input
              type="text"
              value={woPhone}
              onChange={(e) => setWoPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Technician</label>
            <select
              value={woTech}
              onChange={(e) => setWoTech(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">-- Select Tech --</option>
              {technicians.filter(t => t.active).map(tech => (
                <option key={tech.id} value={tech.id}>{tech.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Complaint / Issue</label>
          <textarea
            value={woComplaint}
            onChange={(e) => setWoComplaint(e.target.value)}
            rows="3"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the customer's complaint or issue..."
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {currentWOId ? 'Update Work Order' : 'Create Work Order'}
          </button>
          
          <button
            onClick={onNew}
            className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Work Order
          </button>
          
          {currentWOId && (
            <button
              onClick={onArchive}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
                isArchived 
                  ? 'border-green-200 text-green-700 hover:bg-green-50' 
                  : 'border-orange-200 text-orange-700 hover:bg-orange-50'
              }`}
            >
              <Archive className="w-4 h-4" />
              {isArchived ? 'Unarchive' : 'Archive'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const StatusUpdatePanel = ({
  bulkWOStatus, setBulkWOStatus,
  bulkPartStatus, setBulkPartStatus,
  statuses, isUpdating, onApply
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Bulk Status Update</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Work Order Status</label>
            <select
              value={bulkWOStatus}
              onChange={(e) => setBulkWOStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">-- No Change --</option>
              {statuses.map(status => (
                <option key={status.id} value={status.name}>{status.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">All Parts Status</label>
            <select
              value={bulkPartStatus}
              onChange={(e) => setBulkPartStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">-- No Change --</option>
              <option value="Pending">Pending</option>
              <option value="Picked">Picked</option>
              <option value="Installed">Installed</option>
              <option value="Backordered">Backordered</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={onApply}
          disabled={isUpdating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Updates'}
        </button>
      </div>
    </div>
  );
};

const PartsSearch = ({ allParts, currentWOId, workOrder, onPartAdded }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('All Divisions');
  const [customPart, setCustomPart] = useState({ partNumber: '', description: '' });
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (searchTerm.length > 2) {
      const filtered = allParts.filter(part => {
        const matchesSearch = part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             part.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDivision = divisionFilter === 'All Divisions' || part.division === divisionFilter;
        return matchesSearch && matchesDivision;
      }).slice(0, 50); // Limit to 50 results for performance
      setSearchResults(filtered);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchTerm, divisionFilter, allParts]);

  const handleAddPart = async (part) => {
    try {
      await db.createLineItem({
        workOrderId: currentWOId,
        partId: part.id,
        partNumber: part.partNumber,
        description: part.description,
        division: part.division,
        quantity: 1,
        status: 'Pending',
        notes: '',
      });
      onPartAdded();
      toast.success('Part added to work order');
    } catch (error) {
      toast.error('Failed to add part');
    }
  };

  const handleAddCustomPart = async () => {
    if (!customPart.description.trim()) {
      toast.error('Please enter a part description');
      return;
    }

    try {
      await db.createLineItem({
        workOrderId: currentWOId,
        partId: `custom-${Date.now()}`,
        partNumber: customPart.partNumber || 'CUSTOM',
        description: customPart.description,
        division: divisionFilter !== 'All Divisions' ? divisionFilter : 'Division1',
        quantity: 1,
        status: 'Pending',
        notes: 'Custom part',
      });
      setCustomPart({ partNumber: '', description: '' });
      onPartAdded();
      toast.success('Custom part added');
    } catch (error) {
      toast.error('Failed to add custom part');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Parts Search</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Search by Part # or Description</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type to search..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Division Filter</label>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>All Divisions</option>
              <option>Division1</option>
              <option>Division2</option>
            </select>
          </div>
        </div>

        {showResults && searchResults.length > 0 && (
          <div className="mb-6 max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
            {searchResults.map(part => (
              <div
                key={part.id}
                onClick={() => handleAddPart(part)}
                className="p-3 border-b border-slate-200 last:border-0 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <div className="font-medium text-sm">{part.partNumber}</div>
                <div className="text-xs text-slate-600">{part.description}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">
                    {part.division}
                  </span>
                  <span className="text-xs text-slate-500">Qty: {part.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200 pt-4">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Add Custom Part</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <input
              type="text"
              value={customPart.partNumber}
              onChange={(e) => setCustomPart({ ...customPart, partNumber: e.target.value })}
              placeholder="Part # (Optional)"
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={customPart.description}
              onChange={(e) => setCustomPart({ ...customPart, description: e.target.value })}
              placeholder="Part description"
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddCustomPart}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add to WO
            </button>
            <span className="text-xs text-slate-500">Save this part to database for future use</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const PickedPartsTable = ({ lineItems, workOrder, technicians, onUpdate }) => {
  const [editingNotes, setEditingNotes] = useState(null);
  const [notesValue, setNotesValue] = useState('');

  const handleUpdateStatus = async (itemId, newStatus) => {
    try {
      await db.updateLineItem(itemId, { status: newStatus });
      onUpdate();
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await db.updateLineItem(itemId, { quantity: parseInt(newQuantity) });
      onUpdate();
      toast.success('Quantity updated');
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const handleUpdateNotes = async (itemId) => {
    try {
      await db.updateLineItem(itemId, { notes: notesValue });
      setEditingNotes(null);
      onUpdate();
      toast.success('Notes updated');
    } catch (error) {
      toast.error('Failed to update notes');
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (window.confirm('Are you sure you want to remove this part?')) {
      try {
        await db.deleteLineItem(itemId);
        onUpdate();
        toast.success('Part removed');
      } catch (error) {
        toast.error('Failed to remove part');
      }
    }
  };

  const getTechName = (techId) => {
    const tech = technicians.find(t => t.id === techId);
    return tech ? tech.name : 'Unassigned';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Picked Parts</h3>
          <span className="text-sm text-slate-600">{lineItems.length} items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Part #</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Description</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Division</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Qty</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Notes</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No parts added yet. Use the search above to add parts.
                  </td>
                </tr>
              ) : (
                lineItems.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm">{item.partNumber}</td>
                    <td className="py-3 px-4 text-sm">{item.description}</td>
                    <td className="py-3 px-4 text-sm">{item.division}</td>
                    <td className="py-3 px-4 text-sm">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                        className="w-16 px-2 py-1 text-sm border border-slate-200 rounded"
                      />
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <select
                        value={item.status}
                        onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                        className="px-2 py-1 text-sm border border-slate-200 rounded"
                      >
                        <option>Pending</option>
                        <option>Picked</option>
                        <option>Installed</option>
                        <option>Backordered</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {editingNotes === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            className="w-24 px-2 py-1 text-sm border border-slate-200 rounded"
                            autoFocus
                            onKeyPress={(e) => e.key === 'Enter' && handleUpdateNotes(item.id)}
                          />
                          <button
                            onClick={() => handleUpdateNotes(item.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.notes || '-'}</span>
                          <button
                            onClick={() => {
                              setEditingNotes(item.id);
                              setNotesValue(item.notes || '');
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Settings className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [partsImportOpen, setPartsImportOpen] = useState(true);
  const [techManagerOpen, setTechManagerOpen] = useState(false);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [workOrdersOpen, setWorkOrdersOpen] = useState(true);
  
  const [currentWOId, setCurrentWOId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form states
  const [woNumber, setWoNumber] = useState('');
  const [woDate, setWoDate] = useState(new Date().toISOString().split('T')[0]);
  const [woCustomer, setWoCustomer] = useState('');
  const [woPhone, setWoPhone] = useState('');
  const [woTech, setWoTech] = useState('none');
  const [woStatus, setWoStatus] = useState('Open');
  const [woComplaint, setWoComplaint] = useState('');
  
  // Bulk status states
  const [bulkWOStatus, setBulkWOStatus] = useState('none');
  const [bulkPartStatus, setBulkPartStatus] = useState('none');
  
  // Loading states
  const [isSavingWO, setIsSavingWO] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Data states
  const [allParts, setAllParts] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [parts, techs, stats, wos] = await Promise.all([
        loadAllParts(),
        db.listTechnicians(),
        db.listStatuses(),
        db.listWorkOrders(),
      ]);
      setAllParts(parts);
      setTechnicians(techs);
      setStatuses(stats);
      setWorkOrders(wos);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadAllParts = async () => {
    const pageSize = 1000;
    let allResults = [];
    let skip = 0;
    let hasMore = true;
    
    while (hasMore) {
      const batch = await db.listParts({}, pageSize, skip);
      
      if (!batch || batch.length === 0) {
        hasMore = false;
        break;
      }
      
      allResults = [...allResults, ...batch];
      
      if (batch.length < pageSize) {
        hasMore = false;
      } else {
        skip += pageSize;
      }
    }
    
    return allResults;
  };

  const loadLineItems = async (woId) => {
    if (!woId) return;
    try {
      const items = await db.filterLineItems({ workOrderId: woId });
      setLineItems(items);
    } catch (error) {
      toast.error('Failed to load line items');
    }
  };

  useEffect(() => {
    if (currentWOId) {
      loadLineItems(currentWOId);
    } else {
      setLineItems([]);
    }
  }, [currentWOId]);

  // Part counts
  const partCounts = {
    division1: allParts.filter(p => p.division === 'Division1').length,
    division2: allParts.filter(p => p.division === 'Division2').length,
    total: allParts.length
  };

  // Handlers
  const handleNewWO = () => {
    setCurrentWOId(null);
    setWoNumber('');
    setWoDate(new Date().toISOString().split('T')[0]);
    setWoCustomer('');
    setWoPhone('');
    setWoTech('none');
    setWoStatus('Open');
    setWoComplaint('');
  };

  const handleSaveWO = async () => {
    if (!woNumber.trim() || !woCustomer.trim()) {
      toast.error('Work order number and customer name are required');
      return;
    }

    setIsSavingWO(true);
    try {
      const woData = {
        woNumber,
        woDate,
        customerName: woCustomer,
        customerPhone: woPhone,
        complaint: woComplaint,
        technicianId: woTech !== 'none' ? woTech : '',
        status: woStatus,
      };

      if (currentWOId) {
        await db.updateWorkOrder(currentWOId, woData);
        toast.success('Work order updated');
      } else {
        const result = await db.createWorkOrder(woData);
        setCurrentWOId(result.id);
        toast.success('Work order created');
      }
      
      const updatedWOs = await db.listWorkOrders();
      setWorkOrders(updatedWOs);
    } catch (error) {
      toast.error('Failed to save work order');
    } finally {
      setIsSavingWO(false);
    }
  };

  const handleSelectWO = (wo) => {
    setCurrentWOId(wo.id);
    setWoNumber(wo.woNumber);
    setWoDate(wo.woDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
    setWoCustomer(wo.customerName);
    setWoPhone(wo.customerPhone || '');
    setWoTech(wo.technicianId || 'none');
    setWoStatus(wo.status);
    setWoComplaint(wo.complaint || '');
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleArchiveWO = async () => {
    if (!currentWOId) return;
    
    const currentWO = workOrders.find(wo => wo.id === currentWOId);
    const newArchivedState = !currentWO?.archived;
    
    try {
      await db.updateWorkOrder(currentWOId, { archived: newArchivedState });
      const updatedWOs = await db.listWorkOrders();
      setWorkOrders(updatedWOs);
      toast.success(newArchivedState ? 'Work order archived' : 'Work order unarchived');
    } catch (error) {
      toast.error('Failed to update archive status');
    }
  };

  const handleApplyStatusUpdates = async () => {
    if (!currentWOId) {
      toast.error('Select or save a work order first');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      if (bulkWOStatus !== 'none') {
        await db.updateWorkOrder(currentWOId, { status: bulkWOStatus });
        setWoStatus(bulkWOStatus);
      }

      if (bulkPartStatus !== 'none' && lineItems.length > 0) {
        for (const line of lineItems) {
          await db.updateLineItem(line.id, { status: bulkPartStatus });
        }
      }

      setBulkWOStatus('none');
      setBulkPartStatus('none');
      
      const updatedWOs = await db.listWorkOrders();
      setWorkOrders(updatedWOs);
      await loadLineItems(currentWOId);
      
      toast.success('Statuses updated');
    } catch (error) {
      toast.error('Failed to update statuses');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const refreshParts = async () => {
    const parts = await loadAllParts();
    setAllParts(parts);
  };

  const refreshTechnicians = async () => {
    const techs = await db.listTechnicians();
    setTechnicians(techs);
  };

  const refreshStatuses = async () => {
    const stats = await db.listStatuses();
    setStatuses(stats);
  };

  const refreshLineItems = async () => {
    if (currentWOId) {
      await loadLineItems(currentWOId);
    }
  };

  // Filter work orders by search query
  const filteredWorkOrders = workOrders.filter(wo => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const techName = wo.technicianId ? technicians.find(t => t.id === wo.technicianId)?.name?.toLowerCase() : '';
    return (
      wo.woNumber?.toLowerCase().includes(query) ||
      wo.customerName?.toLowerCase().includes(query) ||
      techName?.includes(query)
    );
  });

  // Current work order object
  const currentWO = currentWOId ? workOrders.find(wo => wo.id === currentWOId) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <ToastContainer position="top-right" theme="colored" />
      
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-4 shadow-lg">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Work Order & Parts Picking</h1>
            <p className="text-blue-200 text-sm mt-0.5">Manage work orders and track parts inventory</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                placeholder="Search WO#, customer, tech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm border-slate-200 bg-white w-64 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-blue-800/50 px-4 py-2 rounded-lg">
                <span className="text-blue-200">Parts:</span>
                <span className="font-semibold ml-1">{partCounts.total}</span>
              </div>
              <div className="bg-blue-800/50 px-4 py-2 rounded-lg">
                <span className="text-blue-200">Work Orders:</span>
                <span className="font-semibold ml-1">{workOrders.length}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed bottom-4 right-4 z-50 lg:hidden h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      <div className="flex h-[calc(100vh-76px)] relative">
        {/* Sidebar */}
        <div className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:relative z-40
          w-80 lg:w-72
          h-[calc(100vh-76px)]
          border-r border-slate-200 bg-white shadow-xl lg:shadow-none
          overflow-y-auto p-4 space-y-3
          transition-transform duration-300 ease-in-out
        `}>
          {/* Parts Import - Collapsible */}
          <div className="border border-slate-200 rounded-lg bg-white/80 backdrop-blur overflow-hidden">
            <button
              onClick={() => setPartsImportOpen(!partsImportOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <span>Parts CSV Import</span>
              {partsImportOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {partsImportOpen && (
              <div className="px-4 pb-4">
                <PartsImport 
                  partCounts={partCounts} 
                  onImportComplete={refreshParts} 
                />
              </div>
            )}
          </div>

          {/* Technician Manager - Collapsible */}
          <div className="border border-slate-200 rounded-lg bg-white/80 backdrop-blur overflow-hidden">
            <button
              onClick={() => setTechManagerOpen(!techManagerOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <span>Technicians</span>
              {techManagerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {techManagerOpen && (
              <div className="px-4 pb-4">
                <TechnicianManager 
                  technicians={technicians} 
                  onUpdate={refreshTechnicians} 
                />
              </div>
            )}
          </div>

          {/* Status Manager - Collapsible */}
          <div className="border border-slate-200 rounded-lg bg-white/80 backdrop-blur overflow-hidden">
            <button
              onClick={() => setStatusManagerOpen(!statusManagerOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <span>Status Manager</span>
              {statusManagerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {statusManagerOpen && (
              <div className="px-4 pb-4">
                <StatusManager 
                  statuses={statuses} 
                  onUpdate={refreshStatuses} 
                />
              </div>
            )}
          </div>

          {/* Work Orders - Collapsible */}
          <div className="border border-slate-200 rounded-lg bg-white/80 backdrop-blur overflow-hidden">
            <button
              onClick={() => setWorkOrdersOpen(!workOrdersOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
            >
              <span>Work Orders ({filteredWorkOrders.length})</span>
              {workOrdersOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {workOrdersOpen && (
              <div>
                <WorkOrderList 
                  workOrders={filteredWorkOrders}
                  currentWOId={currentWOId}
                  onSelect={handleSelectWO}
                />
              </div>
            )}
          </div>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          <WorkOrderForm
            woNumber={woNumber}
            setWoNumber={setWoNumber}
            woDate={woDate}
            setWoDate={setWoDate}
            woCustomer={woCustomer}
            setWoCustomer={setWoCustomer}
            woPhone={woPhone}
            setWoPhone={setWoPhone}
            woTech={woTech}
            setWoTech={setWoTech}
            woStatus={woStatus}
            setWoStatus={setWoStatus}
            woComplaint={woComplaint}
            setWoComplaint={setWoComplaint}
            technicians={technicians}
            statuses={statuses}
            currentWOId={currentWOId}
            isSaving={isSavingWO}
            onSave={handleSaveWO}
            onNew={handleNewWO}
            onArchive={handleArchiveWO}
            isArchived={currentWO?.archived}
          />

          {currentWOId ? (
            <>
              <StatusUpdatePanel
                bulkWOStatus={bulkWOStatus}
                setBulkWOStatus={setBulkWOStatus}
                bulkPartStatus={bulkPartStatus}
                setBulkPartStatus={setBulkPartStatus}
                statuses={statuses}
                isUpdating={isUpdatingStatus}
                onApply={handleApplyStatusUpdates}
              />

              <PartsSearch
                allParts={allParts}
                currentWOId={currentWOId}
                workOrder={currentWO}
                onPartAdded={refreshLineItems}
              />

              <PickedPartsTable
                lineItems={lineItems}
                workOrder={currentWO}
                technicians={technicians}
                onUpdate={refreshLineItems}
              />
            </>
          ) : (
            <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">No Work Order Selected</h3>
                <p className="text-slate-600 mb-4">
                  Create a new work order or select an existing one from the sidebar to start adding parts.
                </p>
                <div className="text-sm text-slate-500">
                  Once saved, you'll be able to search and add parts by part # or description.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;