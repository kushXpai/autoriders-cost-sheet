import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CostSheet, Vehicle } from '@/types';
import { formatCurrency } from './calculations';

export function generateCostSheetPDF(
  costSheet: CostSheet,
  vehicle: Vehicle | undefined
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ============ MODERN COLOR PALETTE ============
  const primaryBlue: [number, number, number] = [37, 99, 235];
  const accentTeal: [number, number, number] = [20, 184, 166];
  const darkText: [number, number, number] = [15, 23, 42];
  const mediumGray: [number, number, number] = [71, 85, 105];
  const lightGray: [number, number, number] = [241, 245, 249];
  const successGreen: [number, number, number] = [34, 197, 94];
  const white: [number, number, number] = [255, 255, 255];
  const borderGray: [number, number, number] = [203, 213, 225];

  // ============ MODERN GRADIENT HEADER ============
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 55, 'F');
  
  doc.setFillColor(30, 80, 200, 0.3);
  doc.circle(pageWidth - 20, 10, 40, 'F');
  doc.circle(10, 45, 35, 'F');

  // Header content
  doc.setTextColor(...white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('VEHICLE COST SHEET', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const refNumber = `REF: CS-${costSheet.id.slice(0, 8).toUpperCase()}`;
  doc.text(refNumber, pageWidth / 2, 30, { align: 'center' });
  
  // Status badge
  const statusX = pageWidth / 2;
  const statusY = 38;
  doc.setFillColor(...successGreen);
  doc.roundedRect(statusX - 18, statusY, 36, 7, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(costSheet.status.toUpperCase(), statusX, statusY + 5, { align: 'center' });

  // ============ COMPANY & VEHICLE INFO CARD ============
  let yPos = 65;
  
  // Info card with border
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, pageWidth - 30, 45, 3, 3, 'FD');
  
  // Company name
  doc.setTextColor(...darkText);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(costSheet.company_name, 22, yPos + 10);
  
  // Divider line
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.3);
  doc.line(22, yPos + 14, pageWidth - 22, yPos + 14);
  
  // Vehicle info - properly spaced
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mediumGray);
  
  const vehicleName = vehicle
    ? `${vehicle.brand_name} ${vehicle.model_name} - ${vehicle.variant_name}`
    : 'Vehicle Not Specified';
  
  doc.text('Vehicle:', 22, yPos + 21);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkText);
  doc.text(vehicleName, 40, yPos + 21);
  
  // Second row of info
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mediumGray);
  doc.text('Fuel Type:', 22, yPos + 28);
  doc.setTextColor(...darkText);
  doc.text(vehicle?.fuel_type || 'N/A', 40, yPos + 28);
  
  doc.setTextColor(...mediumGray);
  doc.text('Tenure:', 90, yPos + 28);
  doc.setTextColor(...darkText);
  doc.text(`${costSheet.tenure_years} years (${costSheet.tenure_months} months)`, 105, yPos + 28);
  
  // Third row of info
  doc.setTextColor(...mediumGray);
  doc.text('Mileage:', 22, yPos + 35);
  doc.setTextColor(...darkText);
  doc.text(`${vehicle?.mileage_km_per_unit || 'N/A'} km/L`, 40, yPos + 35);
  
  doc.setTextColor(...mediumGray);
  doc.text('Date:', 90, yPos + 35);
  doc.setTextColor(...darkText);
  doc.text(new Date().toLocaleDateString('en-IN'), 105, yPos + 35);

  yPos += 55;

  // ============ SECTION A: FINANCE & REGISTRATION ============
  doc.setFillColor(...primaryBlue);
  doc.roundedRect(15, yPos, pageWidth - 30, 9, 2, 2, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('A. VEHICLE FINANCE & REGISTRATION', 20, yPos + 6.5);
  
  yPos += 13;

  autoTable(doc, {
    startY: yPos,
    head: [['Item', 'Details', 'Amount']],
    body: [
      ['Vehicle Cost', '', formatCurrency(costSheet.vehicle_cost)],
      ['Down Payment', `${costSheet.down_payment_percent.toFixed(1)}%`, formatCurrency(costSheet.down_payment_amount)],
      ['Loan Amount', '', formatCurrency(costSheet.loan_amount)],
      ['Monthly EMI', `${costSheet.tenure_months} months`, formatCurrency(costSheet.emi_amount)],
      ['Insurance (Monthly)', '', formatCurrency(costSheet.insurance_amount)],
      ['Registration Charges', 'One-time', formatCurrency(costSheet.registration_charges)],
    ],
    foot: [['', 'Subtotal A', formatCurrency(costSheet.subtotal_a)]],
    theme: 'striped',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: darkText,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
      lineColor: borderGray,
      lineWidth: 0.1,
    },
    footStyles: {
      fillColor: [37, 99, 235],
      textColor: white,
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
      textColor: darkText,
      lineColor: borderGray,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 70, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'left', textColor: mediumGray },
      2: { cellWidth: 65, halign: 'right', fontStyle: 'normal' },
    },
    margin: { left: 15, right: 15 },
  });

  // ============ PAGE BREAK BEFORE OPERATIONAL COSTS ============
  doc.addPage();
  yPos = 20;

  // ============ SECTION B: OPERATIONAL COSTS ============
  doc.setFillColor(...accentTeal);
  doc.roundedRect(15, yPos, pageWidth - 30, 9, 2, 2, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('B. OPERATIONAL COSTS', 20, yPos + 6.5);
  
  yPos += 13;

  // B.1 - Usage & Fuel
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 7, 1, 1, 'FD');
  doc.setTextColor(...darkText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('B.1  Usage & Fuel Costs', 20, yPos + 5);
  yPos += 11;

  autoTable(doc, {
    startY: yPos,
    body: [
      ['Monthly Distance', `${costSheet.monthly_km} km`, ''],
      ['Daily Operating Hours', `${costSheet.daily_hours} hours/day`, ''],
      ['Monthly Fuel Cost', `@ ${vehicle?.mileage_km_per_unit || 'N/A'} km/L`, formatCurrency(costSheet.fuel_cost)],
    ],
    theme: 'plain',
    bodyStyles: {
      fontSize: 9,
      cellPadding: { top: 5, right: 8, bottom: 5, left: 8 },
      textColor: darkText,
      lineColor: borderGray,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 70, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'left', textColor: mediumGray },
      2: { cellWidth: 65, halign: 'right', fontStyle: 'normal' },
    },
    margin: { left: 20, right: 15 },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // B.2 - Driver Costs
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 7, 1, 1, 'FD');
  doc.setTextColor(...darkText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('B.2  Driver & Personnel Costs', 20, yPos + 5);
  yPos += 11;

  autoTable(doc, {
    startY: yPos,
    body: [
      ['Number of Drivers', `${costSheet.drivers_count} driver(s)`, ''],
      ['Salary per Driver', 'Monthly', formatCurrency(costSheet.driver_salary_per_driver)],
      ['Total Driver Cost', '', formatCurrency(costSheet.total_driver_cost)],
    ],
    theme: 'plain',
    bodyStyles: {
      fontSize: 9,
      cellPadding: { top: 5, right: 8, bottom: 5, left: 8 },
      textColor: darkText,
      lineColor: borderGray,
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 70, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'left', textColor: mediumGray },
      2: { cellWidth: 65, halign: 'right', fontStyle: 'normal' },
    },
    margin: { left: 20, right: 15 },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // B.3 - Other Monthly Costs
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 7, 1, 1, 'FD');
  doc.setTextColor(...darkText);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('B.3  Other Monthly Expenses', 20, yPos + 5);
  yPos += 11;

  autoTable(doc, {
    startY: yPos,
    body: [
      ['Parking Charges', '', formatCurrency(costSheet.parking_charges)],
      ['Maintenance Cost', '', formatCurrency(costSheet.maintenance_cost)],
      ['Supervisor Cost', '', formatCurrency(costSheet.supervisor_cost)],
      ['GPS & Camera', '', formatCurrency(costSheet.gps_camera_cost)],
      ['Permit Cost', '', formatCurrency(costSheet.permit_cost)],
    ],
    foot: [['', 'Subtotal B', formatCurrency(costSheet.subtotal_b)]],
    theme: 'plain',
    bodyStyles: {
      fontSize: 9,
      cellPadding: { top: 5, right: 8, bottom: 5, left: 8 },
      textColor: darkText,
      lineColor: borderGray,
      lineWidth: 0.1,
    },
    footStyles: {
      fillColor: [20, 184, 166],
      textColor: white,
      fontSize: 10,
      fontStyle: 'bold',
      cellPadding: { top: 7, right: 8, bottom: 7, left: 8 },
    },
    columnStyles: {
      0: { cellWidth: 70, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'left', textColor: mediumGray },
      2: { cellWidth: 65, halign: 'right', fontStyle: 'normal' },
    },
    margin: { left: 20, right: 15 },
  });

  // ============ PAGE BREAK BEFORE SUMMARY ============
  doc.addPage();
  yPos = 20;

  // ============ FINAL SUMMARY ============
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 9, 2, 2, 'FD');
  doc.setTextColor(...darkText);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('C. COST SUMMARY', 20, yPos + 6.5);
  
  yPos += 13;

  autoTable(doc, {
    startY: yPos,
    body: [
      ['Vehicle Finance & Registration', formatCurrency(costSheet.subtotal_a)],
      ['Operational Costs', formatCurrency(costSheet.subtotal_b)],
      ['Admin Charges (' + costSheet.admin_charge_percent.toFixed(1) + '%)', formatCurrency(costSheet.admin_charge_amount)],
    ],
    theme: 'striped',
    bodyStyles: {
      fontSize: 10,
      cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
      textColor: darkText,
      lineColor: borderGray,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 115, halign: 'left', fontStyle: 'bold' },
      1: { cellWidth: 65, halign: 'right', fontStyle: 'normal' },
    },
    margin: { left: 15, right: 15 },
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  // ============ GRAND TOTAL - MODERN CARD ============
  const totalBoxHeight = 32;
  
  // Shadow effect
  doc.setFillColor(0, 0, 0, 0.08);
  doc.roundedRect(16.5, yPos + 1.5, pageWidth - 33, totalBoxHeight, 4, 4, 'F');
  
  // Main gradient box with border
  doc.setFillColor(37, 99, 235);
  doc.setDrawColor(30, 80, 200);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, pageWidth - 30, totalBoxHeight, 4, 4, 'FD');
  
  // Accent stripe
  doc.setFillColor(20, 184, 166);
  doc.roundedRect(15, yPos, 6, totalBoxHeight, 4, 4, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL MONTHLY COST', 27, yPos + 12);
  
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(costSheet.grand_total), pageWidth - 25, yPos + 21, { align: 'right' });

  // ============ FOOTER ============
  const footerY = pageHeight - 18;
  
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.5);
  doc.line(15, footerY - 6, pageWidth - 15, footerY - 6);
  
  doc.setTextColor(...mediumGray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('This is an official computer-generated document.', 15, footerY);
  doc.text('No signature required.', 15, footerY + 4);
  
  doc.setFont('helvetica', 'italic');
  doc.text(
    `Generated: ${new Date().toLocaleString('en-IN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}`,
    pageWidth - 15,
    footerY + 2,
    { align: 'right' }
  );

  // ============ SAVE PDF ============
  const filename = `CostSheet_${costSheet.company_name.replace(
    /[^a-zA-Z0-9]/g,
    '_'
  )}_${new Date().toISOString().split('T')[0]}.pdf`;

  doc.save(filename);
}