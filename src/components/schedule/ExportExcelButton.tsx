import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getDaysInMonth } from 'date-fns';
import { Person, Shift, ShiftStatus } from '@/types/schedule';

interface ExportExcelProps {
  year: number;
  month: number;
  people: Person[];
  shifts: Shift[];
  statuses: ShiftStatus[];
}

export function ExportExcelButton({ year, month, people, shifts, statuses }: ExportExcelProps) {
  
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Docházka ${month + 1}-${year}`);

    const daysCount = getDaysInMonth(new Date(year, month));
    const daysArray = Array.from({ length: daysCount }, (_, i) => i + 1);

    // 1. Definice sloupců
    const columns = [
      { header: 'Jméno', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Celkem hod. (čisté)', key: 'totalHours', width: 18 },
      ...daysArray.map(d => ({
        header: `${d}.`,
        key: `day_${d}`,
        width: 7
      }))
    ];

    worksheet.columns = columns;

    // Stylování hlavičky
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // 2. Naplnění daty
    people.forEach(person => {
      const rowData: any = {
        name: person.name,
        email: person.email || '-',
      };

      let personTotalMinutes = 0;

      // Projdeme každý den v měsíci
      daysArray.forEach(day => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const shift = shifts.find(s => s.personId === person.id && s.date === dateStr && !s.isPrediction);

        if (shift) {
          const startMins = shift.startMinute ?? (shift.startHour ? shift.startHour * 60 : 0);
          const endMins = shift.endMinute ?? (shift.endHour ? shift.endHour * 60 : 0);
          
          const diff = endMins - startMins;
          if (diff > 0) {
            // ODEČTENÍ 30 MINUT PAUZY
            const netDiff = Math.max(0, diff - 30);
            const hours = Math.round((netDiff / 60) * 100) / 100;
            
            rowData[`day_${day}`] = hours; 
            personTotalMinutes += netDiff; 
          } else {
            rowData[`day_${day}`] = 0;
          }
        } else {
          rowData[`day_${day}`] = null; // Prázdná buňka pokud není směna
        }
      });

      // Celkový součet za měsíc (v čistých hodinách)
      rowData.totalHours = Math.round((personTotalMinutes / 60) * 100) / 100;
      worksheet.addRow(rowData);
    });

    // 3. Formátování mřížky a čísel
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Jméno a email vlevo, zbytek na střed
        if (colNumber <= 2) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }

        // Formátování čísel na 1 desetinné místo (pro hodiny)
        if (typeof cell.value === 'number' && colNumber > 2) {
          cell.numFmt = '0.0';
        }
      });
    });

    // 4. Generování a stažení souboru
    const buffer = await workbook.xlsx.writeBuffer();
    const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `Vykaz_Hodin_Cisty_${year}_${month + 1}.xlsx`);
  };

  return (
    <Button 
      onClick={exportToExcel} 
      variant="outline" 
      size="sm"
      className="flex items-center gap-2 h-8 text-xs border-green-600/50 hover:bg-green-50 hover:text-green-700 font-medium"
    >
      <FileSpreadsheet className="h-4 w-4" />
      Excel (Čisté hodiny)
    </Button>
  );
}
