
import { Building2, Menu, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="bg-white border-b border-stone-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="terra-gradient p-2 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-stone-900">TerraBuild</h1>
                <p className="text-xs text-stone-600">Construction Management</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-orange-600 font-medium border-b-2 border-orange-600 pb-1">
              Dashboard
            </a>
            <a href="#" className="text-stone-600 hover:text-orange-600 transition-colors">
              Projects
            </a>
            <a href="#" className="text-stone-600 hover:text-orange-600 transition-colors">
              Teams
            </a>
            <a href="#" className="text-stone-600 hover:text-orange-600 transition-colors">
              Reports
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-stone-600 hover:text-orange-600">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-stone-600 hover:text-orange-600">
              <User className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
