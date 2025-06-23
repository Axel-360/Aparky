// src/components/ui/SearchFilter.tsx
import React, { useState, useEffect } from "react";
import type { DateFilter } from "../../types/location";

interface SearchFilterProps {
  onSearchChange: (search: string) => void;
  onDateFilterChange: (filter: DateFilter) => void;
  searchValue: string;
  dateFilter: DateFilter;
}

const SearchFilter: React.FC<SearchFilterProps> = ({ onSearchChange, onDateFilterChange, searchValue, dateFilter }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Expandir automáticamente si hay filtros activos
    if (searchValue || dateFilter !== "all") {
      setIsExpanded(true);
    }
  }, [searchValue, dateFilter]);

  const clearFilters = () => {
    onSearchChange("");
    onDateFilterChange("all");
  };

  const hasActiveFilters = searchValue || dateFilter !== "all";

  return (
    <div className="search-filter">
      <div className="filter-header">
        <button className="toggle-filters-btn" onClick={() => setIsExpanded(!isExpanded)}>
          🔍 Buscar y filtrar
          <span className={`arrow ${isExpanded ? "expanded" : ""}`}>▼</span>
          {hasActiveFilters && <span className="active-indicator">●</span>}
        </button>

        {hasActiveFilters && (
          <button className="clear-filters-btn" onClick={clearFilters}>
            ✕ Limpiar
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="filter-content">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Buscar por nota, dirección o coordenadas..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="search-input"
            />
            {searchValue && (
              <button className="clear-search-btn" onClick={() => onSearchChange("")}>
                ✕
              </button>
            )}
          </div>

          <div className="date-filter-container">
            <label htmlFor="date-filter">Filtrar por fecha:</label>
            <select
              id="date-filter"
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value as DateFilter)}
              className="date-filter-select"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
            </select>
          </div>

          <div className="filter-summary">
            {searchValue && <span className="filter-tag">🔍 "{searchValue}"</span>}
            {dateFilter !== "all" && (
              <span className="filter-tag">
                📅{" "}
                {dateFilter === "today"
                  ? "Hoy"
                  : dateFilter === "week"
                  ? "Última semana"
                  : dateFilter === "month"
                  ? "Último mes"
                  : ""}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
