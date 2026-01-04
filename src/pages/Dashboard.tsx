// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/calculations';
import { 
  FileText, Car, Clock, CheckCircle, XCircle, AlertCircle, Users, Shield, 
  Settings, TrendingUp, Fuel, BarChart3, Activity, DollarSign, Calendar,
  ArrowUpRight, ArrowDownRight, Sparkles, Plus, TrendingDown
} from 'lucide-react';

export default function Dashboard() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [costSheets, setCostSheets] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [fuelRates, setFuelRates] = useState<any[]>([]);
  const [interestRate, setInterestRate] = useState<number>(0);
  const [insuranceRate, setInsuranceRate] = useState<number>(0);
  const [adminChargePercent, setAdminChargePercent] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [
          costSheetsRes,
          vehiclesRes,
          usersRes,
          fuelRatesRes,
          interestRes,
          insuranceRes,
          adminChargeRes,
        ] = await Promise.all([
          supabase.from('cost_sheets').select('*'),
          supabase.from('vehicles').select('*'),
          supabase.from('users').select('*'),
          supabase.from('fuel_rates').select('*'),
          supabase
            .from('interest_rates')
            .select('*')
            .eq('is_active', true)
            .order('effective_from', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('insurance_rates')
            .select('*')
            .eq('is_active', true)
            .order('effective_from', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('admin_charges')
            .select('*')
            .eq('is_active', true)
            .order('effective_from', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (costSheetsRes.error) throw costSheetsRes.error;
        if (vehiclesRes.error) throw vehiclesRes.error;
        if (usersRes.error) throw usersRes.error;
        if (fuelRatesRes.error) throw fuelRatesRes.error;
        if (interestRes.error) throw interestRes.error;
        if (insuranceRes.error) throw insuranceRes.error;
        if (adminChargeRes.error) throw adminChargeRes.error;

        setCostSheets(costSheetsRes.data || []);
        setVehicles(vehiclesRes.data || []);
        setUsers(usersRes.data || []);
        setFuelRates(fuelRatesRes.data || []);
        setInterestRate(interestRes.data?.interest_rate_percent ?? 12);
        setInsuranceRate(insuranceRes.data?.insurance_rate_percent ?? 3.5);
        setAdminChargePercent(adminChargeRes.data?.admin_charge_percent ?? 0);
      } catch (err: any) {
        console.error('Dashboard fetch error:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md border-destructive/50">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Error Loading Dashboard</h3>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --------------------------
  // Stats calculation
  // --------------------------
  const stats = {
    total: costSheets.length,
    draft: costSheets.filter(s => s.status === 'DRAFT').length,
    pending: costSheets.filter(s => s.status === 'PENDING_APPROVAL').length,
    approved: costSheets.filter(s => s.status === 'APPROVED').length,
    rejected: costSheets.filter(s => s.status === 'REJECTED').length,
    totalValue: costSheets.filter(s => s.status === 'APPROVED').reduce((sum, s) => sum + (s.grand_total || 0), 0),
    activeVehicles: vehicles.filter(v => v.is_active).length,
  };

  const adminStats = {
    totalVehicles: vehicles.length,
    inactiveVehicles: vehicles.filter(v => !v.is_active).length,
    totalUsers: users.length,
    activeUsers: users.filter(u => u.is_active).length,
    staffCount: users.filter(u => u.role === 'STAFF').length,
    adminCount: users.filter(u => u.role === 'ADMIN').length,
    superAdminCount: users.filter(u => u.role === 'SUPERADMIN').length,
  };

  const superAdminStats = {
    interestRate,
    insuranceRate,
    adminChargePercent,
    fuelTypes: fuelRates.length,
  };

  const recentSheets = [...costSheets]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const getRoleColor = () => {
    if (isSuperAdmin) return 'from-blue-600 to-blue-700';
    if (isAdmin) return 'from-blue-500 to-blue-600';
    return 'from-blue-400 to-blue-500';
  };

  const getRoleLabel = () => {
    if (isSuperAdmin) return 'Super Administrator';
    if (isAdmin) return 'Administrator';
    return 'Manager';
  };

  // Calculate today's activity
  const today = new Date().toDateString();
  const todaySheets = costSheets.filter(s => new Date(s.created_at).toDateString() === today);
  const thisWeekSheets = costSheets.filter(s => {
    const created = new Date(s.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created >= weekAgo;
  });

  // --------------------------
  // Render
  // --------------------------
  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Compact Hero Section */}
      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${getRoleColor()} p-6 text-white shadow-lg`}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium opacity-90">{getRoleLabel()}</span>
          </div>
          <h1 className="text-2xl font-display font-bold mb-1">
            Welcome back, {user?.full_name ?? 'User'}
          </h1>
          <p className="text-white/90 text-sm">
            {isSuperAdmin
              ? 'Monitor system performance, manage rates, and oversee all operations'
              : isAdmin
              ? 'Manage fleet operations, team members, and cost sheet approvals'
              : 'Track your cost sheets and manage vehicle assignments'}
          </p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Stats (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Stats */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-display font-bold">Overview</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <CompactStatCard 
                title="Total Sheets" 
                value={stats.total} 
                subtitle={`${stats.draft} drafts`} 
                Icon={FileText}
                onClick={() => navigate('/cost-sheets')}
              />
              <CompactStatCard 
                title="Pending" 
                value={stats.pending} 
                subtitle="Awaiting review" 
                Icon={Clock} 
                trend={stats.pending > 0 ? 'up' : 'neutral'}
                onClick={() => navigate('/cost-sheets?status=PENDING_APPROVAL')}
              />
              <CompactStatCard 
                title="Approved" 
                value={stats.approved} 
                subtitle={formatCurrency(stats.totalValue)} 
                Icon={CheckCircle} 
                trend="up"
                onClick={() => navigate('/cost-sheets?status=APPROVED')}
              />
              <CompactStatCard 
                title="Vehicles" 
                value={stats.activeVehicles} 
                subtitle={`${vehicles.length} total`} 
                Icon={Car} 
                onClick={() => navigate('/vehicles')}
              />
            </div>
          </div>

          {/* Admin Stats */}
          {isAdmin && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-display font-bold">Fleet & Team</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <CompactStatCard 
                  title="Fleet" 
                  value={adminStats.totalVehicles} 
                  subtitle={`${adminStats.inactiveVehicles} inactive`} 
                  Icon={Car} 
                  onClick={() => navigate('/vehicles')}
                />
                <CompactStatCard 
                  title="Users" 
                  value={adminStats.totalUsers} 
                  subtitle={`${adminStats.activeUsers} active`} 
                  Icon={Users} 
                  onClick={() => navigate('/users')}
                />
                <CompactStatCard 
                  title="Staff" 
                  value={adminStats.staffCount} 
                  subtitle={`${adminStats.adminCount} admins`} 
                  Icon={Activity} 
                  onClick={() => navigate('/users')}
                />
                <CompactStatCard 
                  title="Rejected" 
                  value={stats.rejected} 
                  subtitle="Need revision" 
                  Icon={XCircle} 
                  trend={stats.rejected > 0 ? 'down' : 'neutral'}
                  onClick={() => navigate('/cost-sheets?status=REJECTED')}
                />
              </div>
            </div>
          )}

          {/* SuperAdmin Stats */}
          {isSuperAdmin && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-display font-bold">Financial Controls</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <CompactStatCard 
                  title="Interest" 
                  value={`${superAdminStats.interestRate}%`} 
                  subtitle="Lending rate" 
                  Icon={TrendingUp} 
                  onClick={() => navigate('/interest-rate')}
                />
                <CompactStatCard 
                  title="Insurance" 
                  value={`${superAdminStats.insuranceRate}%`} 
                  subtitle="Coverage rate" 
                  Icon={Shield} 
                  onClick={() => navigate('/insurance-rate')}
                />
                <CompactStatCard 
                  title="Admin Fee" 
                  value={`${superAdminStats.adminChargePercent}%`} 
                  subtitle="Service charge" 
                  Icon={DollarSign} 
                  onClick={() => navigate('/admin-charges')}
                />
                <CompactStatCard 
                  title="Fuel Types" 
                  value={superAdminStats.fuelTypes} 
                  subtitle="Configurations" 
                  Icon={Fuel} 
                  onClick={() => navigate('/fuel-rates')}
                />
              </div>
            </div>
          )}

          {/* Recent Cost Sheets */}
          <Card className="shadow-md">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <CardTitle className="text-base font-display">Recent Activity</CardTitle>
                </div>
                <button
                  onClick={() => navigate('/cost-sheets')}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                >
                  View All
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {recentSheets.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">No cost sheets yet</h3>
                  <p className="text-xs text-muted-foreground mb-3">Create your first cost sheet</p>
                  <button
                    onClick={() => navigate('/cost-sheets/new')}
                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Create Sheet
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSheets.map(sheet => (
                    <div 
                      key={sheet.id} 
                      className="group flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 cursor-pointer transition-all duration-200"
                      onClick={() => navigate(`/cost-sheets/${sheet.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {sheet.company_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs font-medium text-primary">
                            {formatCurrency(sheet.grand_total)}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {new Date(sheet.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <CompactStatusBadge status={sheet.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Activity Stats */}
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="shadow-md">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Today</span>
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{todaySheets.length}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Sheets created</p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">This Week</span>
                  <TrendingUp className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{thisWeekSheets.length}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Sheets processed</p>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Avg Value</span>
                  <DollarSign className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {stats.approved > 0 ? formatCurrency(stats.totalValue / stats.approved).replace('₹', '₹') : '₹0'}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Per approved sheet</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Status & Quick Actions */}
        <div className="space-y-4">
          {/* Status Overview */}
          <Card className="shadow-md">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <CardTitle className="text-base font-display">Status Breakdown</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <CompactStatusBar 
                label="Draft" 
                count={stats.draft} 
                total={stats.total} 
                color="bg-slate-500"
                icon={FileText}
                onClick={() => navigate('/cost-sheets?status=DRAFT')}
              />
              <CompactStatusBar 
                label="Pending" 
                count={stats.pending} 
                total={stats.total} 
                color="bg-amber-500"
                icon={Clock}
                onClick={() => navigate('/cost-sheets?status=PENDING_APPROVAL')}
              />
              <CompactStatusBar 
                label="Approved" 
                count={stats.approved} 
                total={stats.total} 
                color="bg-green-500"
                icon={CheckCircle}
                onClick={() => navigate('/cost-sheets?status=APPROVED')}
              />
              <CompactStatusBar 
                label="Rejected" 
                count={stats.rejected} 
                total={stats.total} 
                color="bg-red-500"
                icon={XCircle}
                onClick={() => navigate('/cost-sheets?status=REJECTED')}
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-md">
            <CardHeader className="pb-3 border-b bg-muted/30">
              <CardTitle className="text-base font-display">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <button
                onClick={() => navigate('/cost-sheets/new')}
                className="w-full flex items-center gap-2 p-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                New Cost Sheet
              </button>
              <button
                onClick={() => navigate('/cost-sheets?status=PENDING_APPROVAL')}
                className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
              >
                <Clock className="w-4 h-4" />
                Review Pending ({stats.pending})
              </button>
              {isAdmin && (
                <>
                  <button
                    onClick={() => navigate('/vehicles')}
                    className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
                  >
                    <Car className="w-4 h-4" />
                    Manage Vehicles
                  </button>
                  <button
                    onClick={() => navigate('/users')}
                    className="w-full flex items-center gap-2 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
                  >
                    <Users className="w-4 h-4" />
                    Manage Users
                  </button>
                </>
              )}
            </CardContent>
          </Card>

          {/* System Health (for admins) */}
          {isAdmin && (
            <Card className="shadow-md">
              <CardHeader className="pb-3 border-b bg-muted/30">
                <CardTitle className="text-base font-display">System Health</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Users</span>
                  <span className="text-sm font-semibold">{adminStats.activeUsers}/{adminStats.totalUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Vehicles</span>
                  <span className="text-sm font-semibold">{stats.activeVehicles}/{adminStats.totalVehicles}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Approval Rate</span>
                  <span className="text-sm font-semibold">
                    {stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rejection Rate</span>
                  <span className="text-sm font-semibold">
                    {stats.total > 0 ? ((stats.rejected / stats.total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------
// Compact Components
// --------------------------
function CompactStatCard({ 
  title, 
  value, 
  subtitle, 
  Icon, 
  trend,
  onClick 
}: any) {
  return (
    <Card 
      className="cursor-pointer group hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="p-1.5 rounded-md bg-muted">
            <Icon className="w-4 h-4 text-foreground" />
          </div>
          {trend && (
            <div className={`text-xs font-medium ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : null}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground mb-1">{title}</div>
        <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function CompactStatusBadge({ status }: { status: string }) {
  const config = {
    DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-700', icon: FileText },
    PENDING_APPROVAL: { label: 'Pending', className: 'bg-amber-100 text-amber-700', icon: Clock },
    APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700', icon: XCircle },
  }[status] || { label: status, className: 'bg-muted text-muted-foreground', icon: AlertCircle };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function CompactStatusBar({ 
  label, 
  count, 
  total, 
  color, 
  icon: Icon,
  onClick 
}: { 
  label: string; 
  count: number; 
  total: number; 
  color: string; 
  icon: any;
  onClick?: () => void 
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div 
      className="space-y-2 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Icon className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
          <span className="text-sm font-bold min-w-[2ch] text-right">{count}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}