import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CostSheet, Vehicle, User } from '@/types';
import { formatCurrency } from './calculations';

export function generateCostSheetPDF(
  costSheet: CostSheet,
  vehicle: Vehicle | undefined,
  creator: User | undefined,
  approver: User | undefined
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Blue
  const darkColor: [number, number, number] = [30, 41, 59];
  const grayColor: [number, number, number] = [100, 116, 139];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('COST SHEET', 14, 18);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Reference: CS-${costSheet.id.slice(0, 8).toUpperCase()}`, 14, 28);
  
  // Status badge
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(pageWidth - 45, 12, 35, 10, 2, 2, 'F');
  doc.setFontSize(9);
  doc.text('APPROVED', pageWidth - 40, 19);

  // Company Info Section
  let yPos = 45;
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(costSheet.company_name, 14, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  
  const vehicleName = vehicle 
    ? `${vehicle.brand_name} ${vehicle.model_name} - ${vehicle.variant_name} (${vehicle.fuel_type})`
    : 'N/A';
  doc.text(`Vehicle: ${vehicleName}`, 14, yPos);
  
  yPos += 6;
  doc.text(`Tenure: ${costSheet.tenure_years} years (${costSheet.tenure_months} months)`, 14, yPos);
  
  // Metadata on right side
  doc.text(`Created: ${new Date(costSheet.created_at).toLocaleDateString()}`, pageWidth - 60, 50);
  doc.text(`Created By: ${creator?.full_name || 'Unknown'}`, pageWidth - 60, 56);
  if (costSheet.approved_at) {
    doc.text(`Approved: ${new Date(costSheet.approved_at).toLocaleDateString()}`, pageWidth - 60, 62);
    doc.text(`Approved By: ${approver?.full_name || 'Unknown'}`, pageWidth - 60, 68);
  }

  yPos += 15;

  // Section A - Vehicle Finance & Registration
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('A. Vehicle Finance & Registration', 14, yPos);
  
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: [
      ['Vehicle Cost', formatCurrency(costSheet.vehicle_cost)],
      ['EMI Amount (Monthly)', formatCurrency(costSheet.emi_amount)],
      ['Insurance Amount', formatCurrency(costSheet.insurance_amount)],
      ['Registration Charges', formatCurrency(costSheet.registration_charges)],
    ],
    foot: [['Subtotal A', formatCurrency(costSheet.subtotal_a)]],
    theme: 'striped',
    headStyles: { 
      fillColor: primaryColor,
      fontSize: 10,
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: primaryColor,
      fontSize: 10,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Section B - Operational Costs
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('B. Operational Costs', 14, yPos);
  
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Details', 'Amount']],
    body: [
      ['Daily Usage', `${costSheet.daily_km} km, ${costSheet.daily_hours} hrs/day`, '-'],
      ['Monthly Fuel Cost', `${costSheet.daily_km * 30} km/month`, formatCurrency(costSheet.fuel_cost)],
      ['Driver Cost', `${costSheet.drivers_count} driver(s) @ ${formatCurrency(costSheet.driver_salary_per_driver)}`, formatCurrency(costSheet.total_driver_cost)],
      ['Parking Charges', '-', formatCurrency(costSheet.parking_charges)],
      ['Maintenance Cost', '-', formatCurrency(costSheet.maintenance_cost)],
      ['Supervisor Cost', '-', formatCurrency(costSheet.supervisor_cost)],
      ['GPS & Camera Cost', '-', formatCurrency(costSheet.gps_camera_cost)],
      ['Permit Cost', '-', formatCurrency(costSheet.permit_cost)],
    ],
    foot: [['Subtotal B', '', formatCurrency(costSheet.subtotal_b)]],
    theme: 'striped',
    headStyles: { 
      fillColor: primaryColor,
      fontSize: 10,
      fontStyle: 'bold'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: primaryColor,
      fontSize: 10,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 60 },
      2: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Check if we need a new page
  if (yPos > 230) {
    doc.addPage();
    yPos = 20;
  }

  // Summary Section
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, yPos);
  
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    body: [
      ['Subtotal A (Vehicle Finance & Registration)', formatCurrency(costSheet.subtotal_a)],
      ['Subtotal B (Operational Costs)', formatCurrency(costSheet.subtotal_b)],
      [`Admin Charges (${costSheet.admin_charge_percent}%)`, formatCurrency(costSheet.admin_charge_amount)],
    ],
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2;

  // Grand Total Box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(14, yPos, pageWidth - 28, 25, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('GRAND TOTAL (Monthly)', 20, yPos + 10);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(costSheet.grand_total), pageWidth - 20, yPos + 16, { align: 'right' });

  yPos += 35;

  // Approval Remarks if any
  if (costSheet.approval_remarks) {
    doc.setTextColor(...grayColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Approval Remarks:', 14, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.text(costSheet.approval_remarks, 14, yPos + 6, { maxWidth: pageWidth - 28 });
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);
  
  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  doc.text('This is a system-generated document.', 14, footerY);
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth - 14, footerY, { align: 'right' });

  // Save the PDF
  const filename = `CostSheet_${costSheet.company_name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
