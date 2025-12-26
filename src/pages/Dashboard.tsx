// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/calculations';
import { FileText, Car, Clock, CheckCircle, XCircle, AlertCircle, Users, Shield, Settings, TrendingUp, Fuel } from 'lucide-react';

export default function Dashboard() {
  const { user, isAdmin, isSuperAdmin } = useAuth();

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

  if (loading) return <div className="text-center py-20 text-muted-foreground">Loading dashboard...</div>;
  if (error) return <div className="text-center py-20 text-red-500">Error: {error}</div>;

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

  // --------------------------
  // Render
  // --------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Welcome back, {user?.full_name ?? 'User'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isSuperAdmin
            ? 'Full system overview with financial settings and approvals'
            : isAdmin
            ? 'Manage vehicles, users, and cost sheets'
            : "Here's an overview of your cost sheet activity"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Cost Sheets" value={stats.total} subtitle={`${stats.draft} drafts, ${stats.pending} pending`} Icon={FileText} />
        <StatCard title="Pending Approval" value={stats.pending} subtitle={isSuperAdmin ? 'Awaiting your review' : 'Awaiting approval'} Icon={Clock} color="text-warning" />
        <StatCard title="Approved Value" value={stats.approved} subtitle={formatCurrency(stats.totalValue)} Icon={CheckCircle} color="text-success" />
        <StatCard title="Active Vehicles" value={stats.activeVehicles} subtitle="In vehicle master" Icon={Car} color="text-primary" />
      </div>

      {/* Admin Stats */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Vehicle Fleet" value={adminStats.totalVehicles} subtitle={`${adminStats.inactiveVehicles} inactive`} Icon={Car} color="text-primary/80" bgColor="bg-primary/5" />
          <StatCard title="System Users" value={adminStats.totalUsers} subtitle={`${adminStats.activeUsers} active`} Icon={Users} color="text-primary/80" bgColor="bg-primary/5" />
          <StatCard title="Staff Members" value={adminStats.staffCount} subtitle={`${adminStats.adminCount} admins, ${adminStats.superAdminCount} super`} Icon={Users} color="text-primary/80" bgColor="bg-primary/5" />
          <StatCard title="Rejected Sheets" value={stats.rejected} subtitle="Needs revision" Icon={XCircle} color="text-destructive" />
        </div>
      )}

      {/* SuperAdmin Stats */}
      {isSuperAdmin && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Interest Rate" value={`${superAdminStats.interestRate}%`} subtitle="Active rate" Icon={TrendingUp} color="text-warning" bgColor="bg-warning/5" />
          <StatCard title="Insurance Rate" value={`${superAdminStats.insuranceRate}%`} subtitle="Active rate" Icon={Shield} color="text-warning" bgColor="bg-warning/5" />
          <StatCard title="Admin Charge" value={`${superAdminStats.adminChargePercent}%`} subtitle="Active charge" Icon={Settings} color="text-warning" bgColor="bg-warning/5" />
          <StatCard title="Fuel Types" value={superAdminStats.fuelTypes} subtitle="Configured rates" Icon={Fuel} color="text-warning" bgColor="bg-warning/5" />
        </div>
      )}

      {/* Recent Cost Sheets */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Recent Cost Sheets</CardTitle>
            <CardDescription>Latest cost sheets in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSheets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No cost sheets yet</p>
                <p className="text-sm">Create your first cost sheet to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSheets.map(sheet => (
                  <div key={sheet.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{sheet.company_name}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(sheet.grand_total)}</p>
                    </div>
                    <StatusBadge status={sheet.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Status Overview</CardTitle>
            <CardDescription>Cost sheets by status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatusBar label="Draft" count={stats.draft} total={stats.total} color="bg-muted-foreground" />
            <StatusBar label="Pending" count={stats.pending} total={stats.total} color="bg-warning" />
            <StatusBar label="Approved" count={stats.approved} total={stats.total} color="bg-success" />
            <StatusBar label="Rejected" count={stats.rejected} total={stats.total} color="bg-destructive" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --------------------------
// Helper Components
// --------------------------
function StatCard({ title, value, subtitle, Icon, color = 'text-foreground', bgColor = 'bg-card' }: any) {
  return (
    <Card className={`${bgColor}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`w-4 h-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground', icon: FileText },
    PENDING_APPROVAL: { label: 'Pending', className: 'bg-warning/10 text-warning', icon: Clock },
    APPROVED: { label: 'Approved', className: 'bg-success/10 text-success', icon: CheckCircle },
    REJECTED: { label: 'Rejected', className: 'bg-destructive/10 text-destructive', icon: XCircle },
  }[status] || { label: status, className: 'bg-muted text-muted-foreground', icon: AlertCircle };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{count}</span>
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