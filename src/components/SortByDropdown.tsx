import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "status";

interface SortByDropdownProps {
  value: SortOption;
  onSortChange: (value: SortOption) => void;
}

export function SortByDropdown({ value, onSortChange }: SortByDropdownProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-600">Sort by:</label>
      <Select value={value} onValueChange={(val) => onSortChange(val as SortOption)}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
          <SelectItem value="name-asc">Name (A-Z)</SelectItem>
          <SelectItem value="name-desc">Name (Z-A)</SelectItem>
          <SelectItem value="status">Status</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
