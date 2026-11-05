import React from "react";
import { Search, X, Filter, ArrowUpDown } from "lucide-react";

export interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  categories?: string[];
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  statusOptions?: { value: string; label: string }[];
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
  sortOptions?: { value: string; label: string }[];
  className?: string;
}

export function SearchAndFilter({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search records, test names, dates...",
  categories,
  selectedCategory = "all",
  onCategoryChange,
  statusOptions,
  selectedStatus = "all",
  onStatusChange,
  sortBy,
  onSortChange,
  sortOptions,
  className = "",
}: SearchAndFilterProps) {
  return (
    <div className={`hm-search-and-filter-bar ${className}`}>
      {/* Search Input */}
      <div className="hm-saf-search-wrapper">
        <Search size={16} className="hm-saf-search-icon" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="hm-saf-input"
          aria-label={searchPlaceholder}
        />
        {searchTerm && (
          <button
            type="button"
            className="hm-saf-clear-btn"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filters Group */}
      <div className="hm-saf-controls">
        {/* Category Dropdown */}
        {categories && categories.length > 0 && onCategoryChange && (
          <div className="hm-saf-select-wrapper">
            <Filter size={14} className="hm-saf-control-icon" />
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="hm-saf-select"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Dropdown */}
        {statusOptions && statusOptions.length > 0 && onStatusChange && (
          <div className="hm-saf-select-wrapper">
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="hm-saf-select"
              aria-label="Filter by status"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort Dropdown */}
        {sortOptions && sortOptions.length > 0 && onSortChange && (
          <div className="hm-saf-select-wrapper">
            <ArrowUpDown size={14} className="hm-saf-control-icon" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="hm-saf-select"
              aria-label="Sort by"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

