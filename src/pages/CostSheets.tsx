import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCostSheets, getVehicles } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculations';
import { Plus, FileText, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';

export default function CostSheets() {
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState<string>('ALL');
  const costSheets = getCostSheets();
  const vehicles = getVehicles();

  const filteredSheets = filter === 'ALL' 
    ? costSheets 
    : costSheets.filter(s => s.status === filter);

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.brand_name} ${vehicle.model_name}` : 'Unknown';
  };

  const statusConfig = {
    DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground', icon: FileText },
    PENDING_APPROVAL: { label: 'Pending', className: 'bg-warning/10 text-warning', icon: Clock },
    APPROVED: { label: 'Approved', className: 'bg-success/10 text-success', icon: CheckCircle },
    REJECTED: { label: 'Rejected', className: 'bg-destructive/10 text-destructive', icon: XCircle },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Cost Sheets</h1>
          <p className="text-muted-foreground mt-1">Manage vehicle rental cost sheets</p>
        </div>
        <Link to="/cost-sheets/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Cost Sheet
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'ALL' ? 'All' : status.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Cost Sheets List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filter === 'ALL' ? 'All Cost Sheets' : `${filter.replace('_', ' ')} Cost Sheets`}
          </CardTitle>
          <CardDescription>{filteredSheets.length} cost sheets</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSheets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No cost sheets found</p>
              <p className="text-sm">Create your first cost sheet to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSheets.map((sheet) => {
                const config = statusConfig[sheet.status];
                const Icon = config.icon;
                return (
                  <div key={sheet.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{sheet.company_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {getVehicleName(sheet.vehicle_id)} • {sheet.tenure_years} years
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(sheet.grand_total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sheet.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={config.className}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                    <Link to={`/cost-sheets/${sheet.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
