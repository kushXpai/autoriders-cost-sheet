import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '../supabase/client';
import { formatCurrency } from '@/lib/calculations';
import { generateCostSheetPDF } from '@/lib/pdfGenerator';
import { 
  ArrowLeft, Pencil, CheckCircle, XCircle, Clock, FileText,
  Car, Calendar, Building, User, Download, Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export default function CostSheetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();


  const [costSheet, setCostSheet] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [remarks, setRemarks] = useState('');


  // Fetch cost sheet, vehicles and users from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: costSheetData, error: costSheetError } = await supabase
          .from('cost_sheets')
          .select('*')
          .eq('id', id)
          .single();


        if (costSheetError) throw costSheetError;
        setCostSheet(costSheetData);


        const { data: vehiclesData, error: vehiclesError } = await supabase
          .from('vehicles')
          .select('*');


        if (vehiclesError) throw vehiclesError;
        setVehicles(vehiclesData || []);


        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*');


        if (usersError) throw usersError;
        setUsers(usersData || []);


      } catch (err: any) {
        toast({ title: err.message || 'Failed to fetch data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };


    fetchData();
  }, [id]);


  if (loading) return <p className="text-center py-12">Loading...</p>;
  if (!costSheet) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Cost sheet not found</p>
        <Link to="/cost-sheets">
          <Button variant="link">Back to Cost Sheets</Button>
        </Link>
      </div>
    );
  }


  const vehicle = vehicles.find(v => v.id === costSheet.vehicle_id);
  const creator = users.find(u => u.id === costSheet.created_by);
  const approver = costSheet.approved_by ? users.find(u => u.id === costSheet.approved_by) : null;


  const statusConfig = {
    DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground', icon: FileText },
    PENDING_APPROVAL: { label: 'Pending Approval', className: 'bg-warning/10 text-warning', icon: Clock },
    APPROVED: { label: 'Approved', className: 'bg-success/10 text-success', icon: CheckCircle },
    REJECTED: { label: 'Rejected', className: 'bg-destructive/10 text-destructive', icon: XCircle },
  };


  const config = statusConfig[costSheet.status];
  const StatusIcon = config.icon;


  const canEdit = costSheet.created_by === user?.id || isAdmin;
  const canApprove = isSuperAdmin && costSheet.status === 'PENDING_APPROVAL';
  const canSubmitForApproval = costSheet.status === 'DRAFT' && (costSheet.created_by === user?.id || isAdmin);


  const updateStatus = async (status: 'APPROVED' | 'REJECTED' | 'PENDING_APPROVAL') => {
    if (status === 'REJECTED' && !remarks.trim()) {
      toast({ title: 'Please provide remarks', variant: 'destructive' });
      return;
    }


    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === 'APPROVED' || status === 'REJECTED') {
      updates.approved_at = new Date().toISOString();
      updates.approved_by = user?.id;
      updates.approval_remarks = remarks;
    }
    if (status === 'PENDING_APPROVAL') {
      updates.submitted_at = new Date().toISOString();
    }


    const { error } = await supabase.from('cost_sheets').update(updates).eq('id', id);


    if (error) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    } else {
      toast({ title: `Cost sheet ${status.toLowerCase()} successfully` });
      navigate('/cost-sheets');
    }
  };


  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cost-sheets')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{costSheet.company_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className={config.className}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Created {new Date(costSheet.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>


        <div className="flex gap-2 flex-wrap">
          {costSheet.status === 'APPROVED' && (
            <Button variant="outline" onClick={() => generateCostSheetPDF(costSheet, vehicle)}>
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
          )}
          {canEdit && (
            <Link to={`/cost-sheets/${id}/edit`}>
              <Button variant="outline">
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </Button>
            </Link>
          )}
          {canSubmitForApproval && (
            <Button onClick={() => updateStatus('PENDING_APPROVAL')}>
              <Send className="w-4 h-4 mr-2" /> Submit for Approval
            </Button>
          )}
          {canApprove && (
            <>
              <Button variant="outline" onClick={() => setRejectionDialogOpen(true)}>
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button onClick={() => setApprovalDialogOpen(true)}>
                <CheckCircle className="w-4 h-4 mr-2" /> Approve
              </Button>
            </>
          )}
        </div>
      </div>


      {/* Metadata Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="font-medium">{costSheet.company_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Vehicle</p>
                <p className="font-medium">{vehicle ? `${vehicle.brand_name} ${vehicle.model_name}` : 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tenure</p>
                <p className="font-medium">{costSheet.tenure_years} years ({costSheet.tenure_months} months)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created By</p>
                <p className="font-medium">{creator?.full_name || 'Unknown'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Section A - Vehicle Finance & Registration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm">A</span>
            Vehicle Finance & Registration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-1">
            <DetailRow label="Vehicle Cost" value={formatCurrency(costSheet.vehicle_cost)} />
            <DetailRow label="Down Payment %" value={`${costSheet.down_payment_percent.toFixed(1)}%`} />
            <DetailRow label="Down Payment Amount" value={formatCurrency(costSheet.down_payment_amount)} />
            <DetailRow label="Loan Amount" value={formatCurrency(costSheet.loan_amount)} />
            <DetailRow label="EMI Amount (Monthly)" value={formatCurrency(costSheet.emi_amount)} />
            <DetailRow label="Insurance Amount" value={formatCurrency(costSheet.insurance_amount)} />
            <DetailRow label="Registration Charges" value={formatCurrency(costSheet.registration_charges)} />
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
            <span className="font-medium">Subtotal A</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(costSheet.subtotal_a)}</span>
          </div>
        </CardContent>
      </Card>


      {/* Section B - Operational Costs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-sm">B</span>
            Operational Costs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Usage & Fuel */}
            <div>
              <h4 className="font-medium mb-3 text-muted-foreground">Usage & Fuel</h4>
              <div className="grid gap-3 md:grid-cols-1">
                <DetailRow label="Monthly KM" value={`${costSheet.monthly_km} km`} />
                <DetailRow label="Daily Hours" value={`${costSheet.daily_hours} hrs`} />
                <DetailRow label="Monthly Fuel Cost" value={formatCurrency(costSheet.fuel_cost)} />
              </div>
            </div>

            <Separator />

            {/* Driver Costs */}
            <div>
              <h4 className="font-medium mb-3 text-muted-foreground">Driver Costs</h4>
              <div className="grid gap-3 md:grid-cols-1">
                <DetailRow label="Drivers Count" value={costSheet.drivers_count.toString()} />
                <DetailRow label="Salary per Driver" value={formatCurrency(costSheet.driver_salary_per_driver)} />
                <DetailRow label="Total Driver Cost" value={formatCurrency(costSheet.total_driver_cost)} />
              </div>
            </div>

            <Separator />

            {/* Other Costs */}
            <div>
              <h4 className="font-medium mb-3 text-muted-foreground">Other Monthly Costs</h4>
              <div className="grid gap-3 md:grid-cols-1">
                <DetailRow label="Parking Charges" value={formatCurrency(costSheet.parking_charges)} />
                <DetailRow label="Maintenance Cost" value={formatCurrency(costSheet.maintenance_cost)} />
                <DetailRow label="Supervisor Cost" value={formatCurrency(costSheet.supervisor_cost)} />
                <DetailRow label="GPS & Camera Cost" value={formatCurrency(costSheet.gps_camera_cost)} />
                <DetailRow label="Permit Cost" value={formatCurrency(costSheet.permit_cost)} />
              </div>
            </div>
          </div>

          <Separator className="my-4" />
          <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
            <span className="font-medium">Subtotal B</span>
            <span className="text-xl font-bold text-secondary-foreground">{formatCurrency(costSheet.subtotal_b)}</span>
          </div>
        </CardContent>
      </Card>


      {/* Grand Total */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg">Summary & Admin Charges</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <DetailRow label="Subtotal A" value={formatCurrency(costSheet.subtotal_a)} />
              <DetailRow label="Subtotal B" value={formatCurrency(costSheet.subtotal_b)} />
              <Separator />
              <DetailRow 
                label={`Admin Charges (${costSheet.admin_charge_percent.toFixed(1)}%)`} 
                value={formatCurrency(costSheet.admin_charge_amount)} 
              />
            </div>
            <div className="flex flex-col justify-center items-center p-6 bg-primary rounded-lg text-primary-foreground">
              <span className="text-sm opacity-90">Grand Total (Monthly)</span>
              <span className="text-3xl font-bold">{formatCurrency(costSheet.grand_total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Approval Info */}
      {(costSheet.status === 'APPROVED' || costSheet.status === 'REJECTED') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Approval Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Status" value={config.label} />
            <DetailRow label="Approved By" value={approver?.full_name || 'Unknown'} />
            <DetailRow label="Date" value={costSheet.approved_at ? new Date(costSheet.approved_at).toLocaleString() : 'N/A'} />
            {costSheet.approval_remarks && (
              <div>
                <p className="text-sm text-muted-foreground">Remarks</p>
                <p className="mt-1 p-3 bg-muted rounded-lg">{costSheet.approval_remarks}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Cost Sheet</DialogTitle>
            <DialogDescription>Are you sure you want to approve this cost sheet?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Remarks (Optional)</Label>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => updateStatus('APPROVED')}>
              <CheckCircle className="w-4 h-4 mr-2" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Rejection Dialog */}
      <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Cost Sheet</DialogTitle>
            <DialogDescription>Provide a reason for rejection</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection Reason *</Label>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectionDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => updateStatus('REJECTED')}>
              <XCircle className="w-4 h-4 mr-2" /> Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}