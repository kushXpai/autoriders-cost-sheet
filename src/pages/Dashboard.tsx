import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCostSheets, getVehicles } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculations';
import { FileText, Car, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const costSheets = getCostSheets();
  const vehicles = getVehicles();

  const stats = {
    total: costSheets.length,
    draft: costSheets.filter(s => s.status === 'DRAFT').length,
    pending: costSheets.filter(s => s.status === 'PENDING_APPROVAL').length,
    approved: costSheets.filter(s => s.status === 'APPROVED').length,
    rejected: costSheets.filter(s => s.status === 'REJECTED').length,
    totalValue: costSheets.filter(s => s.status === 'APPROVED').reduce((sum, s) => sum + s.grand_total, 0),
    activeVehicles: vehicles.filter(v => v.is_active).length,
  };

  const recentSheets = [...costSheets]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Welcome back, {user?.full_name}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your cost sheet management system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost Sheets
            </CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.draft} drafts, {stats.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
            <Clock className="w-4 h-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved Value
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(stats.totalValue)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Vehicles
            </CardTitle>
            <Car className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeVehicles}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In vehicle master
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
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
                {recentSheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{sheet.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(sheet.grand_total)}
                      </p>
                    </div>
                    <StatusBadge status={sheet.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
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
