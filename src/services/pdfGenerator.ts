import jsPDF from 'jspdf';
import type { CostSheet, Vehicle } from '@/types';

// Clean currency formatter that avoids special characters
function cleanFormatCurrency(value: number): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  
  // Remove currency symbol and clean up
  return formatted.replace('₹', '').trim();
}

export function generateCostSheetPDF(
  costSheet: CostSheet,
  vehicle: Vehicle | undefined
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors - Professional palette
  const navy: [number, number, number] = [25, 42, 86];
  const blue: [number, number, number] = [41, 98, 255];
  const slate: [number, number, number] = [71, 85, 105];
  const light: [number, number, number] = [249, 250, 251];
  const white: [number, number, number] = [255, 255, 255];
  const green: [number, number, number] = [5, 150, 105];
  const border: [number, number, number] = [209, 213, 219];
  const gold: [number, number, number] = [217, 119, 6];

  let yPos = 20;

  // ============ HEADER ============
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageWidth, 65, 'F');

  // Company name (from)
  doc.setTextColor(...gold);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTORIDERS INTERNATIONAL LTD', pageWidth / 2, 15, { align: 'center' });

  // Title
  doc.setTextColor(...white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('COST PROPOSAL', pageWidth / 2, 28, { align: 'center' });

  // Decorative line
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 35, 32, pageWidth / 2 + 35, 32);

  // Prepared for
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Prepared for', pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(costSheet.company_name, pageWidth / 2, 48, { align: 'center' });

  const date = new Date().toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text(date, pageWidth / 2, 54, { align: 'center' });

  const refNum = `REF: ${costSheet.id.slice(0, 8).toUpperCase()}`;
  doc.text(refNum, pageWidth / 2, 60, { align: 'center' });

  yPos = 70;

  // ============ VEHICLE DETAILS ============
  doc.setFillColor(...light);
  doc.setDrawColor(...border);
  doc.setLineWidth(0.5);
  doc.roundedRect(20, yPos, pageWidth - 40, 38, 3, 3, 'FD');

  doc.setTextColor(...navy);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Vehicle Details', 25, yPos + 8);

  const vehicleInfo = vehicle
    ? `${vehicle.brand_name} ${vehicle.model_name} - ${vehicle.variant_name}`
    : 'Vehicle Not Specified';

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...slate);
  
  const infoY = yPos + 17;
  const col1X = 25;
  const col2X = 110;

  doc.text('Model:', col1X, infoY);
  doc.setTextColor(...navy);
  doc.text(vehicleInfo, col1X + 20, infoY);

  doc.setTextColor(...slate);
  doc.text('Fuel Type:', col1X, infoY + 7);
  doc.setTextColor(...navy);
  doc.text(vehicle?.fuel_type || 'N/A', col1X + 20, infoY + 7);

  doc.setTextColor(...slate);
  doc.text('Mileage:', col2X, infoY);
  doc.setTextColor(...navy);
  doc.text(`${vehicle?.mileage_km_per_unit || 'N/A'} km/L`, col2X + 20, infoY);

  doc.setTextColor(...slate);
  doc.text('Contract:', col2X, infoY + 7);
  doc.setTextColor(...navy);
  doc.text(`${costSheet.tenure_years} Years (${costSheet.tenure_months} Months)`, col2X + 20, infoY + 7);

  yPos += 43;

  // ============ SECTION 1: VEHICLE ACQUISITION ============
  doc.setFillColor(...blue);
  doc.roundedRect(20, yPos, pageWidth - 40, 8, 2, 2, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. VEHICLE ACQUISITION & FINANCING', 25, yPos + 5.5);

  yPos += 12;

  // Table header
  doc.setFillColor(...light);
  doc.setDrawColor(...border);
  doc.rect(20, yPos, pageWidth - 40, 8, 'FD');
  
  doc.setTextColor(...navy);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 25, yPos + 5.5);
  doc.text('Amount', pageWidth - 25, yPos + 5.5, { align: 'right' });

  yPos += 8;

  // Table rows
  const section1Data = [
    ['Vehicle Ex-Showroom Cost', cleanFormatCurrency(costSheet.vehicle_cost)],
    [`Down Payment (${costSheet.down_payment_percent.toFixed(1)}%)`, cleanFormatCurrency(costSheet.down_payment_amount)],
    ['Financed Amount', cleanFormatCurrency(costSheet.loan_amount)],
    [`Monthly EMI (${costSheet.tenure_months} months)`, cleanFormatCurrency(costSheet.emi_amount)],
    ['Insurance (per month)', cleanFormatCurrency(costSheet.insurance_amount)],
    ['Registration & Road Tax', cleanFormatCurrency(costSheet.registration_charges)],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  section1Data.forEach((row, index) => {
    const rowY = yPos + (index * 8);
    
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, rowY, pageWidth - 40, 8, 'F');
    }
    
    doc.setDrawColor(...border);
    doc.line(20, rowY, pageWidth - 20, rowY);
    
    doc.setTextColor(...navy);
    doc.text(row[0], 25, rowY + 5.5);
    doc.text(row[1], pageWidth - 25, rowY + 5.5, { align: 'right' });
  });

  yPos += section1Data.length * 8;

  // Section total
  doc.setFillColor(...blue);
  doc.rect(20, yPos, pageWidth - 40, 10, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Section Total', 25, yPos + 6.5);
  doc.text(cleanFormatCurrency(costSheet.subtotal_a), pageWidth - 25, yPos + 6.5, { align: 'right' });

  yPos += 15;

  // ============ SECTION 2: OPERATIONAL COSTS ============
  doc.setFillColor(...blue);
  doc.roundedRect(20, yPos, pageWidth - 40, 8, 2, 2, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('2. MONTHLY OPERATIONAL COSTS', 25, yPos + 5.5);

  yPos += 12;

  // Usage info
  doc.setFillColor(...light);
  doc.rect(20, yPos, pageWidth - 40, 16, 'F');
  
  doc.setTextColor(...slate);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Expected Monthly Distance', 25, yPos + 5);
  doc.text(`${costSheet.monthly_km.toLocaleString()} km`, pageWidth - 25, yPos + 5, { align: 'right' });
  
  doc.text('Daily Operating Hours', 25, yPos + 11);
  doc.text(`${costSheet.daily_hours} hours`, pageWidth - 25, yPos + 11, { align: 'right' });

  yPos += 20;

  // Operational costs table header
  doc.setFillColor(...light);
  doc.setDrawColor(...border);
  doc.rect(20, yPos, pageWidth - 40, 8, 'FD');
  
  doc.setTextColor(...navy);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 25, yPos + 5.5);
  doc.text('Amount', pageWidth - 25, yPos + 5.5, { align: 'right' });

  yPos += 8;

  // Build operational costs array
  const operationalData: Array<[string, string]> = [
    ['Fuel Cost', cleanFormatCurrency(costSheet.fuel_cost)],
    [`Driver Salaries (${costSheet.drivers_count} driver${costSheet.drivers_count > 1 ? 's' : ''})`, cleanFormatCurrency(costSheet.total_driver_cost)],
  ];

  if (costSheet.parking_charges > 0) {
    operationalData.push(['Parking Charges', cleanFormatCurrency(costSheet.parking_charges)]);
  }
  if (costSheet.maintenance_cost > 0) {
    operationalData.push(['Maintenance & Servicing', cleanFormatCurrency(costSheet.maintenance_cost)]);
  }
  if (costSheet.supervisor_cost > 0) {
    operationalData.push(['Supervisor/Management', cleanFormatCurrency(costSheet.supervisor_cost)]);
  }
  if (costSheet.gps_camera_cost > 0) {
    operationalData.push(['GPS & Telematics', cleanFormatCurrency(costSheet.gps_camera_cost)]);
  }
  if (costSheet.permit_cost > 0) {
    operationalData.push(['Permits & Documentation', cleanFormatCurrency(costSheet.permit_cost)]);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);

  operationalData.forEach((row, index) => {
    const rowY = yPos + (index * 8);
    
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, rowY, pageWidth - 40, 8, 'F');
    }
    
    doc.setDrawColor(...border);
    doc.line(20, rowY, pageWidth - 20, rowY);
    
    doc.setTextColor(...navy);
    doc.text(row[0], 25, rowY + 5.5);
    doc.text(row[1], pageWidth - 25, rowY + 5.5, { align: 'right' });
  });

  yPos += operationalData.length * 8;

  // Section total
  doc.setFillColor(...blue);
  doc.rect(20, yPos, pageWidth - 40, 10, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Section Total', 25, yPos + 6.5);
  doc.text(cleanFormatCurrency(costSheet.subtotal_b), pageWidth - 25, yPos + 6.5, { align: 'right' });

  // Check if we need a new page
  if (yPos > pageHeight - 100) {
    doc.addPage();
    yPos = 10;
  }

  // ============ SECTION 3: COST SUMMARY ============
  doc.setFillColor(...navy);
  doc.roundedRect(20, yPos, pageWidth - 40, 8, 2, 2, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('3. COST SUMMARY', 25, yPos + 5.5);

  yPos += 12;

  const summaryData = [
    ['Vehicle Acquisition & Financing', cleanFormatCurrency(costSheet.subtotal_a)],
    ['Monthly Operational Costs', cleanFormatCurrency(costSheet.subtotal_b)],
    [`Administrative Charges (${costSheet.admin_charge_percent.toFixed(1)}%)`, cleanFormatCurrency(costSheet.admin_charge_amount)],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  summaryData.forEach((row, index) => {
    const rowY = yPos + (index * 9);
    
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, rowY, pageWidth - 40, 9, 'F');
    }
    
    doc.setDrawColor(...border);
    doc.line(20, rowY, pageWidth - 20, rowY);
    
    doc.setTextColor(...navy);
    doc.text(row[0], 25, rowY + 6);
    doc.text(row[1], pageWidth - 25, rowY + 6, { align: 'right' });
  });

  yPos += summaryData.length * 9 + 15;

  // ============ GRAND TOTAL ============
  const boxHeight = 28;
  
  // Shadow
  doc.setFillColor(0, 0, 0, 0.1);
  doc.roundedRect(21, yPos + 1, pageWidth - 42, boxHeight, 3, 3, 'F');
  
  // Main box
  doc.setFillColor(...green);
  doc.roundedRect(20, yPos, pageWidth - 40, boxHeight, 3, 3, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL MONTHLY COST', 28, yPos + 10);
  
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanFormatCurrency(costSheet.grand_total), pageWidth - 28, yPos + 18, { align: 'right' });

  // ============ FOOTER ============
  const footerY = pageHeight - 20;
  
  doc.setDrawColor(...border);
  doc.setLineWidth(0.3);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
  
  doc.setTextColor(...slate);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('This proposal is valid for 30 days from the date of issue.', pageWidth / 2, footerY, { align: 'center' });
  
  doc.setFontSize(7);
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, footerY + 5, { align: 'center' });

  // ============ SAVE PDF ============
  const filename = `Cost_Proposal_${costSheet.company_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}