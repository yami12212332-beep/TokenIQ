  import React, { useState, useMemo } from 'react';
  import { 
    Search, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    UserCheck, 
    AlertTriangle, 
    Award, 
    ExternalLink, 
    X,
    Bot,
    Zap,
    DollarSign,
    Filter
  } from 'lucide-react';
  import { UnifiedUser, UserSegment, Platform } from '../../types/dashboard';
  import { formatUSD, formatTokens, formatNumber, calculatePowerScore } from '../../utils/analytics';

  interface UserTableProps {
    users: UnifiedUser[];
    activePlatformTab: 'copilot' | 'claude' | 'overall';
  }

  type SortKey = 'name' | 'department' | 'prompts' | 'tokens' | 'spend' | 'powerScore' | 'manager' | 'lastActive';

  export const UserTable: React.FC<UserTableProps> = ({ users, activePlatformTab }) => {
    const [search, setSearch] = useState('');
    const [segmentTab, setSegmentTab] = useState<'power' | 'idle' | 'all'>('power');
    const [platformFilter, setPlatformFilter] = useState<'all' | 'copilot' | 'claude' | 'both'>('all');
    const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
    const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>('ALL');
    const [sortKey, setSortKey] = useState<SortKey>('powerScore');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null);

    const pageSize = 15;

    // Derived department and manager lists for dropdowns
    const departmentList = useMemo(() => {
      const depts = new Set<string>();
      users.forEach((u) => {
        if (u.employee.department) depts.add(u.employee.department);
      });
      return Array.from(depts).sort();
    }, [users]);

    const managerList = useMemo(() => {
      const mgrs = new Set<string>();
      users.forEach((u) => {
        if (u.employee.managerName) mgrs.add(u.employee.managerName);
      });
      return Array.from(mgrs).sort();
    }, [users]);

    // Filter users based on tab, search, department, status, manager, and segment
    const filteredUsers = useMemo(() => {
      return users.filter((u) => {
        // Platform tab context
        if (activePlatformTab === 'copilot' && !u.copilot?.licensed) return false;
        if (activePlatformTab === 'claude' && !u.claude?.licensed) return false;

        // Department filter dropdown
        if (selectedDeptFilter !== 'ALL' && u.employee.department !== selectedDeptFilter) {
          return false;
        }

        // Manager filter dropdown
        if (selectedManagerFilter !== 'ALL' && u.employee.managerName !== selectedManagerFilter) {
          return false;
        }

        // Status filter dropdown
        if (selectedStatusFilter !== 'ALL') {
          const provider = activePlatformTab === 'copilot' ? u.copilot : u.claude;
          if (selectedStatusFilter === 'Active' && provider?.status !== 'Active') return false;
          if (selectedStatusFilter === 'Idle' && provider?.status === 'Active') return false;
          if (selectedStatusFilter === 'Never Used' && provider?.daysSinceActive != null && provider.daysSinceActive < 900) return false;
          if (selectedStatusFilter === 'Power' && provider?.segment !== 'Power') return false;
          if (selectedStatusFilter === 'Regular' && provider?.segment !== 'Regular') return false;
          if (selectedStatusFilter === 'Light' && provider?.segment !== 'Light') return false;
        }

        // Platform filter button
        if (platformFilter !== 'all') {
          if (platformFilter === 'copilot' && u.platforms !== 'copilot') return false;
          if (platformFilter === 'claude' && u.platforms !== 'claude') return false;
          if (platformFilter === 'both' && u.platforms !== 'both') return false;
        }

        // Segment filter button
        if (segmentTab === 'power') {
          const isPower = activePlatformTab === 'copilot'
            ? u.copilot?.segment === 'Power'
            : activePlatformTab === 'claude'
            ? u.claude?.segment === 'Power'
            : u.primarySegment === 'Power';
          if (!isPower) return false;
        } else if (segmentTab === 'idle') {
          const isIdle = activePlatformTab === 'copilot'
            ? u.copilot?.status !== 'Active'
            : activePlatformTab === 'claude'
            ? u.claude?.status !== 'Active'
            : (u.copilot?.status !== 'Active' || u.claude?.status !== 'Active');
          if (!isIdle) return false;
        }

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matches = 
            u.employee.name.toLowerCase().includes(q) ||
            u.employee.email.toLowerCase().includes(q) ||
            u.employee.department.toLowerCase().includes(q) ||
            u.employee.title.toLowerCase().includes(q) ||
            u.employee.managerName.toLowerCase().includes(q);
          if (!matches) return false;
        }

        return true;
      });
    }, [users, activePlatformTab, segmentTab, platformFilter, selectedDeptFilter, selectedStatusFilter, selectedManagerFilter, search]);

    // Sort users
    const sortedUsers = useMemo(() => {
      return [...filteredUsers].sort((a, b) => {
        let valA: any = 0;
        let valB: any = 0;

        switch (sortKey) {
          case 'name':
            valA = a.employee.name.toLowerCase();
            valB = b.employee.name.toLowerCase();
            break;
          case 'department':
            valA = a.employee.department.toLowerCase();
            valB = b.employee.department.toLowerCase();
            break;
          case 'prompts':
            valA = a.copilot?.promptsTotal || 0;
            valB = b.copilot?.promptsTotal || 0;
            break;
          case 'tokens':
            valA = a.claude?.totalTokens || 0;
            valB = b.claude?.totalTokens || 0;
            break;
          case 'spend':
            valA = a.totalSpend;
            valB = b.totalSpend;
            break;
          case 'powerScore':
            valA = a.powerScore;
            valB = b.powerScore;
            break;
          case 'manager':
            valA = (a.employee.managerName || '').toLowerCase();
            valB = (b.employee.managerName || '').toLowerCase();
            break;
          case 'lastActive':
            valA = Math.min(a.copilot?.daysSinceActive ?? 999, a.claude?.daysSinceActive ?? 999);
            valB = Math.min(b.copilot?.daysSinceActive ?? 999, b.claude?.daysSinceActive ?? 999);
            break;
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }, [filteredUsers, sortKey, sortDir]);

    // Pagination slice
    const totalItems = sortedUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginatedUsers = useMemo(() => {
      const start = (currentPage - 1) * pageSize;
      return sortedUsers.slice(start, start + pageSize);
    }, [sortedUsers, currentPage]);

    const handleSort = (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('desc');
      }
      setCurrentPage(1);
    };

    const renderSortIcon = (key: SortKey) => {
      if (sortKey !== key) return <ArrowUpDown size={12} className="text-slate-300 ml-1" />;
      return sortDir === 'asc' ? (
        <ArrowUp size={12} className="text-indigo-600 ml-1" />
      ) : (
        <ArrowDown size={12} className="text-indigo-600 ml-1" />
      );
    };

    const getStatusBadge = (status?: string, segment?: UserSegment) => {
      if (segment === 'Power') {
        return (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200" 
            title={activePlatformTab === 'copilot' ? 'Power: 4+ apps active or >200 prompts' : 'Power: ≥1M tokens & advanced reasoning'}
          >
            <Award size={11} />
            {activePlatformTab === 'copilot' ? 'Power (4+ apps)' : 'Power (1M+ tokens)'}
          </span>
        );
      }
      if (segment === 'Regular') {
        return (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200" 
            title={activePlatformTab === 'copilot' ? 'Regular: 2–3 apps active' : 'Regular: 200k–1M tokens active'}
          >
            {activePlatformTab === 'copilot' ? 'Regular (2–3 apps)' : 'Regular (200k–1M)'}
          </span>
        );
      }
      if (segment === 'Light') {
        return (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200" 
            title={activePlatformTab === 'copilot' ? 'Light: 1 app active' : 'Light: <200k tokens active'}
          >
            {activePlatformTab === 'copilot' ? 'Light (1 app)' : 'Light (<200k)'}
          </span>
        );
      }
      return (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200" 
          title="Never used: no activity in the selected period"
        >
          Never Used
        </span>
      );
    };

    // The detail modal is scoped to the tab the directory belongs to.
    // "overall" is the only mode that shows every provider.
    const showCopilot = activePlatformTab !== 'claude';
    const showClaude = activePlatformTab !== 'copilot';
    const spendLabel =
      activePlatformTab === 'copilot'
        ? 'Copilot Monthly Spend'
        : activePlatformTab === 'claude'
          ? 'Claude Monthly Spend'
          : 'Total Monthly Spend';
    const scoreLabel =
      activePlatformTab === 'copilot'
        ? 'Copilot Power Score'
        : activePlatformTab === 'claude'
          ? 'Claude Power Score'
          : 'Power Score';
    const providerSpend = selectedUser
      ? activePlatformTab === 'copilot'
        ? selectedUser.copilot?.seatCost ?? 0
        : activePlatformTab === 'claude'
          ? selectedUser.claude?.totalMonthlyCost ?? 0
          : selectedUser.totalSpend
      : 0;
    const providerPowerScore = selectedUser
      ? activePlatformTab === 'copilot'
        ? calculatePowerScore({ ...selectedUser, claude: undefined })
        : activePlatformTab === 'claude'
          ? calculatePowerScore({ ...selectedUser, copilot: undefined })
          : selectedUser.powerScore
      : 0;

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header and Controls */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {activePlatformTab === 'copilot' ? 'Microsoft Copilot User Details' : 'Anthropic Claude User Details'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activePlatformTab === 'copilot'
                ? 'Licensed Copilot users and their Copilot-specific activity for the selected reporting period.'
                : 'Claude users and their provider-reported token usage, requests, and cost for the selected reporting period.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search user, email, dept..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white w-full sm:w-56"
              />
            </div>

            {/* Segment Filter Buttons */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                onClick={() => {
                  setSegmentTab('power');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded cursor-pointer ${
                  segmentTab === 'power' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Power Users
              </button>
              <button
                onClick={() => {
                  setSegmentTab('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded cursor-pointer ${
                  segmentTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {activePlatformTab === 'claude' ? 'All Token Users' : 'All Licenses'}
              </button>
            </div>
          </div>
        </div>

        {/* Extended Filter Dropdowns Toolbar */}
        <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold mr-1">
            <Filter size={13} className="text-slate-400" />
            <span>Filters:</span>
          </div>

          {/* Department Dropdown Filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => {
              setSelectedDeptFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="ALL">All Departments ({departmentList.length})</option>
            {departmentList.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Status / Activity Dropdown Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => {
              setSelectedStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="ALL">All Activity Statuses</option>
            <option value="Active">Active Users</option>
            <option value="Idle">Idle / Inactive</option>
            <option value="Never Used">Never Active</option>
            <option value="Power">Power Segment</option>
            <option value="Regular">Regular Segment</option>
            <option value="Light">Light Segment</option>
          </select>

          {/* Manager / EVP Dropdown Filter */}
          <select
            value={selectedManagerFilter}
            onChange={(e) => {
              setSelectedManagerFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="ALL">All Managers / EVPs ({managerList.length})</option>
            {managerList.map((mgr) => (
              <option key={mgr} value={mgr}>
                {mgr}
              </option>
            ))}
          </select>

          {/* Clear Filters Button */}
          {(selectedDeptFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || selectedManagerFilter !== 'ALL' || search.trim() !== '') && (
            <button
              onClick={() => {
                setSelectedDeptFilter('ALL');
                setSelectedStatusFilter('ALL');
                setSelectedManagerFilter('ALL');
                setSearch('');
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 cursor-pointer transition-colors"
            >
              <X size={12} />
              Reset Filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 select-none">
              <tr>
                <th onClick={() => handleSort('name')} className="py-3 px-4 cursor-pointer hover:text-slate-900"><div className="flex items-center"><span>User</span>{renderSortIcon('name')}</div></th>
                <th onClick={() => handleSort('department')} className="py-3 px-3 cursor-pointer hover:text-slate-900"><div className="flex items-center"><span>Department</span>{renderSortIcon('department')}</div></th>
                <th className="py-3 px-3">{activePlatformTab === 'copilot' ? 'Copilot License' : 'Claude Plan'}</th>
                <th onClick={() => handleSort('lastActive')} className="py-3 px-3 cursor-pointer hover:text-slate-900"><div className="flex items-center"><span>Last Activity</span>{renderSortIcon('lastActive')}</div></th>
                {activePlatformTab === 'copilot' ? <>
                  <th onClick={() => handleSort('prompts')} className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"><div className="flex items-center justify-end"><span>Prompts</span>{renderSortIcon('prompts')}</div></th>
                  <th className="py-3 px-3 text-right">Active Apps</th>
                  <th className="py-3 px-4 text-right">Monthly License Cost</th>
                </> : <>
                  <th onClick={() => handleSort('tokens')} className="py-3 px-3 text-right cursor-pointer hover:text-slate-900"><div className="flex items-center justify-end"><span>Total Tokens</span>{renderSortIcon('tokens')}</div></th>
                  <th className="py-3 px-3 text-right">Requests</th>
                  <th onClick={() => handleSort('spend')} className="py-3 px-4 text-right cursor-pointer hover:text-slate-900"><div className="flex items-center justify-end"><span>Reported Cost</span>{renderSortIcon('spend')}</div></th>
                </>}
                <th onClick={() => handleSort('manager')} className="py-3 px-3 cursor-pointer hover:text-slate-900"><div className="flex items-center"><span>Manager</span>{renderSortIcon('manager')}</div></th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.length === 0 ? <tr><td colSpan={9} className="py-8 text-center text-slate-400">No {activePlatformTab === 'copilot' ? 'Copilot' : 'Claude'} users found matching your search and filter criteria.</td></tr> :
                paginatedUsers.map((u) => {
                  const provider = activePlatformTab === 'copilot' ? u.copilot : u.claude;
                  const daysAgo = provider?.daysSinceActive ?? 999;
                  const isSelected = selectedUser?.employee.id === u.employee.id;
                  return <tr key={u.employee.id} onClick={() => setSelectedUser(u)} className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/80 font-medium' : 'hover:bg-slate-50/80'}`}>
                    <td className="py-3 px-4"><div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0">{u.employee.name.split(' ').map((n) => n[0]).join('')}</div><div className="min-w-0"><div className="font-semibold text-slate-900 truncate">{u.employee.name}</div><div className="text-[11px] text-slate-500 truncate">{u.employee.email}</div></div></div></td>
                    <td className="py-3 px-3"><div className="text-slate-800 font-medium">{u.employee.department}</div></td>
                    <td className="py-3 px-3">{activePlatformTab === 'copilot' ? <span className="px-1.5 py-0.5 rounded text-[10px] bg-sky-50 text-sky-700 border border-sky-200 font-medium">{u.copilot?.licensed ? 'Licensed' : 'Not licensed'}</span> : <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-50 text-orange-700 border border-orange-200 font-medium">{u.claude?.licenseTier || 'Claude user'}</span>}</td>
                    <td className="py-3 px-3 font-mono">{daysAgo === 0 ? <span className="text-emerald-600 font-semibold">Today</span> : daysAgo < 28 ? <span className="text-slate-700">{daysAgo}d ago</span> : daysAgo < 900 ? <span className="text-amber-600 font-medium">{daysAgo}d ago</span> : <span className="text-slate-400">Never active</span>}</td>
                    {activePlatformTab === 'copilot' ? <>
                      <td className="py-3 px-3 text-right font-mono">{u.copilot?.licensed ? formatNumber(u.copilot.promptsTotal) : '–'}</td>
                      <td className="py-3 px-3 text-right font-mono">{u.copilot?.licensed ? `${u.copilot.appsUsedCount} / 6` : '–'}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">{u.copilot?.licensed ? `${formatUSD(u.copilot.seatCost)}/mo` : '–'}</td>
                    </> : <>
                      <td className="py-3 px-3 text-right font-mono">{u.claude?.licensed ? formatTokens(u.claude.totalTokens) : '–'}</td>
                      <td className="py-3 px-3 text-right font-mono">{u.claude?.licensed ? formatNumber(u.claude.requestCount) : '–'}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">{u.claude?.licensed ? formatUSD(u.claude.tokenCostUsd) : '–'}</td>
                    </>}
                    <td className="py-3 px-3 text-slate-800 font-medium">{u.employee.managerName || '—'}</td>
                    <td className="py-3 px-3 text-center">{getStatusBadge(provider?.status, provider?.segment)}</td>
                  </tr>;
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{' '}
            <strong className="text-slate-700 font-mono">
              {totalItems ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-700 font-mono">
              {Math.min(currentPage * pageSize, totalItems)}
            </strong>{' '}
            of <strong className="text-slate-700 font-mono">{totalItems}</strong> matching users
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              « First
            </button>
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Prev
            </button>
            <span className="px-2 font-mono font-medium text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Last »
            </button>
          </div>
        </div>

        {/* User Drilldown Detail Drawer / Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold text-base flex items-center justify-center">
                    {selectedUser.employee.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">{selectedUser.employee.name}</h4>
                    <p className="text-xs text-slate-500">{selectedUser.employee.title} · {selectedUser.employee.department}</p>
                    <p className="text-xs font-mono text-slate-400">{selectedUser.employee.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                {/* Workday HR Master Record */}
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-slate-700 font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-900">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Workday Employee Record
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {selectedUser.employee.id}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Manager:</span>
                      <strong className="text-slate-800">{selectedUser.employee.managerName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Department & Division:</span>
                      <strong className="text-slate-800">{selectedUser.employee.department}</strong>
                      <span className="text-slate-400 block text-[10px]">({selectedUser.employee.division || selectedUser.employee.businessFunction})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Location:</span>
                      <strong className="text-slate-800">{selectedUser.employee.location || 'HQ Office'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Workday Status:</span>
                      <span className="text-emerald-700 font-semibold">{selectedUser.employee.employeeStatus || 'Active'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Hire Date:</span>
                      <strong className="text-slate-800 font-mono">{selectedUser.employee.hireDate || '2023-01-15'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Work Email:</span>
                      <strong className="text-slate-800 font-mono text-[10px] truncate block">{selectedUser.employee.email}</strong>
                    </div>
                  </div>
                </div>

                {/* Financial & Power Summary */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">{spendLabel}</div>
                    <div className="text-lg font-bold font-mono text-slate-900">{formatUSD(providerSpend)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">{scoreLabel}</div>
                    <div className="text-lg font-bold font-mono text-indigo-600">{providerPowerScore} / 100</div>
                  </div>
                </div>

                {/* Copilot Telemetry (hidden on the Claude tab) */}
                {showCopilot && (selectedUser.copilot?.licensed ? (
                  <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-900 flex items-center gap-1.5">
                        <Bot size={15} />
                        Copilot Activity
                      </span>
                      <span className="font-mono text-sky-700 font-semibold">{formatUSD(selectedUser.copilot.seatCost)}/mo</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>Status: <strong>{selectedUser.copilot.status}</strong></div>
                      <div>Prompts (30d): <strong>{formatNumber(selectedUser.copilot.promptsTotal)}</strong> ({selectedUser.copilot.promptsWork} work)</div>
                      <div>Last Active: <strong>{selectedUser.copilot.lastActiveDate || 'Never'}</strong></div>
                      <div>M365 Apps Active: <strong>{selectedUser.copilot.appsUsedCount} / 6</strong></div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-slate-200 text-slate-400 italic">
                    No Copilot license assigned.
                  </div>
                ))}

                {/* Claude Telemetry (hidden on the Copilot tab) */}
                {showClaude && (selectedUser.claude?.licensed ? (
                  <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-orange-900 flex items-center gap-1.5">
                        <Zap size={15} />
                        Anthropic Claude Activity
                      </span>
                      <span className="font-mono text-orange-700 font-semibold">{formatUSD(selectedUser.claude.totalMonthlyCost)}/mo</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-600">
                      <div>Tier: <strong>{selectedUser.claude.licenseTier}</strong></div>
                      <div>Total Tokens: <strong>{formatTokens(selectedUser.claude.totalTokens)}</strong></div>
                      <div>Token API Cost: <strong>{formatUSD(selectedUser.claude.tokenCostUsd)}</strong></div>
                      <div>Favorite Model: <strong>{selectedUser.claude.favoriteModel}</strong></div>
                      <div>Cache Read Tokens: <strong>{formatTokens(selectedUser.claude.cacheReadTokens)}</strong></div>
                      <div>Requests: <strong>{selectedUser.claude.requestCount}</strong></div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-slate-200 text-slate-400 italic">
                    No Anthropic Claude license assigned.
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  