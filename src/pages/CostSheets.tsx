import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, FileText, Clock, CheckCircle, XCircle, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/supabase/client';
import { formatCurrency } from '@/lib/calculations';
import type { CostSheet, Vehicle } from '@/types';

export default function CostSheets() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const [filter, setFilter] = useState<string>(statusParam || 'ALL');
  const [costSheets, setCostSheets] = useState<CostSheet[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState<boolean>(false);
  const [selectedSheetToCopy, setSelectedSheetToCopy] = useState<CostSheet | null>(null);
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [copying, setCopying] = useState<boolean>(false);

  useEffect(() => {
    if (statusParam) {
      setFilter(statusParam);
    }
  }, [statusParam]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const { data: sheetsData, error: sheetsError } = await supabase
        .from('cost_sheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (sheetsError) console.error('Error fetching cost sheets:', sheetsError.message);

      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('*');

      if (vehiclesError) console.error('Error fetching vehicles:', vehiclesError.message);

      setCostSheets(sheetsData || []);
      setVehicles(vehiclesData || []);
      setLoading(false);
    };

    fetchData();
  }, []);

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

  const handleFilterChange = (status: string) => {
    setFilter(status);
    if (status === 'ALL') {
      setSearchParams({});
    } else {
      setSearchParams({ status });
    }
  };

  const handleCardClick = (sheetId: string) => {
    navigate(`/cost-sheets/${sheetId}`);
  };

  const handleCopyClick = (sheet: CostSheet) => {
    setSelectedSheetToCopy(sheet);
    setNewCompanyName('');
    setCopyDialogOpen(true);
    setOpenMenuId(null);
  };

  const handleCreateCopy = async () => {
    if (!selectedSheetToCopy || !newCompanyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a company name",
        variant: "destructive",
      });
      return;
    }

    setCopying(true);

    try {
      // Create a copy of the cost sheet with new company name and draft status
      const { id, created_at, updated_at, ...sheetData } = selectedSheetToCopy;
      
      const newSheet = {
        ...sheetData,
        company_name: newCompanyName.trim(),
        status: 'DRAFT',
      };

      const { data, error } = await supabase
        .from('cost_sheets')
        .insert([newSheet])
        .select()
        .single();

      if (error) throw error;

      // Add the new sheet to the list
      setCostSheets([data, ...costSheets]);

      toast({
        title: "Success",
        description: "Cost sheet copied successfully",
      });

      setCopyDialogOpen(false);
      setNewCompanyName('');
      setSelectedSheetToCopy(null);
    } catch (error: any) {
      console.error('Error copying cost sheet:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to copy cost sheet",
        variant: "destructive",
      });
    } finally {
      setCopying(false);
    }
  };

  const toggleMenu = (sheetId: string) => {
    setOpenMenuId(openMenuId === sheetId ? null : sheetId);
  };

  if (loading) {
    return <p className="text-center py-12 text-muted-foreground">Loading cost sheets...</p>;
  }

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

      <div className="flex gap-2 flex-wrap">
        {['ALL', 'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange(status)}
          >
            {status === 'ALL' ? 'All' : status.replace('_', ' ')}
          </Button>
        ))}
      </div>

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
                  <div
                    key={sheet.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer relative"
                    onClick={() => handleCardClick(sheet.id)}
                  >
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

                    {/* Three-dots menu */}
                    <div
                      className="ml-2 relative"
                      onClick={(e) => {
                        e.stopPropagation(); // prevent card click
                        toggleMenu(sheet.id);
                      }}
                    >
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                      {openMenuId === sheet.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-md z-10">
                          <button
                            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                            onClick={() => navigate(`/cost-sheets/${sheet.id}`)}
                          >
                            View Sheet
                          </button>
                          <button
                            className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                            onClick={() => handleCopyClick(sheet)}
                          >
                            Make a Copy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Copy Cost Sheet Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Cost Sheet</DialogTitle>
            <DialogDescription>
              Create a copy of this cost sheet with a new company name. The copy will be saved as a draft.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                placeholder="Enter new company name"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCompanyName.trim()) {
                    handleCreateCopy();
                  }
                }}
              />
            </div>
            {selectedSheetToCopy && (
              <div className="text-sm text-muted-foreground">
                <p>Copying from: <span className="font-medium">{selectedSheetToCopy.company_name}</span></p>
                <p>Vehicle: <span className="font-medium">{getVehicleName(selectedSheetToCopy.vehicle_id)}</span></p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCopyDialogOpen(false)}
              disabled={copying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCopy}
              disabled={copying || !newCompanyName.trim()}
            >
              {copying ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}