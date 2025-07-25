
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ListFilter } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

type UnitFilterControlsProps = {
  filter: string;
  setFilter: (filter: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: (dateRange: DateRange | undefined) => void;
};

export default function UnitFilterControls({
  filter,
  setFilter,
  dateRange,
  setDateRange,
}: UnitFilterControlsProps) {

  const handleFilterChange = (value: string) => {
    setFilter(value);
    if (value !== 'range') {
      setDateRange(undefined);
    }
  };
  
  const handleDateRangeChange = (range: DateRange | undefined) => {
      setDateRange(range);
      if (range?.from) {
          setFilter('range');
      } else {
          setFilter('all');
      }
  }

  const filterLabels: { [key: string]: string } = {
    all: 'Mostrar todas',
    overdue: 'Atrasadas',
    today: 'Vencen hoy',
    week: 'Vencen esta semana',
    month: 'Vencen este mes',
    range: 'Rango personalizado',
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            <ListFilter className="mr-2 h-4 w-4" />
            <span>{filterLabels[filter]}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={filter} onValueChange={handleFilterChange}>
            <DropdownMenuRadioItem value="all">Mostrar todas</DropdownMenuRadioItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioItem value="overdue">Atrasadas</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="today">Vencen hoy</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="week">Vencen esta semana</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="month">Vencen este mes</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <DateRangePicker date={dateRange} onDateChange={handleDateRangeChange} />

    </div>
  );
}
