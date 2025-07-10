// src/features/location/components/SearchFilter.tsx
import React from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
} from "@/shared/ui";
import { Search, X, Filter } from "lucide-react";
import type { DateFilter } from "@/types/location";

interface SearchFilterProps {
  onSearchChange: (search: string) => void;
  onDateFilterChange: (filter: DateFilter) => void;
  searchValue: string;
  dateFilter: DateFilter;
}

const SearchFilter: React.FC<SearchFilterProps> = ({ onSearchChange, onDateFilterChange, searchValue, dateFilter }) => {
  const hasActiveFilters = searchValue || dateFilter !== "all";

  const clearFilters = () => {
    onSearchChange("");
    onDateFilterChange("all");
  };

  const dateFilterOptions = [
    { value: "all", label: "Todas las fechas" },
    { value: "today", label: "Hoy" },
    { value: "week", label: "Última semana" },
    { value: "month", label: "Último mes" },
  ];

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full bg-card border rounded-lg"
      defaultValue={hasActiveFilters ? "item-1" : undefined}
    >
      <AccordionItem value="item-1" className="border-b-0">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex items-center gap-2 font-semibold">
            <Filter className="w-4 h-4" />
            Buscar y Filtrar
            {hasActiveFilters && <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 space-y-4 border-t pt-4">
          {/* Campo de Búsqueda */}
          <div className="space-y-1.5">
            <Label htmlFor="search-input">Buscar por nota o dirección</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-input"
                type="text"
                placeholder="Ej: Plaza Mayor, nivel -2..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8"
              />
              {searchValue && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => onSearchChange("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filtro de Fecha */}
          <div className="space-y-1.5">
            <Label htmlFor="date-filter">Filtrar por fecha</Label>
            <Select value={dateFilter} onValueChange={(value: DateFilter) => onDateFilterChange(value)}>
              <SelectTrigger id="date-filter">
                <SelectValue placeholder="Seleccionar fecha..." />
              </SelectTrigger>
              <SelectContent>
                {dateFilterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resumen de Filtros Activos y Botón de Limpiar */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2">
              <div className="flex flex-wrap gap-2">
                {searchValue && <Badge variant="secondary">🔍 "{searchValue}"</Badge>}
                {dateFilter !== "all" && (
                  <Badge variant="secondary">
                    📅 {dateFilterOptions.find((opt) => opt.value === dateFilter)?.label}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-destructive hover:text-destructive"
              >
                <X className="mr-1 h-4 w-4" /> Limpiar filtros
              </Button>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default SearchFilter;
