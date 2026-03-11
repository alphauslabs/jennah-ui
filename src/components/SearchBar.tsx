import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import AddIcon from "@mui/icons-material/Add";
import { Search } from "lucide-react";
import { FilterPopover, type FilterOptions } from "@/components/FilterPopover";

interface SearchBarProps {
  onFilterChange?: (filters: FilterOptions) => void;
  availableProjects?: string[];
  activeFilterCount?: number;
}

export function SearchBar({
  onFilterChange,
  availableProjects = [],
  activeFilterCount = 0,
}: SearchBarProps) {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/$/, "") || "/";
  
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-16">
      <InputGroup className="flex flex-row h-12 rounded-full items-center border border-gray-200 bg-gray-50 hover:border-gray-300 transition-colors">
        <InputGroupInput
          placeholder="Search"
          className="text-sm bg-transparent"
        />
        <InputGroupAddon className="pr-4">
          <Search className="w-5 h-5 text-gray-500" />
        </InputGroupAddon>
      </InputGroup>

      <FilterPopover
        onFilterChange={onFilterChange || (() => {})}
        availableProjects={availableProjects}
      />
      <Button
        asChild
        size="sm"
        className="h-12 rounded-full px-6 bg-black hover:bg-gray-900 text-white font-normal text-sm"
      >
        <Link
          to={pathname === "/projects" ? "/projects/create" : "/jobs/create"}
          reloadDocument
        >
          <AddIcon className="w-4 h-4" />
          New {pathname === "/projects" ? "Project" : "Job"}
        </Link>
      </Button>
    </div>
  );
}
