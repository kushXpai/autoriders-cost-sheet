import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, FileText, Clock, CheckCircle, XCircle, MoreHorizontal, Search, 
  SortAsc, SortDesc, Calendar, DollarSign, Car, Filter, X, Copy, Trash2,
  Eye, Download, ArrowUpDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/supabase/client';
import { formatCurrency } from '@/lib/calculations';
import type { CostSheet, Vehicle } from '@/types';

export default function CostSheets() {
  const { isAdmin, user } = useAuth();
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [selectedSheetToDelete, setSelectedSheetToDelete] = useState<CostSheet | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'company'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  const getVehicleName = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.brand_name} ${vehicle.model_name}` : 'Unknown';
  };

  const statusConfig = {
    DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText },
    PENDING_APPROVAL: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
    REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  };

  const filterButtons = [
    { value: 'ALL', label: 'All', count: costSheets.length },
    { value: 'DRAFT', label: 'Draft', count: costSheets.filter(s => s.status === 'DRAFT').length },
    { value: 'PENDING_APPROVAL', label: 'Pending', count: costSheets.filter(s => s.status === 'PENDING_APPROVAL').length },
    { value: 'APPROVED', label: 'Approved', count: costSheets.filter(s => s.status === 'APPROVED').length },
    { value: 'REJECTED', label: 'Rejected', count: costSheets.filter(s => s.status === 'REJECTED').length },
  ];

  const handleFilterChange = (status: string) => {
    setFilter(status);
    if (status === 'ALL') {
      setSearchParams({});
    } else {
      setSearchParams({ status });
    }
  };

  // Filter and sort sheets
  let filteredSheets = filter === 'ALL'
    ? costSheets
    : costSheets.filter(s => s.status === filter);

  // Apply search
  if (searchTerm) {
    filteredSheets = filteredSheets.filter(sheet =>
      sheet.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getVehicleName(sheet.vehicle_id).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Apply sorting
  filteredSheets = [...filteredSheets].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'amount':
        comparison = a.grand_total - b.grand_total;
        break;
      case 'company':
        comparison = a.company_name.localeCompare(b.company_name);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleCardClick = (sheetId: string) => {
    navigate(`/cost-sheets/${sheetId}`);
  };

  const handleCopyClick = (sheet: CostSheet) => {
    setSelectedSheetToCopy(sheet);
    setNewCompanyName('');
    setCopyDialogOpen(true);
    setOpenMenuId(null);
  };

  const handleDeleteClick = (sheet: CostSheet) => {
    setSelectedSheetToDelete(sheet);
    setDeleteDialogOpen(true);
    setOpenMenuId(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSheetToDelete) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('cost_sheets')
        .delete()
        .eq('id', selectedSheetToDelete.id);

      if (error) throw error;

      setCostSheets(costSheets.filter(s => s.id !== selectedSheetToDelete.id));

      toast({
        title: "Success",
        description: "Cost sheet deleted successfully",
      });

      setDeleteDialogOpen(false);
      setSelectedSheetToDelete(null);
    } catch (error: any) {
      console.error('Error deleting cost sheet:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete cost sheet",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
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
      const { id, created_at, updated_at, ...sheetData } = selectedSheetToCopy;
      
      const newSheet = {
        ...sheetData,
        company_name: newCompanyName.trim(),
        status: 'DRAFT',
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('cost_sheets')
        .insert([newSheet])
        .select()
        .single();

      if (error) throw error;

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

  const toggleSort = (field: 'date' | 'amount' | 'company') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  // Calculate summary stats
  const summaryStats = {
    total: filteredSheets.length,
    totalValue: filteredSheets.reduce((sum, sheet) => sum + sheet.grand_total, 0),
    avgValue: filteredSheets.length > 0 ? filteredSheets.reduce((sum, sheet) => sum + sheet.grand_total, 0) / filteredSheets.length : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground animate-pulse">Loading cost sheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Cost Sheets</h1>
          <p className="text-muted-foreground mt-1">Manage vehicle rental cost sheets</p>
        </div>
        <Link to="/cost-sheets/new">
          <Button className="shadow-md">
            <Plus className="w-4 h-4 mr-2" />
            New Cost Sheet
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-md">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Total Sheets</span>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{summaryStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === 'ALL' ? 'All statuses' : `${filter.replace('_', ' ')} only`}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Total Value</span>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Combined sheet value</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Average Value</span>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.avgValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per cost sheet</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Status Filters */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div className="flex gap-2 flex-wrap flex-1">
                {filterButtons.map((btn) => (
                  <Button
                    key={btn.value}
                    variant={filter === btn.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange(btn.value)}
                    className="relative"
                  >
                    {btn.label}
                    <Badge 
                      variant="secondary" 
                      className="ml-2 px-1.5 py-0 text-xs"
                    >
                      {btn.count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>

            {/* Search and Sort */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company or vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'date' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSort('date')}
                  className="gap-1"
                >
                  <Calendar className="w-4 h-4" />
                  Date
                  {sortBy === 'date' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                </Button>
                <Button
                  variant={sortBy === 'amount' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSort('amount')}
                  className="gap-1"
                >
                  <DollarSign className="w-4 h-4" />
                  Amount
                  {sortBy === 'amount' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                </Button>
                <Button
                  variant={sortBy === 'company' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSort('company')}
                  className="gap-1"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Name
                  {sortBy === 'company' && (sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Sheets List */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {filter === 'ALL' ? 'All Cost Sheets' : `${filter.replace('_', ' ')} Cost Sheets`}
              </CardTitle>
              <CardDescription>
                {filteredSheets.length} {filteredSheets.length === 1 ? 'sheet' : 'sheets'} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSheets.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                {searchTerm ? 'No matching cost sheets' : 'No cost sheets found'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first cost sheet to get started'
                }
              </p>
              {!searchTerm && (
                <Link to="/cost-sheets/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Cost Sheet
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredSheets.map((sheet) => {
                const config = statusConfig[sheet.status];
                const Icon = config.icon;
                return (
                  <div
                    key={sheet.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => handleCardClick(sheet.id)}
                  >
                    {/* Status Icon */}
                    <div className={`p-2 rounded-lg ${config.className} border`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                          {sheet.company_name}
                        </p>
                        <Badge className={`${config.className} border text-xs`}>
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {getVehicleName(sheet.vehicle_id)}
                        </span>
                        <span>•</span>
                        <span>{sheet.tenure_years} years {sheet.tenure_months > 0 && `${sheet.tenure_months} months`}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(sheet.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{formatCurrency(sheet.grand_total)}</p>
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                    </div>

                    {/* Actions Menu */}
                    <div
                      className="ml-2 relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(sheet.id);
                      }}
                    >
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                      {openMenuId === sheet.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-10 overflow-hidden">
                          <button
                            className="flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-muted transition-colors text-sm"
                            onClick={() => navigate(`/cost-sheets/${sheet.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                          <button
                            className="flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-muted transition-colors text-sm"
                            onClick={() => handleCopyClick(sheet)}
                          >
                            <Copy className="w-4 h-4" />
                            Make a Copy
                          </button>
                          <div className="border-t" />
                          <button
                            className="flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-red-50 transition-colors text-sm text-destructive"
                            onClick={() => handleDeleteClick(sheet)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Sheet
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

      {/* Copy Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Copy Cost Sheet
            </DialogTitle>
            <DialogDescription>
              Create a copy of this cost sheet with a new company name. The copy will be saved as a draft.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">New Company Name</Label>
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
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">Copying from:</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Company: <span className="font-medium text-foreground">{selectedSheetToCopy.company_name}</span></p>
                  <p>Vehicle: <span className="font-medium text-foreground">{getVehicleName(selectedSheetToCopy.vehicle_id)}</span></p>
                  <p>Amount: <span className="font-medium text-foreground">{formatCurrency(selectedSheetToCopy.grand_total)}</span></p>
                </div>
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
              {copying ? 'Creating Copy...' : 'Create Copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Cost Sheet
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this cost sheet? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedSheetToDelete && (
            <div className="py-4">
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-2">
                <p className="text-sm font-medium">You are about to delete:</p>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Company:</span> <span className="font-medium">{selectedSheetToDelete.company_name}</span></p>
                  <p><span className="text-muted-foreground">Vehicle:</span> <span className="font-medium">{getVehicleName(selectedSheetToDelete.vehicle_id)}</span></p>
                  <p><span className="text-muted-foreground">Amount:</span> <span className="font-medium">{formatCurrency(selectedSheetToDelete.grand_total)}</span></p>
                  <p><span className="text-muted-foreground">Status:</span> <span className="font-medium">{statusConfig[selectedSheetToDelete.status].label}</span></p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}