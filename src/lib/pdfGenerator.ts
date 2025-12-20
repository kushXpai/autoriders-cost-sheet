import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CostSheet, Vehicle } from '@/types';
import { formatCurrency } from './calculations';

export function generateCostSheetPDF(
  costSheet: CostSheet,
  vehicle: Vehicle | undefined
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
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('COST SHEET', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Reference: CS-${costSheet.id.slice(0, 8).toUpperCase()}`, 14, 30);

  // Company Info Section
  let yPos = 50;
  
  doc.setTextColor(...darkColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(costSheet.company_name, 14, yPos);
  
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayColor);
  
  const vehicleName = vehicle 
    ? `${vehicle.brand_name} ${vehicle.model_name} - ${vehicle.variant_name} (${vehicle.fuel_type})`
    : 'N/A';
  doc.text(`Vehicle: ${vehicleName}`, 14, yPos);
  
  yPos += 7;
  doc.text(`Tenure: ${costSheet.tenure_years} years (${costSheet.tenure_months} months)`, 14, yPos);
  
  yPos += 7;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, yPos);

  yPos += 15;

  // Section A - Vehicle Finance & Registration
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('A. Vehicle Finance & Registration', 14, yPos);
  
  yPos += 5;
  
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount (₹)']],
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
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 50, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // Section B - Operational Costs
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('B. Operational Costs', 14, yPos);
  
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Details', 'Amount (₹)']],
    body: [
      ['Daily Usage', `${costSheet.daily_km} km, ${costSheet.daily_hours} hrs/day`, '-'],
      ['Monthly Fuel Cost', `${costSheet.daily_km * 30} km/month`, formatCurrency(costSheet.fuel_cost)],
      ['Driver Cost', `${costSheet.drivers_count} driver(s)`, formatCurrency(costSheet.total_driver_cost)],
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
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 60 },
      2: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // Check if we need a new page
  if (yPos > 210) {
    doc.addPage();
    yPos = 20;
  }

  // Summary Section with Admin Charges (not in detail)
  doc.setTextColor(...primaryColor);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('C. Summary', 14, yPos);
  
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    body: [
      ['Subtotal A (Vehicle Finance & Registration)', formatCurrency(costSheet.subtotal_a)],
      ['Subtotal B (Operational Costs)', formatCurrency(costSheet.subtotal_b)],
      ['Admin Charges', formatCurrency(costSheet.admin_charge_amount)],
    ],
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 6,
    },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // Grand Total Box
  doc.setFillColor(...primaryColor);
  doc.roundedRect(14, yPos, pageWidth - 28, 28, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('GRAND TOTAL (Monthly)', 22, yPos + 12);
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(costSheet.grand_total), pageWidth - 22, yPos + 18, { align: 'right' });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);
  
  doc.setTextColor(...grayColor);
  doc.setFontSize(8);
  doc.text('This is a computer-generated quotation.', 14, footerY);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth - 14, footerY, { align: 'right' });

  // Save the PDF
  const filename = `CostSheet_${costSheet.company_name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}
