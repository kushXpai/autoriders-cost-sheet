import jsPDF from 'jspdf';
import type { CostSheet, Vehicle } from '@/types';

// Clean currency formatter - using Rs. instead of ₹ for PDF compatibility
function cleanFormatCurrency(value: number): string {
  if (isNaN(value)) return 'Rs. 0.00';
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return 'Rs. ' + formatted;
}

export function generateCostSheetPDF(
  costSheet: CostSheet,
  vehicle: Vehicle | undefined,
  creatorName?: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2);

  // Professional Color Palette matching the theme
  const primaryBlue: [number, number, number] = [37, 99, 235]; // Blue-600
  const darkBlue: [number, number, number] = [30, 58, 138]; // Blue-900
  const lightBlue: [number, number, number] = [219, 234, 254]; // Blue-100
  const veryLightBlue: [number, number, number] = [239, 246, 255]; // Blue-50
  const slate: [number, number, number] = [71, 85, 105]; // Slate-600
  const lightGray: [number, number, number] = [248, 250, 252]; // Slate-50
  const borderGray: [number, number, number] = [226, 232, 240]; // Slate-200
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [15, 23, 42]; // Slate-900

  let yPos = margin;

  // ==================== HEADER ====================
  // Blue header background
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Company name
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('AUTORIDERS INTERNATIONAL LTD', pageWidth / 2, 10, { align: 'center' });

  // Document title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('COST PROPOSAL', pageWidth / 2, 20, { align: 'center' });

  // Underline
  doc.setDrawColor(...white);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - 28, 22, pageWidth / 2 + 28, 22);

  // Company name for whom prepared
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(costSheet.company_name, pageWidth / 2, 30, { align: 'center' });

  // Date and reference
  const date = new Date().toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 220);
  doc.text(date, pageWidth / 2, 37, { align: 'center' });
  const refNum = `Ref: ${costSheet.id.slice(0, 8).toUpperCase()}`;
  doc.text(refNum, pageWidth / 2, 41, { align: 'center' });

  yPos = 50;

  // ==================== INFO CARDS ====================
  const cardHeight = 16;
  const cardGap = 2;
  const cardWidth = (contentWidth - cardGap * 3) / 4;

  // Helper function to draw info card
  const drawInfoCard = (x: number, label: string, value: string) => {
    doc.setFillColor(...lightGray);
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, yPos, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setTextColor(...slate);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + 2, yPos + 4);

    doc.setTextColor(...black);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const lines = doc.splitTextToSize(value, cardWidth - 4);
    doc.text(lines, x + 2, yPos + 8);
  };

  // Draw info cards with correct data
  const vehicleText = vehicle 
    ? `${vehicle.brand_name} ${vehicle.model_name}` 
    : 'N/A';
  
  const createdByText = creatorName || 'N/A';

  drawInfoCard(margin, 'Company', costSheet.company_name);
  drawInfoCard(margin + cardWidth + cardGap, 'Vehicle', vehicleText);
  drawInfoCard(margin + (cardWidth + cardGap) * 2, 'Tenure', 
    `${costSheet.tenure_years} years (${costSheet.tenure_months} months)`);
  drawInfoCard(margin + (cardWidth + cardGap) * 3, 'Created By', createdByText);

  yPos += cardHeight + 8;

  // ==================== SECTION 1: VEHICLE COST & FINANCING ====================
  // Section header - more compact
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, yPos, contentWidth, 9, 1.5, 1.5, 'FD');

  doc.setTextColor(...black);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Vehicle Cost & Financing', margin + 3, yPos + 6);

  yPos += 11;

  // Table rows - more compact
  const section1Data = [
    ['Vehicle Cost', cleanFormatCurrency(costSheet.on_road_price)],
    ['Down Payment %', `${costSheet.down_payment_percent.toFixed(1)}%`],
    ['Down Payment Amount', cleanFormatCurrency(costSheet.down_payment_amount)],
    ['Loan Amount', cleanFormatCurrency(costSheet.loan_amount)],
  ];

  doc.setFontSize(8.5);
  section1Data.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
    }

    doc.setTextColor(...slate);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], margin + 3, yPos + 4.5);

    doc.setTextColor(...black);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], margin + contentWidth - 3, yPos + 4.5, { align: 'right' });

    yPos += 7;
  });

  yPos += 4;

  // ==================== SECTION A: VEHICLE FINANCE & REGISTRATION ====================
  // Section header with blue background - more compact
  doc.setFillColor(...lightBlue);
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, contentWidth, 10, 1.5, 1.5, 'FD');

  // "A" badge
  doc.setFillColor(...primaryBlue);
  doc.circle(margin + 6, yPos + 5, 3.5, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('A', margin + 6, yPos + 6.5, { align: 'center' });

  // Section title
  doc.setTextColor(...darkBlue);
  doc.setFontSize(10);
  doc.text('Vehicle Finance & Registration', margin + 13, yPos + 6.5);

  yPos += 12;

  // Section A data
  const sectionAData = [
    ['EMI Amount (Monthly)', cleanFormatCurrency(costSheet.emi_amount)],
    ['Insurance Amount (Monthly)', cleanFormatCurrency(costSheet.insurance_amount_monthly)],
    ['Registration Charges (Monthly)', cleanFormatCurrency(costSheet.registration_monthly)],
  ];

  doc.setFontSize(8.5);
  sectionAData.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(...veryLightBlue);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
    }

    doc.setTextColor(...slate);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], margin + 3, yPos + 4.5);

    doc.setTextColor(...darkBlue);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], margin + contentWidth - 3, yPos + 4.5, { align: 'right' });

    yPos += 7;
  });

  // Subtotal A
  doc.setFillColor(...primaryBlue);
  doc.rect(margin, yPos, contentWidth, 9, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal A', margin + 3, yPos + 6);
  doc.text(cleanFormatCurrency(costSheet.subtotal_a), margin + contentWidth - 3, yPos + 6, { align: 'right' });

  yPos += 12;

  // ==================== SECTION B: OPERATIONAL COSTS ====================
  // Section header with blue background
  doc.setFillColor(...lightBlue);
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, contentWidth, 10, 1.5, 1.5, 'FD');

  // "B" badge
  doc.setFillColor(...primaryBlue);
  doc.circle(margin + 6, yPos + 5, 3.5, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('B', margin + 6, yPos + 6.5, { align: 'center' });

  // Section title
  doc.setTextColor(...darkBlue);
  doc.setFontSize(10);
  doc.text('Operational Costs', margin + 13, yPos + 6.5);

  yPos += 12;

  // Usage & Fuel subsection - compact header
  doc.setFillColor(...veryLightBlue);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.setTextColor(...darkBlue);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Usage & Fuel', margin + 3, yPos + 4.5);
  yPos += 7;

  const usageFuelData = [
    ['Monthly KM', `${costSheet.monthly_km} km`],
    ['Daily Hours', `${costSheet.daily_hours} hrs`],
    ['Monthly Fuel Cost', cleanFormatCurrency(costSheet.fuel_cost)],
  ];

  doc.setFontSize(8.5);
  usageFuelData.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
    }

    doc.setTextColor(...slate);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], margin + 3, yPos + 4.5);

    doc.setTextColor(...darkBlue);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], margin + contentWidth - 3, yPos + 4.5, { align: 'right' });

    yPos += 7;
  });

  yPos += 1;

  // Driver Costs subsection
  doc.setFillColor(...veryLightBlue);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.setTextColor(...darkBlue);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Driver Costs', margin + 3, yPos + 4.5);
  yPos += 7;

  const driverData = [
    ['Drivers Count', costSheet.drivers_count.toString()],
    ['Salary per Driver', cleanFormatCurrency(costSheet.driver_salary_per_driver)],
    ['Total Driver Cost', cleanFormatCurrency(costSheet.total_driver_cost)],
  ];

  driverData.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
    }

    doc.setTextColor(...slate);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], margin + 3, yPos + 4.5);

    doc.setTextColor(...darkBlue);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], margin + contentWidth - 3, yPos + 4.5, { align: 'right' });

    yPos += 7;
  });

  yPos += 1;

  // Other Monthly Costs subsection
  doc.setFillColor(...veryLightBlue);
  doc.rect(margin, yPos, contentWidth, 7, 'F');
  doc.setTextColor(...darkBlue);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Other Monthly Costs', margin + 3, yPos + 4.5);
  yPos += 7;

  const otherCostsData = [
    ['Parking Charges', cleanFormatCurrency(costSheet.parking_charges)],
    ['Maintenance Cost', cleanFormatCurrency(costSheet.maintenance_cost)],
    ['Supervisor Cost', cleanFormatCurrency(costSheet.supervisor_cost)],
    ['GPS & Accessories Cost', cleanFormatCurrency(costSheet.gps_camera_cost)],
    ['Permit Cost', cleanFormatCurrency(costSheet.permit_cost)],
  ];

  otherCostsData.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
    }

    doc.setTextColor(...slate);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], margin + 3, yPos + 4.5);

    doc.setTextColor(...darkBlue);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], margin + contentWidth - 3, yPos + 4.5, { align: 'right' });

    yPos += 7;
  });

  // Subtotal B
  doc.setFillColor(...primaryBlue);
  doc.rect(margin, yPos, contentWidth, 9, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal B', margin + 3, yPos + 6);
  doc.text(cleanFormatCurrency(costSheet.subtotal_b), margin + contentWidth - 3, yPos + 6, { align: 'right' });

  yPos += 12;

  // Check if we need a new page
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  // ==================== SUMMARY & ADMIN CHARGES ====================
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, yPos, contentWidth, 9, 1.5, 1.5, 'FD');

  doc.setTextColor(...black);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary & Admin Charges', margin + 3, yPos + 6);

  yPos += 11;

  const summaryData = [
    ['Subtotal A', cleanFormatCurrency(costSheet.subtotal_a)],
    ['Subtotal B', cleanFormatCurrency(costSheet.subtotal_b)],
    [`Admin Charges (${costSheet.admin_charge_percent.toFixed(1)}%)`, cleanFormatCurrency(costSheet.admin_charge_amount)],
  ];

  doc.setFontSize(8.5);
  summaryData.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(...lightGray);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
    }

    doc.setTextColor(...slate);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], margin + 3, yPos + 4.5);

    doc.setTextColor(...black);
    doc.setFont('helvetica', 'bold');
    doc.text(row[1], margin + contentWidth - 3, yPos + 4.5, { align: 'right' });

    yPos += 7;
  });

  yPos += 4;

  // ==================== GRAND TOTAL ====================
  const totalBoxHeight = 20;

  // Grand total box
  doc.setFillColor(...primaryBlue);
  doc.roundedRect(margin, yPos, contentWidth, totalBoxHeight, 2, 2, 'F');

  doc.setTextColor(...white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Grand Total (Monthly)', margin + 4, yPos + 8);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(cleanFormatCurrency(costSheet.grand_total), margin + contentWidth - 4, yPos + 15, { align: 'right' });

  yPos += totalBoxHeight + 8;

  // ==================== APPROVAL DETAILS (if approved) ====================
  if (costSheet.status === 'APPROVED' && costSheet.approved_at) {
    // Check if we need a new page
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFillColor(...veryLightBlue);
    doc.setDrawColor(...borderGray);
    doc.roundedRect(margin, yPos, contentWidth, 9, 1.5, 1.5, 'FD');

    doc.setTextColor(...black);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Approval Details', margin + 3, yPos + 6);

    yPos += 11;

    const approvalData = [
      ['Status', 'Approved'],
      ['Date', new Date(costSheet.approved_at).toLocaleString('en-IN')],
    ];

    if (costSheet.approval_remarks) {
      approvalData.push(['Remarks', costSheet.approval_remarks]);
    }

    doc.setFontSize(8.5);
    approvalData.forEach((row, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(margin, yPos, contentWidth, 7, 'F');
      }

      doc.setTextColor(...slate);
      doc.setFont('helvetica', 'normal');
      doc.text(row[0], margin + 3, yPos + 4.5);

      doc.setTextColor(...black);
      doc.setFont('helvetica', 'bold');
      const maxWidth = contentWidth - 40;
      const lines = doc.splitTextToSize(row[1], maxWidth);
      doc.text(lines, margin + 35, yPos + 4.5);

      const rowHeight = Math.max(7, lines.length * 4.5);
      yPos += rowHeight;
    });
  }

  // ==================== FOOTER ====================
  const footerY = pageHeight - 12;

  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

  doc.setTextColor(...slate);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('This proposal is valid for 30 days from the date of issue.', pageWidth / 2, footerY, { align: 'center' });

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, footerY + 4, { align: 'center' });

  // ==================== SAVE PDF ====================
  const filename = `Cost_Proposal_${costSheet.company_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}